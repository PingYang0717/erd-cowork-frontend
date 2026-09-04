export interface InternalBootstrap {
  initialize: () => Promise<void>;
}

// The internal bootstrap seam: internal.impl.ts exists only in the internal environment.
// import.meta.glob returns an empty object for a missing file rather than a build error —
// that is precisely why this seam holds up in the default environment.
const impls = import.meta.glob<InternalBootstrap>('./internal.impl.ts');

/** Startup initialisation for the internal environment (SSO deciding X-User-Id, for
 *  one); a no-op in the default environment, where the implementation file is absent.
 *  The loaders parameter exists for test injection only — the real path always uses the
 *  glob result above. */
export const initInternalRuntime = async (
  loaders: Record<string, () => Promise<InternalBootstrap>> = impls
): Promise<void> => {
  const load = loaders['./internal.impl.ts'];
  if (!load) return;
  await (await load()).initialize();
};
