import type { UploadedFileInfo } from '@/types/api/index';

import { apiClient } from './apiClient';
import { getAuthHeaders } from './identity';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

/** The multipart body is assembled by hand rather than through FormData: undici's
 *  fetch brand-checks File entries and silently serialises jsdom's File (tests) as an
 *  empty "blob". The wire format is standard multipart either way. */
async function buildMultipartBody(
  files: File[],
): Promise<{ body: Uint8Array; contentType: string }> {
  const boundary = `----erdCowork${crypto.randomUUID().replace(/-/g, '')}`;
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];

  for (const file of files) {
    const safeName = file.name.replace(/"/g, '%22');
    chunks.push(
      encoder.encode(
        `--${boundary}\r\n` +
          `Content-Disposition: form-data; name="files"; filename="${safeName}"\r\n` +
          `Content-Type: ${file.type || 'application/octet-stream'}\r\n\r\n`,
      ),
    );
    chunks.push(new Uint8Array(await file.arrayBuffer()));
    chunks.push(encoder.encode('\r\n'));
  }
  chunks.push(encoder.encode(`--${boundary}--\r\n`));

  const body = new Uint8Array(chunks.reduce((total, chunk) => total + chunk.length, 0));
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.length;
  }
  return { body, contentType: `multipart/form-data; boundary=${boundary}` };
}

export const fileApi = {
  /** 走 XHR 而非 fetch 或 axios：自組 multipart（所以 MUST 自行帶 auth header——axios
   *  interceptor 不會經過這裡），而 `fetch` 無法回報上傳進度。一份 CSV 在這裡動輒 GB
   *  等級，沒有進度就是一片凍住的畫面。 */
  uploadFiles: (
    sessionId: string,
    files: File[],
    onProgress?: (percent: number) => void,
  ): Promise<UploadedFileInfo[]> =>
    buildMultipartBody(files).then(
      ({ body, contentType }) =>
        new Promise<UploadedFileInfo[]>((resolve, reject) => {
          const request = new XMLHttpRequest();
          request.open('POST', `${API_BASE}/sessions/${sessionId}/files`);
          request.setRequestHeader('Content-Type', contentType);
          for (const [header, value] of Object.entries(getAuthHeaders())) {
            request.setRequestHeader(header, value);
          }

          request.upload.onprogress = (event) => {
            // `lengthComputable` is false for a body of unknown size; there is nothing
            // honest to report then, so report nothing.
            if (onProgress && event.lengthComputable && event.total > 0) {
              onProgress(Math.round((event.loaded / event.total) * 100));
            }
          };

          request.onload = () => {
            if (request.status < 200 || request.status >= 300) {
              reject(new Error(`Failed to upload files: ${request.status}`));
              return;
            }
            // The bytes are on the wire by the time the response lands; some browsers
            // stop short of a final progress event, so close it out here.
            onProgress?.(100);
            resolve(JSON.parse(request.responseText) as UploadedFileInfo[]);
          };
          request.onerror = () => reject(new Error('Failed to upload files'));
          request.onabort = () => reject(new Error('Upload aborted'));

          // The freshly-built Uint8Array owns its exact-size buffer; TS's DOM lib just
          // does not accept Uint8Array as a body.
          request.send(body.buffer as ArrayBuffer);
        }),
    ),

  deleteFile: (sessionId: string, fileId: string) =>
    apiClient.delete<void>(`/sessions/${sessionId}/files/${fileId}`),
};
