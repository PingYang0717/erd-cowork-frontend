/** Whether the optimistic user bubble (the message shown the instant it is sent, before
 *  the refetched history carries it) should still be on screen.
 *
 *  The discriminator is history *length*, not text: the bubble is suppressed once the
 *  history has grown past where it was when the message was sent — that growth is the
 *  refetch bringing the message home. Comparing the last history text instead breaks on
 *  a message sent twice in a row, where the previous identical message looks like the
 *  refetch already landing and the second bubble is wrongly suppressed (C-3).
 */
export const showOptimisticBubble = (historyLength: number, historyLengthAtSend: number): boolean => {
  return historyLength <= historyLengthAtSend;
};
