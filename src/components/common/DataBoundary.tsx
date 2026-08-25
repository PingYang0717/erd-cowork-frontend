import React, { type ReactNode } from 'react';

import { ErrorBoundary } from './ErrorBoundary';
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
 */
const DataBoundary: React.FC<DataBoundaryProps> = ({ children, label }) => (
  <ErrorBoundary>
    <SuspenseLoader label={label}>{children}</SuspenseLoader>
  </ErrorBoundary>
);

export default DataBoundary;
