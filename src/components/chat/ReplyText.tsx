import React from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import styles from './ReplyText.module.css';

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
      <Markdown remarkPlugins={[remarkGfm]}>{text}</Markdown>
    </div>
  );
};

// Memoised so the urgent (per-token) render of a streaming bubble, whose deferred text
// has not moved yet, skips the Markdown parse entirely — the deferral above only helps
// if the unchanged-text render is actually free.
export default React.memo(ReplyText);
