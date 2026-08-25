import { describe, expect, it } from 'vitest';

import { fileApi } from '@/api/fileApi';
import type { Message, SessionDetail, UploadedFileInfo } from '@/types/api/index';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

function csvFile(name: string, sizeBytes: number): File {
  return new File([new Uint8Array(sizeBytes)], name, { type: 'text/csv' });
}

async function sessionFiles(sessionId: string): Promise<UploadedFileInfo[]> {
  const response = await fetch(`${API_BASE}/sessions/${sessionId}`);
  const detail = (await response.json()) as SessionDetail;
  return detail.files;
}

/** Files live on the session per the backend contract: multipart POST, delete by id,
 *  and the list rides inside SessionDetail. Exercised through fileApi — the client
 *  the app itself uploads with. */
describe('session file endpoints', () => {
  it('accepts a multipart upload and lists the files in the session detail', async () => {
    const created = await fileApi.uploadFiles('session-2', [
      csvFile('lot-genealogy.csv', 1024),
      csvFile('yields.csv', 2048),
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
    await fileApi.uploadFiles('session-2', [csvFile('a.csv', 10), csvFile('b.csv', 20)]);
    const [first] = await sessionFiles('session-2');

    await fileApi.deleteFile('session-2', first.id);

    const remaining = await sessionFiles('session-2');
    expect(remaining.some((file) => file.id === first.id)).toBe(false);
  });

  it('snapshots the session files onto the sent user message and consumes them', async () => {
    await fileApi.uploadFiles('session-2', [csvFile('lot-genealogy.csv', 1024)]);

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
