/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ADMIN_API_KEY?: string;
  readonly [key: string]: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
