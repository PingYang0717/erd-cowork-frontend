import axios, { type AxiosRequestConfig } from 'axios';

const USER_KEY = 'erd_user_id';

export function getUserId(): string {
  let id = localStorage.getItem(USER_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(USER_KEY, id);
  }
  return id;
}

/** 回傳這次請求要送出的 auth header;回傳值語意是「完全取代」,預設以外的 provider
 *  不回傳 X-User-Id 就不會送。internal 環境用 SSO header 取代匿名 UUID,見
 *  bootstrap/internal.ts。 */
export type AuthHeaderProvider = () => Record<string, string>;

let authHeaderProvider: AuthHeaderProvider = () => ({ 'X-User-Id': getUserId() });

/** 覆寫 auth header provider(internal SSO 接縫用它換上 gateway/SSO header)。provider
 *  MUST 每次請求都被呼叫,NEVER 快取回傳值——internal 的 token 會在背景刷新,快取住
 *  會在過期後開始 401。 */
export function setAuthHeaderProvider(next: AuthHeaderProvider): void {
  authHeaderProvider = next;
}

/** 取得目前應送出的 auth header;axios interceptor 與 agentApi 的 raw fetch 共用同一個
 *  provider,兩條路徑保持一致。 */
export function getAuthHeaders(): Record<string, string> {
  return authHeaderProvider();
}

/** The axios instance itself.
 *
 *  Exported only for wiring that operates on axios rather than on an endpoint —
 *  registering interceptors, swapping the adapter in tests. Endpoint modules use
 *  `apiClient` below, which is typed for what the response interceptor actually
 *  returns. */
export const httpClient = axios.create({ baseURL: '/api' });

httpClient.interceptors.request.use((config) => {
  const headers = getAuthHeaders();
  for (const [headerName, headerValue] of Object.entries(headers)) {
    config.headers[headerName] = headerValue;
  }
  return config;
});

// One place unwraps the envelope, so no endpoint module repeats `.then((res) => res.data)`.
// Errors pass through untouched: `describeLoadError` / `describeActionError` read the
// AxiosError, and swallowing it here would leave them nothing to read.
httpClient.interceptors.response.use(
  (response) => response.data,
  (error) => Promise.reject(error),
);

/** The interceptor above unwraps `response.data`, so axios's own return types
 *  (`AxiosResponse<T>`) no longer describe what callers receive. This wrapper corrects
 *  the type once, here, rather than having every endpoint module cast. */
export const apiClient = {
  get: <T>(url: string, config?: AxiosRequestConfig) =>
    httpClient.get(url, config) as unknown as Promise<T>,
  post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    httpClient.post(url, data, config) as unknown as Promise<T>,
  patch: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    httpClient.patch(url, data, config) as unknown as Promise<T>,
  delete: <T>(url: string, config?: AxiosRequestConfig) =>
    httpClient.delete(url, config) as unknown as Promise<T>,
};
