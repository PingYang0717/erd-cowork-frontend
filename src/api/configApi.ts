import { apiClient } from './apiClient';

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

export const getConfig = () => apiClient.get<AppConfig>('/config');
