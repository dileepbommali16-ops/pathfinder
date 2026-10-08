declare namespace NodeJS {
  interface ProcessEnv {
    [key: string]: string | undefined;
  }
  interface Process {
    env: ProcessEnv;
  }
}

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_APP_ID?: string;
  readonly VITE_OAUTH_PORTAL_URL?: string;
  readonly [key: string]: any;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
  readonly dirname?: string;
}

declare module "@tailwindcss/vite" {
  const plugin: () => any;
  export default plugin;
}

declare module "@vitejs/plugin-react" {
  const plugin: () => any;
  export default plugin;
}

declare module "vite" {
  export interface Plugin {
    name: string;
    [key: string]: any;
  }
  export function defineConfig(config: any): any;
}

declare module "node:path" {
  const path: any;
  export default path;
}

declare module "node:module" {
  export function createRequire(url: string | URL): (id: string) => any;
}
