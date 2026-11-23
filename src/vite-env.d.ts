/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_MOCK_FAIL_RATE?: string;
  readonly VITE_ENABLE_MOCK_CONTROLS?: string;
  readonly VITE_FEATURE_SMART_SEARCH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
