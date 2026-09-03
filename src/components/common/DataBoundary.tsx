import { QueryErrorResetBoundary } from '@tanstack/react-query';
import React, { type ReactNode } from 'react';

import ErrorBoundary from './ErrorBoundary';
import SuspenseLoader from './SuspenseLoader';

interface DataBoundaryProps {
  children: ReactNode;
  /** What this region is, for the pending and failed states — e.g. "Sessions". */
  label: string;
}

/** The two halves a `useSuspenseQuery` needs: something to show while it is pending, and
 *  something to show when it throws.
 *
 *  One goes around each pane rather than once around the app, so a failing Artifact does
 *  not blank the thread beside it — and so a test that renders a single pane still gets
 *  the boundaries that pane depends on.
 *
 *  `QueryErrorResetBoundary` is what makes the error card's Retry real. A failed
 *  suspense query keeps its error in the cache, and a remount alone re-throws it
 *  immediately — the card flashed back and nothing was refetched. The reset clears
 *  that state first, so the remounted query suspends and actually asks again. */
const DataBoundary: React.FC<DataBoundaryProps> = ({ children, label }) => (
  <QueryErrorResetBoundary>
    {({ reset }) => (
      <ErrorBoundary onRetry={reset}>
        <SuspenseLoader label={label}>{children}</SuspenseLoader>
      </ErrorBoundary>
    )}
  </QueryErrorResetBoundary>
);

export default DataBoundary;
