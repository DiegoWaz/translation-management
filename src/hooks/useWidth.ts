import { useSyncExternalStore } from 'react'

const subscribe = (cb: () => void) => {
  window.addEventListener('resize', cb)
  return () => window.removeEventListener('resize', cb)
}

export const useWidth = () => {
  return useSyncExternalStore(subscribe, () => window.innerWidth, () => 1280)
}
