import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { useTranslationApp } from './hooks/useTranslationApp'
import { TopBar } from './components/TopBar'
import { MobileLangStrip } from './components/MobileLangStrip'
import { Sidebar } from './components/Sidebar'
import { EditorToolbar } from './components/EditorToolbar'
import { GroupStrip } from './components/GroupStrip'
import { StaleBanner } from './components/StaleBanner'
import { StaleConflictModal } from './components/StaleConflictModal'
import { DuplicateKeysBanner } from './components/DuplicateKeysBanner'
import { AddKeyBar } from './components/AddKeyBar'
import { AddConfigKeyBar } from './components/AddConfigKeyBar'
import { TranslationTable } from './components/TranslationTable'
import { ConfigTable } from './components/ConfigTable'
import { Pagination } from './components/Pagination'
import { HistoryPanel } from './components/HistoryPanel'
import { HistoryDrawer } from './components/HistoryDrawer'
import { BulkImportModal } from './components/BulkImportModal'
import { ConfigBulkImportModal } from './components/ConfigBulkImportModal'
import { ExportModal } from './components/ExportModal'
import { SettingsModal } from './components/SettingsModal'
import { CommitDialog } from './components/CommitDialog'
import { LoadDialog } from './components/LoadDialog'
import { SetupWizard } from './components/SetupWizard'
import { OnboardingPage } from './components/OnboardingPage'
import { FeaturesPage } from './components/FeaturesPage'
import { AppFooter } from './components/AppFooter'
import { defaultPath } from './helpers/lang'
import { configMapsToStringMaps } from './helpers/exportGenerators'
import { SchemaValidateWorkspace } from './components/SchemaValidateWorkspace'
import { ToastStack } from './components/ToastStack'
import { LoadingOverlay } from './components/LoadingOverlay'
import { SessionLostModal } from './components/SessionLostModal'
import { ui } from './i18n/ui'
import { ROUTES } from './routes'
import { dismissWelcome, shouldLandOnWelcome } from './helpers/welcome'

type AppState = ReturnType<typeof useTranslationApp>

const WelcomeRoute = ({ app }: { app: AppState }) => {
  const navigate = useNavigate()
  return (
    <OnboardingPage
      isMobile={app.isMobile}
      showBackToApp={!shouldLandOnWelcome()}
      onConnect={() => {
        dismissWelcome()
        navigate(ROUTES.app)
        app.setShowSetup(true)
      }}
      onDemo={() => {
        dismissWelcome()
        navigate(ROUTES.app)
      }}
    />
  )
}

