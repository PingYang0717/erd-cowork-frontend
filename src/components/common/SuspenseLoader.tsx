import { LoadingOutlined } from '@ant-design/icons';
import React, { type ReactNode, Suspense } from 'react';

import styles from './SuspenseLoader.module.css';

interface SuspenseLoaderProps {
  children: ReactNode;
  /** What the pending region is, for screen readers — e.g. "Sessions". */
  label: string;
}

/** The loading half of a suspense boundary. Pair it with an `ErrorBoundary` for the
 *  failure half: between them, a `useSuspenseQuery` needs no `isLoading` / `isError`
 *  branch at the call site. */
const SuspenseLoader: React.FC<SuspenseLoaderProps> = ({ children, label }) => (
  <Suspense
    fallback={
      <div role="status" aria-label={label} className={styles.pending}>
        <LoadingOutlined aria-hidden spin />
      </div>
    }
  >
    {children}
  </Suspense>
);

export default SuspenseLoader;
