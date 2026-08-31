import { http, HttpResponse } from 'msw';

// The limits the backend enforces, mirrored here so the UI reads one source in both
// transports. Values match cowork master's defaults.
export const configHandlers = [
  http.get('/api/config', () =>
    HttpResponse.json({
      retentionDays: 30,
      maxFiles: 5,
      maxSessionBytes: 5 * 1024 * 1024 * 1024,
      singleFileLimits: {
        csv: 2 * 1024 * 1024 * 1024,
        xlsx: 200 * 1024 * 1024,
        xls: 200 * 1024 * 1024,
      },
    }),
  ),
];
