import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { normalizeMarkdown } from '@utils/normalizeMarkdown';
import * as styles from '@styles/markdownContent.module.scss';

export interface MarkdownContentProps {
  source: string;
  /** Tighter typography for tool cards / side panels */
  compact?: boolean;
  className?: string;
}

const MarkdownContent: React.FC<MarkdownContentProps> = ({
  source,
  compact,
  className,
}) => {
  const prepared = useMemo(() => normalizeMarkdown(source), [source]);

  return (
    <div
      className={[
        styles.prose,
        compact ? styles.proseCompact : undefined,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{prepared}</ReactMarkdown>
    </div>
  );
};

export default MarkdownContent;
