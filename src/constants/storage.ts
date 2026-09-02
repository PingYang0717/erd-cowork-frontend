/** localStorage keys the app owns. Kept in one place so a key can be versioned (and an
 *  older shape left to reseed) without hunting through the code that reads it.
 *
 *  Every key carries the `erd-cowork:` prefix. Cowork is one App inside the eRD
 *  Workspace, so the origin is shared — an unprefixed name like `theme-storage` is one
 *  another App could pick too, and whoever wrote last would win. The zustand stores used
 *  to name their own keys inline and did exactly that; they read from here now.
 *
 *  The anonymous user id's key is the one exception, and lives in api/apiClient.ts for
 *  cowork file parity. */
/** The user's connector choices — which sources they consider connected, plus any
 *  custom ones they added. A preference, not backend state: the backend has no
 *  connector endpoints this round, and a choice should survive a reload. */
export const CONNECTOR_PREFS_STORAGE_KEY = 'erd-cowork:connector-prefs';

/** Dark mode. A preference of this browser's user, like the language beside it. */
export const THEME_STORAGE_KEY = 'erd-cowork:theme';

/** Which language the interface speaks. */
export const LANGUAGE_STORAGE_KEY = 'erd-cowork:language';
