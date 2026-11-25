/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_MOCK_FAIL_RATE?: string;
  readonly VITE_ENABLE_MOCK_CONTROLS?: string;
  readonly VITE_FEATURE_SMART_SEARCH?: string;
  readonly VITE_FEATURE_CART?: string;
  readonly VITE_FEATURE_SHARE?: string;
  readonly VITE_FEATURE_PRODUCT_PAGE?: string;
  readonly VITE_FEATURE_BUY_BUTTONS?: string;
  readonly VITE_SITE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
