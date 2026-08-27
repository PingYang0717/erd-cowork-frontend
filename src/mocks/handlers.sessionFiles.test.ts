import { describe, expect, it } from 'vitest';

import { deleteFile } from '@/api/fileApi';
import type { Message, SessionDetail, UploadedFileInfo } from '@/types/api/index';

const API_BASE = '/api';

/** Hand-built multipart POST: the mock's parser is exercised against browser-real wire
 *  bytes constructed independently of `fileApi` (and of the test-env FormData shim in
 *  test/formDataWire.ts) — an independent source of truth for the wire format. */
async function postMultipart(
  sessionId: string,
  files: { name: string; sizeBytes: number; type?: string }[],
): Promise<UploadedFileInfo[]> {
  const boundary = `----erdCoworkTest${Math.random().toString(16).slice(2)}`;
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  for (const file of files) {
    chunks.push(
      encoder.encode(
        `--${boundary}\r\n` +
          `Content-Disposition: form-data; name="files"; filename="${file.name}"\r\n` +
          `Content-Type: ${file.type ?? 'text/csv'}\r\n\r\n`,
      ),
    );
    chunks.push(new Uint8Array(file.sizeBytes));
    chunks.push(encoder.encode('\r\n'));
  }
  chunks.push(encoder.encode(`--${boundary}--\r\n`));
  const body = new Uint8Array(chunks.reduce((total, chunk) => total + chunk.length, 0));
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.length;
  }

  const response = await fetch(`${API_BASE}/sessions/${sessionId}/files`, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
    body,
  });
  if (!response.ok) throw new Error(`upload failed: ${response.status}`);
  return (await response.json()) as UploadedFileInfo[];
}

async function sessionFiles(sessionId: string): Promise<UploadedFileInfo[]> {
  const response = await fetch(`${API_BASE}/sessions/${sessionId}`);
  const detail = (await response.json()) as SessionDetail;
  return detail.files;
}

/** Files live on the session per the backend contract: multipart POST, delete by id,
 *  and the list rides inside SessionDetail. */
describe('session file endpoints', () => {
  it('accepts a multipart upload and lists the files in the session detail', async () => {
    const created = await postMultipart('session-2', [
      { name: 'lot-genealogy.csv', sizeBytes: 1024 },
      { name: 'yields.csv', sizeBytes: 2048 },
    ]);
    expect(created).toHaveLength(2);
    expect(created[0]).toMatchObject({
      name: 'lot-genealogy.csv',
      alias: 't1',
      sizeBytes: 1024,
      rowCount: null,
      expired: false,
    });
    expect(created[1]).toMatchObject({ name: 'yields.csv', alias: 't2', sizeBytes: 2048 });

    expect(await sessionFiles('session-2')).toHaveLength(2);
  });

  it('deletes one file by id', async () => {
    await postMultipart('session-2', [
      { name: 'a.csv', sizeBytes: 10 },
      { name: 'b.csv', sizeBytes: 20 },
    ]);
    const [first] = await sessionFiles('session-2');

    await deleteFile('session-2', first.id);

    const remaining = await sessionFiles('session-2');
    expect(remaining.some((file) => file.id === first.id)).toBe(false);
  });

  it('snapshots the session files onto the sent user message and consumes them', async () => {
    await postMultipart('session-2', [{ name: 'lot-genealogy.csv', sizeBytes: 1024 }]);

    const post = await fetch(`${API_BASE}/sessions/session-2/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify({ question: 'Generate the Daily Monitor dashboard for A14.' }),
    });
    expect(post.ok).toBe(true);
    const reader = post.body!.getReader();
    while (!(await reader.read()).done) {
      // draining
    }

    const response = await fetch(`${API_BASE}/sessions/session-2`);
    const detail = (await response.json()) as SessionDetail;

    const userMessage = [...detail.messages].reverse().find((m: Message) => m.sender === 'USER');
    expect(userMessage?.attachments?.map((file) => file.name)).toEqual(['lot-genealogy.csv']);
    // Consumed: the composer's chips row empties once the message carries them.
    expect(detail.files).toHaveLength(0);
  });
});
