/** A refusal the backend reported before the stream opened, carrying the status and its
 *  own code so callers can say something better than "request failed".
 *
 *  Its own module rather than beside the `fetch` that throws it: `apiError` and
 *  `accessDenied` both have to recognise this, and `agentApi` already imports
 *  `accessDenied` — declaring it in `agentApi` would have the three importing in a circle.
 *
 *  The status is kept as well as the code because the two answer different questions. The
 *  code decides the sentence; the status decides whether there is a sentence to say at all
 *  — a 403 is the account being refused, and the gate has already said so at full size. */
export class AgentStreamHttpError extends Error {
  readonly status: number;

  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'AgentStreamHttpError';
    this.status = status;
    this.code = code;
  }
}
