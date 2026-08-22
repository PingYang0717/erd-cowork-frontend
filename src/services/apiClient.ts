import axios from 'axios';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
});

apiClient.interceptors.request.use((config) => {
  // 統一附加 token 等邏輯放這裡,不要讓每個 feature 各自處理
  return config;
});

apiClient.interceptors.response.use(
  (response) => response.data, // 統一在這裡拆掉 response.data,呼叫端拿到的就是資料本身
  (error) => Promise.reject(error),
);
