
export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",
  publicAppUrl: import.meta.env.VITE_PUBLIC_APP_URL || window.location.origin,
  enableDemoFallback: String(import.meta.env.VITE_ENABLE_DEMO_FALLBACK || "false") === "true",
  pollingIntervalMs: Number(import.meta.env.VITE_POLLING_INTERVAL_MS || 5000),
  maxUploadMB: Number(import.meta.env.VITE_MAX_UPLOAD_MB || 10),
  useApiWrapperEncryption: String(import.meta.env.VITE_API_WRAPPER_ENCRYPTION || "false") === "true"
};
