import type { ReactNode } from 'react'

export const Overlay = ({ onClick, children }: { onClick: () => void; children: ReactNode }) => {
  return (
    <div onClick={onClick} className="fixed inset-0 z-[500] flex items-center justify-center backdrop-blur-[4px] bg-overlay">
      {children}
    </div>
  )
}
