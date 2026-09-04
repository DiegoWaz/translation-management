import { isGithubConfigured, loadConfig, loadUiConfig } from './config'
import { hasOAuthCallback } from './githubOAuth'

const WELCOME_DISMISSED_KEY = 'localehub:welcome-dismissed:v1'

/** Session flag so « demo » / connect can leave `/welcome` without bouncing back. */
export const dismissWelcome = (): void => {
  try { sessionStorage.setItem(WELCOME_DISMISSED_KEY, '1') } catch { /* ignore */ }
}

export const isWelcomeDismissed = (): boolean => {
  try { return sessionStorage.getItem(WELCOME_DISMISSED_KEY) === '1' } catch { return false }
}

/** First visit without GitHub config → `/welcome` (unless OAuth callback or session dismiss). */
export const shouldLandOnWelcome = (): boolean => {
  if (hasOAuthCallback()) return false
  if (isWelcomeDismissed()) return false
  if (loadUiConfig()) return false
  return !isGithubConfigured(loadConfig())
}
