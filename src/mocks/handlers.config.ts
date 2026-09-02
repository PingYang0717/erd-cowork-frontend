import { http, HttpResponse } from 'msw';

import { BYTES_PER_GB, BYTES_PER_MB } from '@/constants/bytes';

// The limits the backend enforces, mirrored here so the UI reads one source in both
// transports. Values match cowork master's defaults.
export const configHandlers = [
  http.get('/api/config', () =>
    HttpResponse.json({
      retentionDays: 30,
      maxFiles: 5,
      maxSessionBytes: 5 * BYTES_PER_GB,
      singleFileLimits: {
        csv: 2 * BYTES_PER_GB,
        xlsx: 200 * BYTES_PER_MB,
        xls: 200 * BYTES_PER_MB,
      },
    }),
  ),
];
