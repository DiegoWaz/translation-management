export interface LangFile {
  lang: string
  label: string
  flag: string
  path: string
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
}

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
export type ExportFormat = 'json' | 'tsv'

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
