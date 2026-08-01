import type { CommitRecord, LangFile } from '../types'
import { HistoryPanel } from './HistoryPanel'

export const HistoryDrawer = ({
  lang,
  langFile,
  commits,
  loading,
  isDemoMode,
  onClose,
  onRestoreKey,
}: {
  lang: string
  langFile?: LangFile
  commits: CommitRecord[]
  loading: boolean
  isDemoMode: boolean
  onClose: () => void
  onRestoreKey: (lang: string, key: string, value: string) => void
}) => {
  return (
    <div className="fixed inset-0 z-[300] flex flex-col justify-end">
      <div onClick={onClose} className="absolute inset-0 bg-black/60" />
      <div className="relative bg-surface rounded-t-2xl max-h-[80vh] flex flex-col overflow-hidden">
        <HistoryPanel
          lang={lang}
          langFile={langFile}
          commits={commits}
          loading={loading}
          isDemoMode={isDemoMode}
          onClose={onClose}
          onRestoreKey={onRestoreKey}
          compact
        />
      </div>
    </div>
  )
}
