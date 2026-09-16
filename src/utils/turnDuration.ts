import type { Message } from '@/types/api';

/** How long a settled turn took, read off the history: the reply's `createdAt` less the
 *  `createdAt` of the question it answered — the nearest USER message above it.
 *
 *  The backend keeps no duration; it keeps the two timestamps, and the AI row is written
 *  when the run ends, so their difference is the run. That is what lets a turn show its
 *  cost after a reload or in an older conversation, not only for the run this tab just
 *  watched. Null when either stamp is missing or unparseable, or when the difference is
 *  not positive — a mock that stamps both rows alike must not claim a run took 0s. */
export const turnDurationMs = (messages: readonly Message[], index: number): number | null => {
  const reply = messages[index];
  if (reply === undefined || reply.sender !== 'AI') {
    return null;
  }
  let question: Message | undefined;
  for (let i = index - 1; i >= 0; i -= 1) {
    if (messages[i].sender === 'USER') {
      question = messages[i];
      break;
    }
  }
  if (question === undefined) {
    return null;
  }
  const ms = Date.parse(reply.createdAt) - Date.parse(question.createdAt);
  return Number.isFinite(ms) && ms > 0 ? ms : null;
};
