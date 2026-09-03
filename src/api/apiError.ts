/** One place that knows what a failed request looks like on each of the three
 *  transports this app uses — axios, raw `fetch` (the agent stream), and the
 *  backend's own `{ code, message }` body riding either.
 *
 *  Before this, the same questions were answered in six places to different
 *  standards: `describeLoadError` asked axios directly, `useArtifactRepair` dug
 *  `response.data.code` out by hand, and "was this cancelled?" was spelled
 *  `'CanceledError'` in one file and `'AbortError'` in another — the same fact,
 *  named per-transport, each caller knowing only its own. */
import axios from 'axios';

import { AgentStreamHttpError } from '@/api/agentApi';

/** Nothing came back at all: the backend is not answering (or the request never
 *  left). Note a cancelled axios request also has no response — callers that care
 *  about the difference check `isCanceled` first. */
export const isOffline = (error: unknown): boolean =>
  axios.isAxiosError(error) && error.response === undefined;

/** By `name` rather than `instanceof Error`: a fetch abort arrives as a
 *  `DOMException`, which fails `instanceof` across realms (jsdom in tests, a frame's
 *  window in the browser) while its name stays truthful in all of them. */
const errorName = (error: unknown): string | null =>
  typeof error === 'object' &&
  error !== null &&
  'name' in error &&
  typeof (error as { name: unknown }).name === 'string'
    ? (error as { name: string }).name
    : null;

/** The request was cancelled by this app — an unmount, a collapse, a newer
 *  keystroke. Covers axios (`CanceledError`) and fetch (`AbortError`) spellings,
 *  so no caller has to know which transport it rode. Never a failure to report. */
export const isCanceled = (error: unknown): boolean =>
  axios.isCancel(error) ||
  errorName(error) === 'AbortError' ||
  errorName(error) === 'CanceledError';

/** Whether the backend answered "this is not here" as opposed to failing to answer.
 *
 *  Only a 404 says the thing is gone. A 500, a timeout or an unreachable backend say
 *  nothing about whether it exists — telling the reader it was deleted on the strength
 *  of those is stating something the client cannot know, and it is the kind of claim
 *  someone acts on by giving up looking for it. */
export const isNotFound = (error: unknown): boolean => httpStatus(error) === 404;

/** The HTTP status the backend answered with, or null when there was no answer. */
export const httpStatus = (error: unknown): number | null =>
  axios.isAxiosError(error) && error.response !== undefined ? error.response.status : null;

/** The backend's own error code (`FILES_EXPIRED` and friends), wherever it rode. */
export const errorCode = (error: unknown): string | null => {
  if (error instanceof AgentStreamHttpError) {
    return error.code;
  }
  if (axios.isAxiosError(error)) {
    const code = (error.response?.data as { code?: unknown } | undefined)?.code;
    return typeof code === 'string' ? code : null;
  }
  return null;
};

/** The backend's own message, when it sent one. The backend's words win over
 *  anything this client would compose — it knows why it refused. */
export const errorMessage = (error: unknown): string | null => {
  if (error instanceof AgentStreamHttpError) {
    return error.message;
  }
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as { message?: unknown } | undefined)?.message;
    return typeof message === 'string' && message !== '' ? message : null;
  }
  return null;
};
