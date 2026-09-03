import { Component, type ErrorInfo, type ReactNode } from 'react';

import { useTranslations } from '@/i18n/useTranslations';
import { describeLoadError } from '@/utils/describeLoadError';

import styles from './ErrorBoundary.module.css';
import SettingsMenu from './SettingsMenu';

interface Props {
  children: ReactNode;
  /** Shown instead of the default panel. Receives a retry that remounts the subtree. */
  fallback?: (error: Error, retry: () => void) => ReactNode;
  /** Runs before the remount a retry causes. DataBoundary passes TanStack's reset
   *  through here: without it, a suspense query re-throws its CACHED error the moment
   *  the subtree remounts — the card flashed back instantly and Retry recovered
   *  nothing, which a probe against a failing endpoint confirmed. */
  onRetry?: () => void;
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
    // Order matters: reset the query error state first, then remount — remounting
    // first re-subscribes to a query still in error and re-throws it.
    this.props.onRetry?.();
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

    return <ErrorPanel error={error} onRetry={this.retry} />;
  }
}

/** The default panel, as a function component so it can subscribe to the language.
 *
 *  A class cannot: reading the copy from `getTranslations()` inside `render` gave the
 *  right words on first paint and then kept them — switching language while an error was
 *  on screen left the panel in the old one until something remounted it. */
const ErrorPanel: React.FC<{ error: Error; onRetry: () => void }> = ({ error, onRetry }) => {
  const t = useTranslations();
  const { heading, detail } = describeLoadError(error, t.errors);

  return (
    <div role="alert" className={styles.panel}>
      <p className={styles.heading}>{heading}</p>
      <p className={styles.message}>{detail}</p>
      <div className={styles.actions}>
        <button type="button" className={styles.retry} onClick={onRetry}>
          {t.common.retry}
        </button>
        {/* The language exit rides the card. A failure card may be the only thing
            left on screen (the full-page view fails whole), and its words are in a
            language the reader may not read — settings is where the language lives,
            so it must survive every failure that hides the rail's own entry. */}
        <SettingsMenu variant="tile" />
      </div>
    </div>
  );
};

export default ErrorBoundary;
