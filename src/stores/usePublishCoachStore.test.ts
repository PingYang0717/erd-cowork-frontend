import { beforeEach, describe, expect, it } from 'vitest';

import { usePublishCoachStore } from './usePublishCoachStore';

/** Two lifetimes: the coach ends when the user goes to the Gallery or waves it off; which
 *  Artifact was published outlives that, so the Gallery can still frame it once. */
describe('usePublishCoachStore', () => {
  beforeEach(() => {
    usePublishCoachStore.setState(usePublishCoachStore.getInitialState());
  });

  it('starts coaching for the Artifact that was published', () => {
    usePublishCoachStore.getState().start('a-1');

    expect(usePublishCoachStore.getState()).toMatchObject({ isActive: true, publishedArtifactId: 'a-1' });
  });

  it('dismiss ends the coach but keeps which Artifact was published for the Gallery', () => {
    usePublishCoachStore.getState().start('a-1');
    usePublishCoachStore.getState().dismiss();

    expect(usePublishCoachStore.getState()).toMatchObject({ isActive: false, publishedArtifactId: 'a-1' });
  });

  it('settle forgets the Artifact once the Gallery has framed it', () => {
    usePublishCoachStore.getState().start('a-1');
    usePublishCoachStore.getState().settle();

    expect(usePublishCoachStore.getState().publishedArtifactId).toBeNull();
  });
});
