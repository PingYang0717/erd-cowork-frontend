import React from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownBodyProps {
  text: string;
}

/** The actual Markdown renderer, split out so `ReplyText` can `React.lazy` it: the
 *  remark/micromark stack is ~17% of the whole bundle and nothing outside an AI reply
 *  ever needs it. This module is the code-splitting boundary — do not import it
 *  statically from anywhere, or the split silently collapses back into the main chunk. */
const MarkdownBody: React.FC<MarkdownBodyProps> = ({ text }) => {
  return <Markdown remarkPlugins={[remarkGfm]}>{text}</Markdown>;
};

export default MarkdownBody;
