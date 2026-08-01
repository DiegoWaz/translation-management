/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GH_TOKEN?: string
  readonly VITE_GH_OWNER?: string
  readonly VITE_GH_REPO?: string
  readonly VITE_GH_BRANCH?: string
  readonly VITE_GH_BASE_LANG?: string
  readonly VITE_GH_PATH_TEMPLATE?: string
  readonly VITE_GH_LANGS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