const EditorRoute = ({ app }: { app: AppState }) => {
  const isConfigs = app.workspace === 'configs'
  const isSchema = app.workspace === 'schema'
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

  if (shouldLandOnWelcome()) {
    return <Navigate to={ROUTES.welcome} replace />
  }

  return (
    <div className="font-sans bg-page text-fg h-dvh flex flex-col overflow-hidden">
      <TopBar
        config={app.config}
        isDemoMode={app.isDemoMode}
        modifiedCount={app.modifiedCount}
        loading={app.loading}
        showHistory={app.showHistory}
        isMobile={app.isMobile}
        isTablet={app.isTablet}
        isDark={app.isDark}
        uiLocale={app.uiLocale}
        workspace={app.workspace}
        onWorkspaceChange={app.setWorkspace}
        onUiLocaleChange={app.setUiLocale}
        onLoad={app.openLoadDialog}
        onBranchClick={app.openLoadDialog}
        onCommit={app.handleCommit}
        onHistory={app.handleToggleHistory}
        onSettings={() => app.setShowSettings(true)}
        onSetup={() => app.setShowSetup(true)}
        onToggleTheme={() => app.setIsDark(v => !v)}
      />

      <div className="flex flex-1 overflow-hidden min-h-0 flex-col">
        {isSchema ? (
          <SchemaValidateWorkspace isMobile={app.isMobile} />
        ) : (
          <>
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

        <div className="flex flex-1 overflow-hidden min-h-0">
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

          <main className="flex-1 flex flex-col overflow-hidden min-w-0 relative">
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
              onAddKey={app.startAddKey}
            />

            {!isConfigs && (
              <GroupStrip groups={app.groups} activeGroup={app.activeGroup} onSelect={app.setActiveGroup} />
            )}

            <StaleBanner
              staleLangs={app.staleLangs}
              config={app.config}
              onReview={() => app.setShowStaleConflict(true)}
              onReload={() => app.handleReloadStale()}
              onDismiss={() => {
                app.handleKeepAllStaleLocal()
              }}
            />

            {!isConfigs && !app.duplicateKeysDismissed && (
              <DuplicateKeysBanner
                warnings={app.duplicateKeyWarnings}
                config={app.config}
                onDismiss={() => app.setDuplicateKeysDismissed(true)}
              />
            )}

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
                filteredKeys={app.pagedConfigKeys}
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
                keyModeColTemplate={app.keyModeColTemplate}
                showBase={app.showBase}
                showLastMod={app.showLastMod}
                config={app.config}
                activeLang={app.activeLang}
                activeLangFile={app.activeLangFile}
                filteredKeys={app.pagedKeys}
                filter={app.filter}
                search={app.search}
                translations={app.translations}
                original={app.original}
                activeLangKeyMap={app.activeLangKeyMap}
                searchMatchMap={app.searchMatchMap}
                varValidation={app.varValidation}
                varIssuesMap={app.varIssuesMap}
                onResizeColumn={app.resizeColumn}
                onResetColumn={app.resetColumn}
                onUpdate={app.updateValue}
                onDelete={app.deleteKey}
                onRename={app.renameKey}
                onShowKeyHistory={(key) => { app.setKeyHistoryFilter(key); app.setShowHistory(true) }}
                onExportKey={app.exportKey}
                onDuplicateKey={app.duplicateKey}
              />
            )}

            <Pagination
              page={app.page}
              pageCount={app.pageCount}
              pageSize={app.pageSize}
              pageSizeOptions={app.pageSizeOptions}
              totalCount={isConfigs ? app.filteredConfigKeys.length : app.filteredKeys.length}
              isMobile={app.isMobile}
              onPageChange={app.setPage}
              onPageSizeChange={app.setPageSize}
            />

          </main>

          {app.showHistory && !app.isMobile && !isSchema && (
            <HistoryPanel
              lang={app.activeLang}
              langFile={app.activeLangFile}
              commits={app.fileHistory[app.activeLang] ?? []}
              loading={app.historyLoading}
              error={app.historyError}
              isDemoMode={app.isDemoMode}
              onClose={() => { app.setShowHistory(false); app.setKeyHistoryFilter(null) }}
              onReload={app.reloadHistory}
              onRestoreKey={app.restoreKey}
              compact={app.isTablet}
              keyFilter={app.keyHistoryFilter}
              onKeyFilterChange={app.setKeyHistoryFilter}
              onReturnToEdit={() => { app.setShowHistory(false); app.setKeyHistoryFilter(null) }}
            />
          )}
        </div>
          </>
        )}
      </div>

      <AppFooter isMobile={app.isMobile} />

      {app.showHistory && app.isMobile && !isSchema && (
        <HistoryDrawer
          lang={app.activeLang}
          langFile={app.activeLangFile}
          commits={app.fileHistory[app.activeLang] ?? []}
          loading={app.historyLoading}
          error={app.historyError}
          isDemoMode={app.isDemoMode}
          onClose={() => app.setShowHistory(false)}
          onReload={app.reloadHistory}
          onRestoreKey={app.restoreKey}
        />
      )}

      {app.showSettings && (
        <SettingsModal
          config={app.config}
          onClose={() => app.setShowSettings(false)}
          onSetup={() => app.setShowSetup(true)}
          onDisconnect={app.handleDisconnect}
          isMobile={app.isMobile}
        />
      )}
      {app.showLoad && app.isConnected && !app.isDemoMode && !app.sessionLostReason && (
        <LoadDialog
          config={app.config}
          hasUnsavedChanges={app.hasUnsavedChanges}
          loading={app.loading && app.showLoad}
          onConfirm={app.handleLoadConfirm}
          onClose={() => app.setShowLoad(false)}
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
          original={isConfigs ? (app.configsOriginal as Record<string, Record<string, string>>) : app.original}
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
      {app.showBulkImport && isConfigs && (
        <ConfigBulkImportModal
          schema={app.configSchema}
          configs={app.configs}
          configFiles={app.config.files}
          onApply={app.handleConfigImport}
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
          fileSources={isConfigs ? undefined : app.fileSources}
          keyOwners={isConfigs ? undefined : app.keyOwners}
          title={isConfigs ? ui.export.titleConfigs : ui.export.title}
          downloadBasename={isConfigs ? 'configs' : 'translations'}
          onClose={() => app.setShowExport(false)}
          showToast={app.showToast}
          isMobile={app.isMobile}
        />
      )}

      {app.showStaleConflict && app.staleConflicts.length > 0 && (
        <StaleConflictModal
          conflicts={app.staleConflicts}
          config={app.config}
          onClose={() => app.setShowStaleConflict(false)}
          onResolve={app.handleResolveStaleConflict}
          onReloadAll={app.handleReloadStale}
          onKeepAllLocal={app.handleKeepAllStaleLocal}
          isMobile={app.isMobile}
        />
      )}

      {app.sessionLostReason && !app.showSetup && !app.loading && (
        <SessionLostModal
          reason={app.sessionLostReason}
          onReconnect={app.handleReconnect}
        />
      )}
    </div>
  )
}

const App = () => {
  const app = useTranslationApp()
  const navigate = useNavigate()

  return (
    <>
      <Routes>
        <Route path={ROUTES.welcome} element={<WelcomeRoute app={app} />} />
        <Route path={ROUTES.features} element={<FeaturesPage isMobile={app.isMobile} />} />
        <Route path={ROUTES.app} element={<EditorRoute app={app} />} />
        <Route path="*" element={<Navigate to={ROUTES.app} replace />} />
      </Routes>

      {app.showSetup && (
        <SetupWizard
          oauthToken={app.oauthToken}
          onComplete={async cfg => {
            await app.handleSetupComplete(cfg)
            navigate(ROUTES.app)
          }}
          onSkip={() => {
            app.setShowSetup(false)
            navigate(ROUTES.app)
          }}
          isMobile={app.isMobile}
        />
      )}

      {(app.loading || app.oauthConnecting) && (
        <LoadingOverlay label={app.oauthConnecting ? ui.setup.connecting : undefined} />
      )}

      <ToastStack toasts={app.toasts} />
    </>
  )
}

export default App
