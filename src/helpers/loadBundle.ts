import type { ConfigMap, ConfigSchema, FileSource, GitHubConfig, LangFile } from '../types'
import { loadFile, loadJsonFile } from './github'
import { defaultPath } from './lang'
import { normalizeConfigMap, normalizeSchema } from './configValues'

/** Load translation JSON files in parallel (all langs or a subset). */
export const loadTranslationBundle = async (
  loadConfig: GitHubConfig,
  filePaths: Record<string, string[]>,
  langs?: string[],
): Promise<{
  translations: Record<string, Record<string, string>>
  shas: Record<string, string>
  fileSources: Record<string, FileSource[]>
}> => {
  const langFilter = langs ? new Set(langs) : null
  const entries = Object.entries(filePaths).filter(([lang, paths]) =>
    paths.length > 0 && (!langFilter || langFilter.has(lang)),
  )

  const loaded = await Promise.all(entries.map(async ([lang, paths]) => {
    const fileResults = await Promise.all(
      paths.map(async path => {
        const result = await loadFile(loadConfig, path)
        return { path, ...result }
      }),
    )
    const sources: FileSource[] = fileResults.map(({ path, content, sha, nested, rawContent }) => ({
      path,
      rawContent,
      originalFlat: { ...content },
      sha,
      nested,
    }))
    const merged = Object.assign({}, ...sources.map(s => s.originalFlat))
    return { lang, sources, merged, sha: sources[0]?.sha ?? '' }
  }))

  const translations: Record<string, Record<string, string>> = {}
  const shas: Record<string, string> = {}
  const fileSources: Record<string, FileSource[]> = {}
  for (const row of loaded) {
    translations[row.lang] = row.merged
    shas[row.lang] = row.sha
    fileSources[row.lang] = row.sources
  }
  return { translations, shas, fileSources }
}

/** Load config schema + per-locale config files in parallel. */
export const loadConfigBundle = async (
  loadConfig: GitHubConfig,
  files: LangFile[],
): Promise<{
  schema: ConfigSchema
  schemaSha: string
  configs: Record<string, ConfigMap>
  configShas: Record<string, string>
}> => {
  const schemaResult = await loadJsonFile<unknown>(loadConfig, loadConfig.configSchemaPath, {})
  const schema = normalizeSchema(schemaResult.content)

  const rows = await Promise.all(files.map(async f => {
    const cfgPath = defaultPath(f.lang, loadConfig.configPathTemplate)
    const { content, sha } = await loadJsonFile<unknown>(loadConfig, cfgPath, {})
    return { lang: f.lang, content: normalizeConfigMap(content, schema), sha }
  }))

  const configs: Record<string, ConfigMap> = {}
  const configShas: Record<string, string> = {}
  for (const row of rows) {
    configs[row.lang] = row.content
    configShas[row.lang] = row.sha
  }

  return { schema, schemaSha: schemaResult.sha, configs, configShas }
}
