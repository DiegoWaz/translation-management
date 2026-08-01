import type { ReactNode } from 'react'

export const Field = ({ label, children }: { label: string; children: ReactNode }) => {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs text-fg-tertiary font-medium">{label}</label>
      {children}
    </div>
  )
}
