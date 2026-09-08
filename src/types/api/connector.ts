/** A data source the agent may read from.
 *
 *  Two dimensions, deliberately kept apart. `enabled` is a fact about the connector
 *  itself: whether it can be chosen at all. Whether a given conversation is drawing on it
 *  is a fact about that conversation, and lives on the session (`SessionDetail.connectors`)
 *  — the same source can be attached to one conversation and not another, so nothing here
 *  could answer it. */
export interface Connector {
  /** The Mongo UUID. Every id the frontend sends or receives is this one; the backend's
   *  own `connectorId` serves its purposes and never reaches here. */
  id: string;
  /** The wire's own name for the field, kept verbatim (ADR-0003). */
  connectorName: string;
  description: string;
  /** The classification shown beside the name — Process, Test, Lot. Also searched. */
  type: string;
  /** Whether it can be chosen. False covers everything that makes it unusable right now:
   *  expired credentials, a connection that is down, an administrator switching it off.
   *  The reason is not distinguished — the client has nothing different to do about any
   *  of them, and the backend is the only party that knows which it was. */
  enabled: boolean;
}
