/** localStorage keys the app owns. Kept in one place so a key can be versioned (and an
 *  older shape left to reseed) without hunting through the code that reads it. The
 *  anonymous user id's key lives in api/apiClient.ts (cowork file parity). */
/** The user's connector choices — which sources they consider connected, plus any
 *  custom ones they added. A preference, not backend state: the backend has no
 *  connector endpoints this round, and a choice should survive a reload. */
export const CONNECTOR_PREFS_STORAGE_KEY = 'erd-cowork:connector-prefs';
