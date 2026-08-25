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
  /** 走 raw fetch 而非 axios：自組 multipart，所以 MUST 自行帶 auth header——axios
   *  interceptor 不會經過這裡。 */
  uploadFiles: async (sessionId: string, files: File[]): Promise<UploadedFileInfo[]> => {
    const { body, contentType } = await buildMultipartBody(files);
    const response = await fetch(`${API_BASE}/sessions/${sessionId}/files`, {
      method: 'POST',
      headers: { 'Content-Type': contentType, ...getAuthHeaders() },
      // The freshly-built Uint8Array owns its exact-size buffer; TS's DOM lib just
      // does not accept Uint8Array as BodyInit.
      body: body.buffer as ArrayBuffer,
    });
    if (!response.ok) {
      throw new Error(`Failed to upload files: ${response.status}`);
    }
    return (await response.json()) as UploadedFileInfo[];
  },

  deleteFile: (sessionId: string, fileId: string) =>
    apiClient.delete<void>(`/sessions/${sessionId}/files/${fileId}`),
};
