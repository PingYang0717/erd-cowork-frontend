import { beforeEach, describe, expect, it } from 'vitest';

import { type BrowserJsError, useRepairOfferStore } from './useRepairOfferStore';

const err: BrowserJsError[] = [{ message: 'boom', line: 1, col: 1 }];

const reset = () => {
  useRepairOfferStore.setState({ offer: null, queue: [], dismissed: [] });
};

describe('useRepairOfferStore', () => {
  beforeEach(reset);

  it('shows the first reported artifact as the current offer', () => {
    useRepairOfferStore.getState().report('a', err);
    expect(useRepairOfferStore.getState().offer?.artifactId).toBe('a');
  });

  it('ignores a second report for the same artifact', () => {
    const { report } = useRepairOfferStore.getState();
    report('a', err);
    report('a', err);
    expect(useRepairOfferStore.getState().queue).toHaveLength(0);
  });

  /** ADR-0015 §artifact-scoped-offers: a second broken artifact used to be dropped while the first offer was up, so
   *  it had no way to be repaired. It is queued and surfaces once the first is gone. */
  it('queues a second broken artifact and promotes it on resolve', () => {
    const s = useRepairOfferStore.getState();
    s.report('a', err);
    s.report('b', err);

    expect(useRepairOfferStore.getState().offer?.artifactId).toBe('a');
    expect(useRepairOfferStore.getState().queue.map((q) => q.artifactId)).toEqual(['b']);

    s.resolve('a');
    expect(useRepairOfferStore.getState().offer?.artifactId).toBe('b');
    expect(useRepairOfferStore.getState().queue).toHaveLength(0);
  });

  it('promotes the queued artifact on dismiss, and records the dismissal', () => {
    const s = useRepairOfferStore.getState();
    s.report('a', err);
    s.report('b', err);

    s.dismiss();
    expect(useRepairOfferStore.getState().offer?.artifactId).toBe('b');
    expect(useRepairOfferStore.getState().dismissed).toEqual(['a']);
  });

  it('never re-offers a dismissed artifact, even from the queue', () => {
    const s = useRepairOfferStore.getState();
    s.report('a', err);
    s.dismiss(); // a dismissed, nothing queued -> offer null
    s.report('a', err); // ignored: dismissed
    expect(useRepairOfferStore.getState().offer).toBeNull();
  });

  /** ADR-0015 §artifact-scoped-offers: a repair for A that lands after the user switched to C's offer must not write
   *  A's status onto C. Every artifact-scoped mutation checks the id. */
  it('ignores setStatus for an artifact that is not the current offer', () => {
    const s = useRepairOfferStore.getState();
    s.report('c', err);
    s.setStatus('a', 'failed'); // a is not the current offer
    expect(useRepairOfferStore.getState().offer).toEqual({
      artifactId: 'c',
      errors: err,
      status: 'pending',
    });
  });

  it('ignores resolve for an artifact that is not the current offer', () => {
    const s = useRepairOfferStore.getState();
    s.report('c', err);
    s.resolve('a'); // a is not the current offer
    expect(useRepairOfferStore.getState().offer?.artifactId).toBe('c');
  });

  it('reset drops the offer and the queue but keeps the dismissed list', () => {
    const s = useRepairOfferStore.getState();
    s.report('a', err);
    s.report('b', err);
    s.dismiss(); // a -> dismissed, b promoted
    s.reset();
    const state = useRepairOfferStore.getState();
    expect(state.offer).toBeNull();
    expect(state.queue).toHaveLength(0);
    expect(state.dismissed).toEqual(['a']);
  });
});
