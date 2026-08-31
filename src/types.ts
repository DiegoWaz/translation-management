export interface LangFile {
  lang: string
  label: string
  flag: string
  path: string
}

/** Tracks a single source file so changes can be routed back to it. */
export interface FileSource {
  path: string
  rawContent: Record<string, unknown>
  originalFlat: Record<string, string>
  sha: string
  nested: boolean
}

export interface Country {
  code: string
  name: string
  flag?: string
}

export interface GitHubConfig {
  token: string
  owner: string
  repo: string
  branch: string
  baseLang: string
  files: LangFile[]
  configPathTemplate: string
  configSchemaPath: string
  translationsFolderName?: string
  alwaysNestJson?: boolean
}

export type WorkspaceMode = 'translations' | 'configs' | 'schema'
export type ConfigValueType = 'text' | 'number' | 'json'
export type ConfigValue =
  | string
  | number
  | boolean
  | null
  | ConfigValue[]
  | { [key: string]: ConfigValue }
export type ConfigSchema = Record<string, ConfigValueType>
export type ConfigMap = Record<string, ConfigValue>

export type FilterMode = 'all' | 'missing' | 'modified' | 'var-issues'
export type SearchMode = 'locale' | 'key'
export type ToastType = 'success' | 'error' | 'info'

export interface Toast {
  id: number
  message: string
  type: ToastType
}

export interface KeyChange {
  before: string
  after: string
  type: 'added' | 'modified' | 'deleted'
}

export interface CommitRecord {
  sha: string
  message: string
  author: string
  date: Date
  changedKeys: Record<string, KeyChange>
}

export type KeyLastModifiedMap = Record<string, { author: string; date: Date; sha: string }>

export interface ParsedImport {
  localeCode: string
  paragraphs: string[]
}

export type ImportFormat = 'text' | 'table' | 'json'
export type ExportFormat = 'json' | 'json-ns' | 'csv' | 'tsv'

export interface JsonImportResult {
  type: 'multi'
  data: Record<string, Record<string, string>>
}

export interface LangStat extends LangFile {
  total: number
  filled: number
  modified: number
}

export interface KeyGroup {
  name: string
  count: number
}
