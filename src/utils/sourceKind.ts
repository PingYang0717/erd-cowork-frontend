import type { SessionDetail } from '@/types/api';

/** Which kind of data source a conversation draws on (CONTEXT.md, 來源種類): its
 *  Connectors or its uploaded files, never both, and `null` before either. */
export type SourceKind = 'files' | 'connectors';

type SourceKindInput = Pick<SessionDetail, 'connectors'> & { files: readonly unknown[] };

/** The one place the kind is worked out. Derived from what the session holds for now;
 *  the backend is adding a `source` field that fixes the kind the first time either is
 *  attached and keeps it after they are cleared. When it ships, this reads the field and
 *  nothing else changes — every entry and panel asks here.
 *
 *  Until then, clearing every source reads as "undecided" again, which the rule says it
 *  is not. Known, and accepted for the interim: the frontend cannot remember a kind the
 *  backend has not recorded.
 *
 *  A conversation from before the rule, holding both, reads as `connectors`: the files
 *  clear from their own chips whatever this says, while the Connectors entry is the only
 *  way to its sources, so that is the one to keep open. */
export const sourceKindOf = ({ files, connectors }: SourceKindInput): SourceKind | null => {
  if (connectors.length > 0) {
    return 'connectors';
  }
  if (files.length > 0) {
    return 'files';
  }
  return null;
};
