import axios from 'axios';

/**
 * What to tell the user about a failed load.
 *
 * Axios reports an unreachable backend as a bare `Network Error`, and a request that
 * ran past `apiClient`'s timeout as `timeout of 10000ms exceeded`. Both read like a
 * bug in the app rather than what they are — a backend that is not answering. Since
 * the app has no mock to fall back on (ADR-0006), that is the most common failure
 * there is in development, and the one worth naming.
 */
export function describeLoadError(error: Error): { heading: string; detail: string } {
  if (axios.isAxiosError(error) && error.response === undefined) {
    return error.code === 'ECONNABORTED'
      ? { heading: '後端服務沒有回應', detail: '請求已逾時。請確認服務狀態後重試。' }
      : { heading: '無法連線到後端服務', detail: '請確認服務已啟動後重試。' };
  }
  return { heading: '這個區塊載入失敗', detail: error.message };
}

/** What to tell the user about a failed action (mutation). The backend's own
 *  `{ code, message }` wins; a backend that is not answering gets named; anything
 *  else falls back to "not ready yet" — per the decision that nothing is disabled
 *  up front, the error is how the user learns an endpoint has not landed. */
export function describeActionError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.response === undefined) {
      return '無法連線到後端服務，請確認服務已啟動後重試。';
    }
    const body = error.response.data as { message?: string } | undefined;
    if (body?.message) {
      return body.message;
    }
  }
  return '後端尚未就緒，請稍後再試。';
}
