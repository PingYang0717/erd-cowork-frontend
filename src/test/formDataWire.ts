import { apiClient } from '@/api/apiClient';

/** jsdom 的 File 經 MSW/undici 重組會降級成匿名 blob——檔名消失。真瀏覽器序列化
 *  FormData 時檔名當然都在;這個 test-only interceptor 把 FormData 預先序列化成
 *  與瀏覽器等價的 multipart bytes,讓 mock 後端讀到真實的 wire。app 原始碼
 *  (fileApi 的 FormData 路線)維持 cowork 同形,不為測試環境讓步(ADR-0007)。 */
export function installFormDataWire(): void {
  apiClient.interceptors.request.use(async (config) => {
    if (!(config.data instanceof FormData)) return config;

    const boundary = `----erdCoworkTestWire${Math.random().toString(16).slice(2)}`;
    const encoder = new TextEncoder();
    const chunks: Uint8Array[] = [];
    for (const [name, value] of config.data.entries()) {
      if (typeof value === 'string') {
        chunks.push(
          encoder.encode(
            `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`,
          ),
        );
        continue;
      }
      const filename = (value.name ?? 'blob').replace(/"/g, '%22');
      chunks.push(
        encoder.encode(
          `--${boundary}\r\n` +
            `Content-Disposition: form-data; name="${name}"; filename="${filename}"\r\n` +
            `Content-Type: ${value.type || 'application/octet-stream'}\r\n\r\n`,
        ),
      );
      chunks.push(new Uint8Array(await value.arrayBuffer()));
      chunks.push(encoder.encode('\r\n'));
    }
    chunks.push(encoder.encode(`--${boundary}--\r\n`));

    const body = new Uint8Array(chunks.reduce((total, chunk) => total + chunk.length, 0));
    let offset = 0;
    for (const chunk of chunks) {
      body.set(chunk, offset);
      offset += chunk.length;
    }

    config.data = body;
    config.headers['Content-Type'] = `multipart/form-data; boundary=${boundary}`;
    return config;
  });
}
