import { useTranslationApp } from './hooks/useTranslationApp'
import { TopBar } from './components/TopBar'
import { MobileLangStrip } from './components/MobileLangStrip'
import { Sidebar } from './components/Sidebar'
import { EditorToolbar } from './components/EditorToolbar'
import { GroupStrip } from './components/GroupStrip'
import { StaleBanner } from './components/StaleBanner'
import { AddKeyBar } from './components/AddKeyBar'
import { AddConfigKeyBar } from './components/AddConfigKeyBar'
import { TranslationTable } from './components/TranslationTable'
import { ConfigTable } from './components/ConfigTable'
import { HistoryPanel } from './components/HistoryPanel'
import { HistoryDrawer } from './components/HistoryDrawer'
import { BulkImportModal } from './components/BulkImportModal'
import { ExportModal } from './components/ExportModal'
import { SettingsModal } from './components/SettingsModal'
import { CommitDialog } from './components/CommitDialog'
import { defaultPath } from './helpers/lang'
import { configMapsToStringMaps } from './helpers/exportGenerators'
import { ToastStack } from './components/ToastStack'
import { ui } from './i18n/ui'

const App = () => {
  const app = useTranslationApp()
  const isConfigs = app.workspace === 'configs'
  const configColTemplate = app.isMobile
    ? 'minmax(0,1fr) minmax(0,1fr) 28px'
    : app.showBase
      ? '200px minmax(0,1fr) minmax(0,1.4fr) 28px'
      : 'minmax(0,1fr) minmax(0,1.4fr) 28px'
  const resolveConfigPath = (lang: string) => defaultPath(lang, app.config.configPathTemplate)
  const exportData = isConfigs
    ? configMapsToStringMaps(
      app.configs,
      app.configSchema,
      app.config.files.map(f => f.lang),
      app.configKeys,
    )
    : app.translations
  const exportKeys = isConfigs ? app.configKeys : app.baseKeys
  const exportFilteredKeys = isConfigs ? app.filteredConfigKeys : app.filteredKeys

  return (
    <div className="font-sans bg-page text-fg min-h-screen flex flex-col">
      <TopBar
        config={app.config}
        isDemoMode={app.isDemoMode}
        modifiedCount={app.modifiedCount}
        loading={app.loading}
        showHistory={app.showHistory}
        isMobile={app.isMobile}
        isDark={app.isDark}
        uiLocale={app.uiLocale}
        workspace={app.workspace}
        onWorkspaceChange={app.setWorkspace}
        onUiLocaleChange={app.setUiLocale}
        onLoad={app.handleLoad}
        onCommit={app.handleCommit}
        onHistory={app.handleToggleHistory}
        onSettings={() => app.setShowSettings(true)}
        onToggleTheme={() => app.setIsDark(v => !v)}
      />

      <div className="flex flex-1 overflow-hidden h-[calc(100vh-56px)] flex-col">
        {app.isMobile && (
          <MobileLangStrip
            langs={app.langStats}
            activeLang={app.activeLang}
            onSelectLang={app.handleSelectLang}
            filter={app.filter}
            onFilterChange={app.setFilter}
            hideVarIssues={isConfigs}
          />
        )}

        <div className="flex flex-1 overflow-hidden">
          {!app.isMobile && (
            <Sidebar
              langs={app.langStats}
              activeLang={app.activeLang}
              filter={app.filter}
              onSelectLang={app.handleSelectLang}
              onFilterChange={app.setFilter}
              baseKeys={isConfigs ? app.configKeys : app.baseKeys}
              compact={app.isTablet}
              hideVarIssues={isConfigs}
            />
          )}

          <main className="flex-1 flex flex-col overflow-hidden min-w-0">
            <EditorToolbar
              workspace={app.workspace}
              search={app.search}
              onSearchChange={app.setSearch}
              searchMode={app.searchMode}
              onSearchModeChange={app.setSearchMode}
              filteredCount={isConfigs ? app.filteredConfigKeys.length : app.filteredKeys.length}
              totalCount={isConfigs ? app.configKeys.length : app.baseKeys.length}
              isMobile={app.isMobile}
              varValidation={app.varValidation}
              varIssuesCount={app.varIssuesCount}
              onToggleVarValidation={app.toggleVarValidation}
              onExport={() => app.setShowExport(true)}
              onImport={() => app.setShowBulkImport(true)}
              onAddKey={() => app.setAddingKey(true)}
            />

            {!isConfigs && (
              <GroupStrip groups={app.groups} activeGroup={app.activeGroup} onSelect={app.setActiveGroup} />
            )}

            <StaleBanner
              staleLangs={app.staleLangs}
              config={app.config}
              onReload={app.handleLoad}
              onDismiss={() => app.setStaleLangs([])}
            />

            {app.addingKey && !isConfigs && (
              <AddKeyBar
                value={app.newKey}
                onChange={app.setNewKey}
                onConfirm={app.addKey}
                onCancel={() => { app.setAddingKey(false); app.setNewKey('') }}
              />
            )}

            {app.addingKey && isConfigs && (
              <AddConfigKeyBar
                value={app.newKey}
                onChange={app.setNewKey}
                type={app.newConfigType}
                onTypeChange={app.setNewConfigType}
                onConfirm={app.addKey}
                onCancel={() => { app.setAddingKey(false); app.setNewKey(''); app.setNewConfigType('text') }}
              />
            )}

            {isConfigs ? (
              <ConfigTable
                searchMode={app.searchMode}
                isMobile={app.isMobile}
                colTemplate={configColTemplate}
                showBase={app.showBase}
                config={app.config}
                activeLang={app.activeLang}
                filteredKeys={app.filteredConfigKeys}
                schema={app.configSchema}
                configs={app.configs}
                original={app.configsOriginal}
                search={app.search}
                onUpdate={app.updateConfigValue}
                onClear={app.clearConfigOnLang}
                onDelete={app.deleteKey}
              />
            ) : (
              <TranslationTable
                searchMode={app.searchMode}
                isMobile={app.isMobile}
                colTemplate={app.colTemplate}
                showBase={app.showBase}
                showLastMod={app.showLastMod}
                config={app.config}
                activeLang={app.activeLang}
                activeLangFile={app.activeLangFile}
                filteredKeys={app.filteredKeys}
                filter={app.filter}
                search={app.search}
                translations={app.translations}
                original={app.original}
                activeLangKeyMap={app.activeLangKeyMap}
                searchMatchMap={app.searchMatchMap}
                varValidation={app.varValidation}
                varIssuesMap={app.varIssuesMap}
                onUpdate={app.updateValue}
                onDelete={app.deleteKey}
              />
            )}
          </main>

          {app.showHistory && !app.isMobile && (
            <HistoryPanel
              lang={app.activeLang}
              langFile={app.activeLangFile}
              commits={app.fileHistory[app.activeLang] ?? []}
              loading={app.historyLoading}
              isDemoMode={app.isDemoMode}
              onClose={() => app.setShowHistory(false)}
              onRestoreKey={app.restoreKey}
              compact={app.isTablet}
            />
          )}
        </div>
      </div>

      {app.showHistory && app.isMobile && (
        <HistoryDrawer
          lang={app.activeLang}
          langFile={app.activeLangFile}
          commits={app.fileHistory[app.activeLang] ?? []}
          loading={app.historyLoading}
          isDemoMode={app.isDemoMode}
          onClose={() => app.setShowHistory(false)}
          onRestoreKey={app.restoreKey}
        />
      )}

      {app.showSettings && (
        <SettingsModal
          config={app.config}
          onClose={() => app.setShowSettings(false)}
          isMobile={app.isMobile}
        />
      )}
      {app.showCommit && (
        <CommitDialog
          commitMsg={app.commitMsg}
          onMsgChange={app.setCommitMsg}
          modifiedKeys={isConfigs ? app.modifiedConfigKeys : app.modifiedKeys}
          newFileLangs={app.langsNeedingFile}
          schemaDirty={isConfigs ? app.schemaDirty : false}
          resolvePath={isConfigs ? resolveConfigPath : undefined}
          config={app.config}
          onConfirm={app.doCommit}
          onClose={() => app.setShowCommit(false)}
          isMobile={app.isMobile}
        />
      )}
      {app.showBulkImport && !isConfigs && (
        <BulkImportModal
          baseKeys={app.baseKeys}
          configFiles={app.config.files}
          onApplyParsed={app.handleBulkApply}
          onApplyJson={app.handleJsonApply}
          onClose={() => app.setShowBulkImport(false)}
          isMobile={app.isMobile}
        />
      )}
      {app.showExport && (
        <ExportModal
          data={exportData}
          baseKeys={exportKeys}
          filteredKeys={exportFilteredKeys}
          configFiles={app.config.files}
          title={isConfigs ? ui.export.titleConfigs : ui.export.title}
          downloadBasename={isConfigs ? 'configs' : 'translations'}
          onClose={() => app.setShowExport(false)}
          showToast={app.showToast}
          isMobile={app.isMobile}
        />
      )}

      <ToastStack toasts={app.toasts} />
    </div>
  )
}

export default App
