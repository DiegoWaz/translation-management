import type { FilterMode, GitHubConfig, KeyLastModifiedMap, LangFile, SearchMode } from '../types'
import { cn } from '../helpers/cn'
import { ui } from '../i18n/ui'
import { ColHeader } from './ColHeader'
import { EmptyState } from './EmptyState'
import { KeyModeRow } from './KeyModeRow'
import { TranslationRow } from './TranslationRow'

export const TranslationTable = ({
  searchMode,
  isMobile,
  colTemplate,
  showBase,
  showLastMod,
  config,
  activeLang,
  activeLangFile,
  filteredKeys,
  filter,
  search,
  translations,
  original,
  activeLangKeyMap,
  searchMatchMap,
  varValidation,
  varIssuesMap,
  onUpdate,
  onDelete,
  onRename,
  onShowKeyHistory,
}: {
  searchMode: SearchMode
  isMobile: boolean
  colTemplate: string
  showBase: boolean
  showLastMod: boolean
  config: GitHubConfig
  activeLang: string
  activeLangFile?: LangFile
  filteredKeys: string[]
  filter: FilterMode
  search: string
  translations: Record<string, Record<string, string>>
  original: Record<string, Record<string, string>>
  activeLangKeyMap: KeyLastModifiedMap
  searchMatchMap: Record<string, string[]>
  varValidation: boolean
  varIssuesMap: Record<string, string[]>
  onUpdate: (lang: string, key: string, value: string) => void
  onDelete: (key: string) => void
  onRename?: (oldKey: string, newKey: string) => boolean
  onShowKeyHistory?: (key: string) => void
}) => {
  const baseFile = config.files.find(f => f.lang === config.baseLang)
  const pad = isMobile ? 'px-3' : 'px-5'

  return (
    <>
      {searchMode === 'key' ? (
        <div
          className={cn('grid border-b border-border bg-row-even', pad)}
          style={{ gridTemplateColumns: isMobile ? '1fr 24px' : '200px 1fr 24px' }}
        >
          <ColHeader label={ui.table.key} />
          {!isMobile && <ColHeader label={ui.table.allLanguages} accent />}
          <div />
        </div>
      ) : (
        <div className={cn('grid border-b border-border bg-row-even', pad)} style={{ gridTemplateColumns: colTemplate }}>
          <ColHeader label={ui.table.key} />
          {showBase && <ColHeader label={`${baseFile?.flag ?? ''} ${baseFile?.label ?? ui.common.base}`} />}
          <ColHeader label={`${activeLangFile?.flag ?? ''} ${activeLangFile?.label ?? activeLang}`} accent />
          {showLastMod && <ColHeader label={ui.table.lastModified} />}
          <div />
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {filteredKeys.length === 0 ? (
          <EmptyState filter={filter} search={search} />
        ) : (
          filteredKeys.map((key, i) =>
            searchMode === 'key' ? (
              <KeyModeRow
                key={key}
                rowKey={key}
                translations={translations}
                original={original}
                configFiles={config.files}
                baseLang={config.baseLang}
                isEven={i % 2 === 0}
                isMobile={isMobile}
                onUpdate={onUpdate}
                onDelete={() => onDelete(key)}
                onRename={onRename}
                onShowKeyHistory={onShowKeyHistory}
                searchQuery={search}
              />
            ) : (
              <TranslationRow
                key={key}
                rowKey={key}
                baseValue={translations[config.baseLang]?.[key] ?? ''}
                targetValue={translations[activeLang]?.[key] ?? ''}
                originalValue={original[activeLang]?.[key] ?? ''}
                lastModified={activeLangKeyMap[key]}
                isEven={i % 2 === 0}
                colTemplate={colTemplate}
                showBase={showBase}
                showLastMod={showLastMod}
                isMobile={isMobile}
                onChange={val => onUpdate(activeLang, key, val)}
                onDelete={() => onDelete(key)}
                onRename={onRename}
                onShowKeyHistory={onShowKeyHistory}
                searchQuery={search}
                matchedLangs={searchMatchMap[key] ?? []}
                configFiles={config.files}
                activeLang={activeLang}
                missingVarsList={varValidation ? (varIssuesMap[key] ?? []) : []}
              />
            ),
          )
        )}
      </div>
    </>
  )
}
