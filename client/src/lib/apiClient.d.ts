export declare const PROD_BACKEND_URL: string;
export declare const getApiBase: () => string;
export declare const API_BASE: string;
export declare const getSessionId: () => string;
export declare const fetchWithTimeout: (url: string, options?: RequestInit, timeoutMs?: number, isRetry?: boolean) => Promise<Response>;
export declare const api: {
  get: (path: string, options?: RequestInit) => Promise<any>;
  post: (path: string, body?: any, options?: RequestInit) => Promise<any>;
  put: (path: string, body?: any, options?: RequestInit) => Promise<any>;
  delete: (path: string, options?: RequestInit) => Promise<any>;
};
