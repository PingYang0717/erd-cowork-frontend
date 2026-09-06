import { httpClient } from '@/api/apiClient';

/** A jsdom File degrades to an anonymous blob when MSW/undici reassembles it — the
 *  filename is lost. A real browser of course keeps filenames when it serialises
 *  FormData, so this test-only interceptor pre-serialises FormData into the multipart
 *  bytes a browser would send, letting the mock backend read the real wire. The app's own
 *  source (fileApi's FormData path) stays file-identical to cowork and does not bend for
 *  the test environment (ADR-0007). */
export const installFormDataWire = (): void => {
  httpClient.interceptors.request.use(async (config) => {
    if (!(config.data instanceof FormData)) return config;

    const boundary = `----erdCoworkTestWire${Math.random().toString(16).slice(2)}`;
    const encoder = new TextEncoder();
    const chunks: Uint8Array[] = [];
    for (const [name, value] of config.data.entries()) {
      if (typeof value === 'string') {
        chunks.push(
          encoder.encode(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`)
        );
        continue;
      }
      const filename = (value.name ?? 'blob').replace(/"/g, '%22');
      chunks.push(
        encoder.encode(
          `--${boundary}\r\n` +
            `Content-Disposition: form-data; name="${name}"; filename="${filename}"\r\n` +
            `Content-Type: ${value.type || 'application/octet-stream'}\r\n\r\n`
        )
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
};
