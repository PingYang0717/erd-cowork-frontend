import { Component, type ErrorInfo, type ReactNode } from 'react';

import { getTranslations } from '@/i18n/useTranslations';
import { describeLoadError } from '@/utils/describeLoadError';

import styles from './ErrorBoundary.module.css';

interface Props {
  children: ReactNode;
  /** Shown instead of the default panel. Receives a retry that remounts the subtree. */
  fallback?: (error: Error, retry: () => void) => ReactNode;
}

interface State {
  error: Error | null;
}

/** Catches render-time failures, including the ones `useSuspenseQuery` throws when a
 *  fetch fails — a suspense query has no `isError` branch to check, so this is the only
 *  place that error can surface.
 *
 *  A class, unavoidably: React exposes no hook equivalent of `componentDidCatch`. It is
 *  the one component in the codebase that is not a `React.FC`.
 */
class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[eRD Cowork] uncaught render error', error, info.componentStack);
  }

  private readonly retry = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    const { children, fallback } = this.props;

    if (error === null) {
      return children;
    }

    if (fallback) {
      return fallback(error, this.retry);
    }

    const { heading, detail } = describeLoadError(error);

    return (
      <div role="alert" className={styles.panel}>
        <p className={styles.heading}>{heading}</p>
        <p className={styles.message}>{detail}</p>
        <button type="button" className={styles.retry} onClick={this.retry}>
          {getTranslations().common.retry}
        </button>
      </div>
    );
  }
}

export default ErrorBoundary;
