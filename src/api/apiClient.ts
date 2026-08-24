import axios, { type AxiosRequestConfig } from 'axios';

import { getAuthHeaders } from '@/api/identity';

const rawClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
});

// Identity travels on every request; the backend filters sessions by it. Attached here
// so no call site can forget, and mirrored in `agentApi`'s raw fetch (axios cannot
// stream, so that one path builds its own headers from the same helper).
rawClient.interceptors.request.use((config) => {
  Object.assign(config.headers, getAuthHeaders());
  return config;
});

rawClient.interceptors.response.use(
  (response) => response.data, // 統一在這裡拆掉 response.data,呼叫端拿到的就是資料本身
  (error) => Promise.reject(error),
);

// The interceptor above unwraps `response.data`, so axios's own return types
// (`AxiosResponse<T>`) no longer match what callers actually receive. This
// wrapper corrects the type once, here, instead of every feature's API
// module re-casting `apiClient.get<T>(...) as unknown as Promise<T>`.
export const apiClient = {
  get: <T>(url: string, config?: AxiosRequestConfig) =>
    rawClient.get(url, config) as unknown as Promise<T>,
  post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    rawClient.post(url, data, config) as unknown as Promise<T>,
  patch: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    rawClient.patch(url, data, config) as unknown as Promise<T>,
  delete: <T>(url: string, config?: AxiosRequestConfig) =>
    rawClient.delete(url, config) as unknown as Promise<T>,
};
