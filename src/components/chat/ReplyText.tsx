import React, { Suspense } from 'react';

import styles from './ReplyText.module.css';

// Lazy: the remark/micromark stack is heavyweight and only ever renders AI replies —
// architecture.md's「笨重的第三方元件」case. While the chunk loads, the raw markdown
// source shows as plain text: for the fraction of a second involved, unstyled text
// beats a blank, and a reply is asynchronous to begin with.
const MarkdownBody = React.lazy(() => import('./MarkdownBody'));

interface ReplyTextProps {
  text: string;
}

/** An agent reply. Rendered as Markdown because that is what the agent writes — lists,
 *  emphasis and tables all arrive as source text. Also used mid-stream, where the
 *  Markdown is still half-arrived: the renderer treats an unterminated construct as
 *  literal text rather than failing, so a partial reply degrades instead of breaking. */
const ReplyText: React.FC<ReplyTextProps> = ({ text }) => {
  return (
    <div className={styles.reply}>
      <Suspense fallback={<span>{text}</span>}>
        <MarkdownBody text={text} />
      </Suspense>
    </div>
  );
};

// Memoised so the urgent (per-token) render of a streaming bubble, whose deferred text
// has not moved yet, skips the Markdown parse entirely — the deferral above only helps
// if the unchanged-text render is actually free.
export default React.memo(ReplyText);
