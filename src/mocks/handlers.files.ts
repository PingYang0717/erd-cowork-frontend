import { http, HttpResponse } from 'msw';

import type { UploadedFileInfo } from '@/types/api/upload';

import { upsertSession } from './handlers.sessions';
import { createPersistedResource } from './persistedResource';

// Session-level files per the backend contract (POST /sessions/{id}/files).
// sessionId is mock bookkeeping, stripped before a file reaches the client.
export interface StoredFile extends UploadedFileInfo {
  sessionId: string;
}

export function toFileDto(stored: StoredFile): UploadedFileInfo {
  const { sessionId: _sessionId, ...rest } = stored;
  return rest;
}

export const sessionFiles = createPersistedResource<StoredFile>('erd-cowork:session-files', []);

/** Byte-level multipart parser: request.formData() can't be used here because undici
 *  brand-checks File entries and rejects jsdom's File in tests. latin1 maps one char
 *  per byte, so part sizes stay exact. Only metadata is kept — the mock never stores
 *  file contents. */
async function parseMultipartFiles(
  request: Request,
): Promise<{ name: string; size: number; type: string }[]> {
  const contentType = request.headers.get('content-type') ?? '';
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!boundaryMatch) {
    return [];
  }
  const boundary = `--${(boundaryMatch[1] ?? boundaryMatch[2]).trim()}`;
  const text = new TextDecoder('latin1').decode(await request.arrayBuffer());
  const parts = text.split(boundary).slice(1, -1);
  const files: { name: string; size: number; type: string }[] = [];
  for (const part of parts) {
    const headerEnd = part.indexOf('\r\n\r\n');
    if (headerEnd === -1) {
      continue;
    }
    const headers = part.slice(0, headerEnd);
    const filenameMatch = headers.match(/filename="([^"]*)"/i);
    if (!filenameMatch) {
      continue;
    }
    const typeMatch = headers.match(/content-type:\s*([^\r\n]+)/i);
    // The part body runs from after the blank line to the \r\n preceding the
    // next boundary marker.
    const body = part.slice(headerEnd + 4, part.length - 2);
    files.push({ name: filenameMatch[1], size: body.length, type: (typeMatch?.[1] ?? '').trim() });
  }
  return files;
}

export const fileHandlers = [
  http.post('/api/sessions/:sessionId/files', async ({ params, request }) => {
    const sessionId = params.sessionId as string;
    const incoming = await parseMultipartFiles(request);
    if (incoming.length === 0) {
      return new HttpResponse(null, { status: 400 });
    }
    // Uploading upserts the session too — the backend has two write endpoints and both
    // create the session on first use (ADR-0005). Without this, attaching a file to a
    // draft leaves the detail endpoint 404ing.
    upsertSession(sessionId);
    const existingCount = sessionFiles.read().filter((f) => f.sessionId === sessionId).length;
    const created: StoredFile[] = incoming.map((file, index) => ({
      id: crypto.randomUUID(),
      sessionId,
      name: file.name,
      alias: `t${existingCount + index + 1}`,
      sizeBytes: file.size,
      type: file.type || 'text/csv',
      rowCount: null,
      expired: false,
    }));
    sessionFiles.write([...sessionFiles.read(), ...created]);
    return HttpResponse.json(created.map(toFileDto), { status: 201 });
  }),

  http.delete('/api/sessions/:sessionId/files/:fileId', ({ params }) => {
    const all = sessionFiles.read();
    sessionFiles.write(all.filter((file) => file.id !== params.fileId));
    return new HttpResponse(null, { status: 204 });
  }),
];
