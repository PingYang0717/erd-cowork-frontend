import axios, { type AxiosRequestConfig } from 'axios';

const USER_KEY = 'erd_user_id';

export const getUserId = (): string => {
  let id = localStorage.getItem(USER_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(USER_KEY, id);
  }
  return id;
};

/** Returns the auth headers to send with this request. The return value REPLACES the
 *  defaults outright: a non-default provider that omits X-User-Id means X-User-Id is not
 *  sent at all. The internal environment swaps the anonymous UUID for SSO headers this
 *  way — see bootstrap/internal.ts. */
export type AuthHeaderProvider = () => Record<string, string>;

let authHeaderProvider: AuthHeaderProvider = () => ({ 'X-User-Id': getUserId() });

/** Replaces the auth header provider; the internal SSO seam uses this to install
 *  gateway/SSO headers. The provider MUST be called on every request and its return value
 *  MUST NEVER be cached — internal tokens refresh in the background, so a cached value
 *  starts returning 401 the moment it expires. */
export const setAuthHeaderProvider = (next: AuthHeaderProvider): void => {
  authHeaderProvider = next;
};

/** The auth headers to send right now. The axios interceptor and agentApi's raw fetch
 *  share this one provider, so both paths stay in step. */
export const getAuthHeaders = (): Record<string, string> => authHeaderProvider();

/** The axios instance itself.
 *
 *  Exported only for wiring that operates on axios rather than on an endpoint —
 *  registering interceptors, swapping the adapter in tests. Endpoint modules use
 *  `apiClient` below, which is typed for what the response interceptor actually
 *  returns. */
/** Where every request goes. Exported because the streaming endpoint reaches the network
 *  through raw `fetch` (axios cannot surface a body incrementally) and so cannot inherit
 *  this from the axios instance — with the prefix written out a second time there, moving
 *  it here would have quietly left the stream pointing at the old one. */
export const API_BASE_URL = '/api';

export const httpClient = axios.create({ baseURL: API_BASE_URL });

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
  (error) => Promise.reject(error)
);

/** The interceptor above unwraps `response.data`, so axios's own return types
 *  (`AxiosResponse<T>`) no longer describe what callers receive. This wrapper corrects
 *  the type once, here, rather than having every endpoint module cast. */
export const apiClient = {
  get: <T>(url: string, config?: AxiosRequestConfig) => httpClient.get(url, config) as unknown as Promise<T>,
  post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    httpClient.post(url, data, config) as unknown as Promise<T>,
  patch: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    httpClient.patch(url, data, config) as unknown as Promise<T>,
  delete: <T>(url: string, config?: AxiosRequestConfig) => httpClient.delete(url, config) as unknown as Promise<T>,
};
