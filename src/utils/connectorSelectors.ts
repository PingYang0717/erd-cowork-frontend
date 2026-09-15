import type { Connector } from '@/types/api';

export interface SessionConnectors {
  /** Every data source this user may reach, as the catalogue serves it. */
  catalogue: Connector[];
  /** Of those, the ids this conversation is drawing on. */
  attachedIds: string[];
}

/** The catalogue entries this conversation is drawing on.
 *
 *  An intersection rather than a lookup per id: a session can name a connector the
 *  catalogue no longer serves — access revoked between the two reads — and that id has
 *  nothing to render. Counting it would tell the user they are using a source they
 *  cannot see in the list. */
export const attachedConnectors = ({ catalogue, attachedIds }: SessionConnectors): Connector[] =>
  catalogue.filter((connector) => attachedIds.includes(connector.id));
