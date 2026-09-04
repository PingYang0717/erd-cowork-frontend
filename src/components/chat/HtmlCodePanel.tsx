import React, { useEffect, useRef, useState } from 'react';
import { CodeOutlined, DownOutlined, UpOutlined } from '@ant-design/icons';

import { isCanceled, isNotFound } from '@/api/apiError';
import { getArtifactRawHtml } from '@/api/artifactApi';
import { useTranslations } from '@/i18n/useTranslations';

import styles from './HtmlCodePanel.module.css';

interface HtmlCodePanelProps {
  /** The artifact's HTML as the agent writes it. Wins over `artifactId` when present:
   *  the live text IS the source, and it is more current than anything fetchable. */
  code?: string;
  /** Fetches the artifact's source on first expand — the read-back path for a turn
   *  whose CODE events are long gone. */
  artifactId?: string;
  /** Keeps the newest line in view while the run is still producing. */
  autoScroll?: boolean;
}

/** What the fetch came back with, for one artifact. Absent means "not answered yet",
 *  which is the only thing loading has ever meant — so loading is derived, not stored. */
interface FetchOutcome {
  artifactId: string;
  /** `missing` records whether the backend said 404 — "there is no source" — as opposed
   *  to failing to answer. The two get different sentences: claiming no source exists on
   *  the strength of a 500 states something this client cannot know (the same rule the
   *  Artifact panes follow for their documents). */
  result: { status: 'ok'; code: string } | { status: 'error'; missing: boolean };
}

/** The artifact's HTML, collapsed by default. Live during a run, fetched on demand
 *  afterwards — the reader does not care which, so both wear the same panel. The row
 *  itself is cowork's: code glyph on the left, chevron on the right, and the label
 *  says whether the source is still being written (ADR-0002). */
const HtmlCodePanel: React.FC<HtmlCodePanelProps> = ({ code, artifactId, autoScroll = false }) => {
  const t = useTranslations();
  const [isExpanded, setIsExpanded] = useState(false);
  const [outcome, setOutcome] = useState<FetchOutcome | null>(null);
  const codeRef = useRef<HTMLPreElement>(null);

  const hasLiveCode = code !== undefined && code !== '';
  // Both being undefined is not a match: a panel with no artifact has nothing fetched.
  const resolved =
    outcome !== null && artifactId !== undefined && outcome.artifactId === artifactId ? outcome.result : null;

  // Lazy: nothing is fetched until the reader asks to see it, and the answer is kept per
  // artifact so re-expanding does not re-fetch while switching versions does.
  useEffect(() => {
    if (!isExpanded || hasLiveCode || artifactId === undefined || resolved !== null) {
      return undefined;
    }
    const controller = new AbortController();
    getArtifactRawHtml(artifactId, controller.signal)
      .then((html) => setOutcome({ artifactId, result: { status: 'ok', code: html } }))
      .catch((error: unknown) => {
        // The abort is ours (collapse, unmount, version switch) — not a failure to report.
        if (isCanceled(error)) {
          return;
        }
        setOutcome({ artifactId, result: { status: 'error', missing: isNotFound(error) } });
      });
    return () => controller.abort();
  }, [isExpanded, hasLiveCode, artifactId, resolved]);

  useEffect(() => {
    const element = codeRef.current;
    if (autoScroll && element) {
      element.scrollTop = element.scrollHeight;
    }
  }, [code, autoScroll, isExpanded]);

  const shownCode = hasLiveCode ? code : resolved?.status === 'ok' ? resolved.code : null;
  const isLoading = !hasLiveCode && artifactId !== undefined && resolved === null;
  // cowork's three labels: writing, written this run, fetchable from a past turn.
  const label = hasLiveCode ? (autoScroll ? t.chat.htmlLive : t.chat.htmlLabel) : t.chat.viewHtml;

  return (
    <div className={styles.panel}>
      <button
        type="button"
        className={styles.toggle}
        aria-expanded={isExpanded}
        onClick={() => setIsExpanded((expanded) => !expanded)}
      >
        <CodeOutlined aria-hidden className={styles.toggleIcon} />
        <span className={styles.toggleLabel}>
          {/* The mockup's literal glyph prefix, kept out of the accessible name. */}
          <span aria-hidden>{'</> '}</span>
          {label}
        </span>
        {isExpanded ? (
          <UpOutlined aria-hidden className={styles.chevron} />
        ) : (
          <DownOutlined aria-hidden className={styles.chevron} />
        )}
      </button>
      {isExpanded && (
        <div className={styles.body}>
          {isLoading && <p className={styles.note}>{t.chat.loading}</p>}
          {resolved?.status === 'error' && (
            <p className={styles.note}>{resolved.missing ? t.chat.noSource : t.chat.sourceLoadFailed}</p>
          )}
          {shownCode !== null && (
            <pre ref={codeRef} className={styles.code}>
              {shownCode}
            </pre>
          )}
        </div>
      )}
    </div>
  );
};

export default HtmlCodePanel;
