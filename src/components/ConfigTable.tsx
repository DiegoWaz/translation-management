import type { ConfigMap, ConfigSchema, ConfigValue, GitHubConfig, SearchMode } from '../types'
import { cn } from '../helpers/cn'
import { t, ui } from '../i18n/ui'
import { ConfigRow } from './ConfigRow'
import { ConfigKeyModeRow } from './ConfigKeyModeRow'

export const ConfigTable = ({
  searchMode,
  isMobile,
  colTemplate,
  showBase,
  config,
  activeLang,
  filteredKeys,
  schema,
  configs,
  original,
  search,
  onUpdate,
  onClear,
  onDelete,
}: {
  searchMode: SearchMode
  isMobile: boolean
  colTemplate: string
  showBase: boolean
  config: GitHubConfig
  activeLang: string
  filteredKeys: string[]
  schema: ConfigSchema
  configs: Record<string, ConfigMap>
  original: Record<string, ConfigMap>
  search: string
  onUpdate: (lang: string, key: string, value: ConfigValue) => void
  onClear: (lang: string, key: string) => void
  onDelete: (key: string) => void
}) => {
  const activeFile = config.files.find(f => f.lang === activeLang)
  const pad = isMobile ? 'px-2.5' : 'px-3'
  const isKeyMode = searchMode === 'key'

  return (
    <div className="flex-1 overflow-auto min-h-0 flex flex-col">
      {isKeyMode ? (
        <div
          className={cn('sticky top-0 z-10 grid bg-surface border-b border-border-muted text-[10px] uppercase tracking-wider text-fg-muted font-semibold', pad)}
          style={{ gridTemplateColumns: isMobile ? '1fr 24px' : '200px 1fr 24px' }}
        >
          <div className="py-2">{ui.table.key}</div>
          {!isMobile && <div className="py-2 text-fg-brand">{ui.table.allLanguages}</div>}
          <div />
        </div>
      ) : (
        <div
          className="sticky top-0 z-10 grid bg-surface border-b border-border-muted text-[10px] uppercase tracking-wider text-fg-muted font-semibold"
          style={{ gridTemplateColumns: colTemplate }}
        >
          <div className={cn(pad, 'py-2')}>{ui.table.key}</div>
          {showBase && (
            <div className={cn(pad, 'py-2')}>
              {ui.common.base} ({config.baseLang})
            </div>
          )}
          <div className={cn(pad, 'py-2')}>
            {activeFile ? `${activeFile.flag} ${activeFile.label}` : activeLang}
          </div>
          <div />
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {filteredKeys.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-fg-muted">
            {search ? t(ui.empty.noResult, { query: search }) : ui.configs.empty}
          </div>
        ) : (
          filteredKeys.map((key, i) =>
            isKeyMode ? (
              <ConfigKeyModeRow
                key={key}
                rowKey={key}
                type={schema[key]}
                configs={configs}
                original={original}
                configFiles={config.files}
                baseLang={config.baseLang}
                isEven={i % 2 === 0}
                isMobile={isMobile}
                searchQuery={search}
                onUpdate={onUpdate}
                onDelete={() => onDelete(key)}
              />
            ) : (
              <ConfigRow
                key={key}
                rowKey={key}
                type={schema[key]}
                baseValue={configs[config.baseLang]?.[key]}
                targetValue={configs[activeLang]?.[key]}
                originalValue={original[activeLang]?.[key]}
                isEven={i % 2 === 0}
                colTemplate={colTemplate}
                showBase={showBase}
                isBaseLocale={activeLang === config.baseLang}
                isMobile={isMobile}
                searchQuery={search}
                onChange={v => onUpdate(activeLang, key, v)}
                onClear={() => onClear(activeLang, key)}
                onDelete={() => onDelete(key)}
              />
            ),
          )
        )}
      </div>
    </div>
  )
}
