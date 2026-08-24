import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import styles from './ReplyText.module.css';

/** An agent reply. Rendered as Markdown because that is what the agent writes — lists,
 *  emphasis and tables all arrive as source text. Also used mid-stream, where the
 *  Markdown is still half-arrived: the renderer treats an unterminated construct as
 *  literal text rather than failing, so a partial reply degrades instead of breaking. */
export function ReplyText({ text }: { text: string }) {
  return (
    <div className={styles.reply}>
      <Markdown remarkPlugins={[remarkGfm]}>{text}</Markdown>
    </div>
  );
}
