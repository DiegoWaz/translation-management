import type { FilterMode, GitHubConfig, KeyLastModifiedMap, LangFile, SearchMode, TranslationColumnWidths } from '../types'
import { cn } from '../helpers/cn'
import { ui } from '../i18n/ui'
import { ColHeader } from './ColHeader'
import { EmptyState } from './EmptyState'
import { KeyModeRow } from './KeyModeRow'
import { TranslationRow } from './TranslationRow'
import { TRANSLATION_ROW_HEIGHT, VirtualList } from './VirtualList'

export const TranslationTable = ({
  searchMode,
  isMobile,
  colTemplate,
  keyModeColTemplate,
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
  onResizeColumn,
  onResetColumn,
  onUpdate,
  onDelete,
  onRename,
  onShowKeyHistory,
}: {
  searchMode: SearchMode
  isMobile: boolean
  colTemplate: string
  keyModeColTemplate: string
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
  onResizeColumn?: (col: keyof TranslationColumnWidths, deltaX: number) => void
  onResetColumn?: (col: keyof TranslationColumnWidths) => void
  onUpdate: (lang: string, key: string, value: string) => void
  onDelete: (key: string) => void
  onRename?: (oldKey: string, newKey: string) => boolean
  onShowKeyHistory?: (key: string) => void
}) => {
  const baseFile = config.files.find(f => f.lang === config.baseLang)
  const pad = isMobile ? 'px-3' : 'px-5'
  const useVirtual = searchMode !== 'key' && filteredKeys.length > 40
  const canResize = Boolean(onResizeColumn) && !isMobile

  const renderLocaleRow = (key: string, i: number) => (
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
  )

  return (
    <>
      {searchMode === 'key' ? (
        <div
          className={cn('grid border-b border-border bg-row-even', pad)}
          style={{ gridTemplateColumns: keyModeColTemplate }}
        >
          <ColHeader
            label={ui.table.key}
            resizable={canResize}
            onResize={delta => onResizeColumn?.('key', delta)}
            onResetWidth={() => onResetColumn?.('key')}
          />
          {!isMobile && <ColHeader label={ui.table.allLanguages} accent />}
          <div />
        </div>
      ) : (
        <div className={cn('grid border-b border-border bg-row-even min-w-0', pad)} style={{ gridTemplateColumns: colTemplate }}>
          <ColHeader
            label={ui.table.key}
            resizable={canResize}
            onResize={delta => onResizeColumn?.('key', delta)}
            onResetWidth={() => onResetColumn?.('key')}
          />
          {showBase && (
            <ColHeader
              label={`${baseFile?.flag ?? ''} ${baseFile?.label ?? ui.common.base}`}
              resizable={canResize}
              onResize={delta => onResizeColumn?.('base', delta)}
              onResetWidth={() => onResetColumn?.('base')}
            />
          )}
          <ColHeader
            label={`${activeLangFile?.flag ?? ''} ${activeLangFile?.label ?? activeLang}`}
            accent
            resizable={canResize}
            onResize={delta => onResizeColumn?.('target', delta)}
            onResetWidth={() => onResetColumn?.('target')}
          />
          {showLastMod && (
            <ColHeader
              label={ui.table.lastModified}
              resizable={canResize}
              onResize={delta => onResizeColumn?.('lastMod', delta)}
              onResetWidth={() => onResetColumn?.('lastMod')}
            />
          )}
          <div />
        </div>
      )}

      {filteredKeys.length === 0 ? (
        <div className="flex-1 overflow-y-auto">
          <EmptyState filter={filter} search={search} />
        </div>
      ) : searchMode === 'key' ? (
        <div className="flex-1 overflow-y-auto">
          {filteredKeys.map((key, i) => (
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
          ))}
        </div>
      ) : useVirtual ? (
        <div className="flex-1 overflow-x-auto min-h-0 flex flex-col">
          <VirtualList
            itemCount={filteredKeys.length}
            itemHeight={TRANSLATION_ROW_HEIGHT}
            getItemKey={index => filteredKeys[index]}
            renderItem={index => renderLocaleRow(filteredKeys[index], index)}
          />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto overflow-x-auto">
          {filteredKeys.map((key, i) => renderLocaleRow(key, i))}
        </div>
      )}
    </>
  )
}
