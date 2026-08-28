/** Must be imported before any app module. Mock fixtures capture `currentUser.id` at
 *  module load, and `getUserId` re-reads localStorage on every call (cowork parity,
 *  ADR-0007 — no in-memory cache). Seeding the id here, ahead of the mocks' module
 *  graph, keeps every ownership check (isOwn, pin, publish) on one stable identity. */
export const TEST_USER_ID = 'test-user-erd';

localStorage.setItem('erd_user_id', TEST_USER_ID);
