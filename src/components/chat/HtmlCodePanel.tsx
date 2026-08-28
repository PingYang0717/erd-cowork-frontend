import { CodeOutlined, DownOutlined, UpOutlined } from '@ant-design/icons';
import React, { useEffect, useRef, useState } from 'react';

import { artifactApi } from '@/api/artifactApi';

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
  result: { status: 'ok'; code: string } | { status: 'error' };
}

/** The artifact's HTML, collapsed by default. Live during a run, fetched on demand
 *  afterwards — the reader does not care which, so both wear the same panel. The row
 *  itself is cowork's: code glyph on the left, chevron on the right, and the label
 *  says whether the source is still being written (ADR-0002). */
const HtmlCodePanel: React.FC<HtmlCodePanelProps> = ({ code, artifactId, autoScroll = false }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [outcome, setOutcome] = useState<FetchOutcome | null>(null);
  const codeRef = useRef<HTMLPreElement>(null);

  const hasLiveCode = code !== undefined && code !== '';
  // Both being undefined is not a match: a panel with no artifact has nothing fetched.
  const resolved =
    outcome !== null && artifactId !== undefined && outcome.artifactId === artifactId
      ? outcome.result
      : null;

  // Lazy: nothing is fetched until the reader asks to see it, and the answer is kept per
  // artifact so re-expanding does not re-fetch while switching versions does.
  useEffect(() => {
    if (!isExpanded || hasLiveCode || artifactId === undefined || resolved !== null) {
      return undefined;
    }
    const controller = new AbortController();
    artifactApi
      .getRawHtml(artifactId, controller.signal)
      .then((html) => setOutcome({ artifactId, result: { status: 'ok', code: html } }))
      .catch((error: unknown) => {
        // The abort is ours (collapse, unmount, version switch) — not a failure to report.
        if (error instanceof Error && error.name === 'CanceledError') {
          return;
        }
        setOutcome({ artifactId, result: { status: 'error' } });
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
  const label = hasLiveCode ? (autoScroll ? '產生中的 HTML' : 'HTML') : '查看 HTML';

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
          {isLoading && <p className={styles.note}>載入中…</p>}
          {resolved?.status === 'error' && (
            <p className={styles.note}>此版本無原始碼可檢視（無法載入）</p>
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
