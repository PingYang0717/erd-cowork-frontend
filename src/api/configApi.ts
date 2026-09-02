import { apiClient } from './apiClient';
import { asObject, type Contract } from './responseContract';

/** The limits the backend actually enforces. Published so the UI can state them rather
 *  than keep a second copy that drifts out of step with the server's. */
export interface AppConfig {
  /** Days a session's files are kept after its last activity. */
  retentionDays: number;
  maxFiles: number;
  maxSessionBytes: number;
  /** Keys are lowercase extensions, values byte limits. */
  singleFileLimits: Record<string, number>;
}

/** `retentionDays` is required — it goes verbatim into a sentence shown to the user
 *  (the composer's retention notice), where a missing value once read as "over
 *  undefined days". The rest are not read anywhere yet, so they fall back rather
 *  than brick the app; revisit each fallback when a screen starts reading it. */
const APP_CONFIG: Contract<AppConfig> = {
  label: 'the app configuration',
  fields: {
    retentionDays: { kind: 'number' },
    maxFiles: { kind: 'number', fallback: 0 },
    maxSessionBytes: { kind: 'number', fallback: 0 },
    singleFileLimits: { kind: 'object', fallback: {} },
  },
};

export const getConfig = () => apiClient.get('/config').then(asObject(APP_CONFIG));
