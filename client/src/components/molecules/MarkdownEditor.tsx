import React, { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import CustomTextarea from '@atoms/CustomTextarea';
import * as styles from '@styles/markdownEditor.module.scss';

/**
 * Pre-process source so the preview renders the way authors expect:
 *  - Convert Unicode bullets/middots (•, ·, ●, ‣) that appear after
 *    leading whitespace into standard markdown list dashes, so nested lists
 *    are recognised by remark instead of being absorbed into the parent
 *    list item as inline text.
 *  - Collapse Windows-style CRLF.
 */
const normalizeMarkdown = (input: string): string =>
  input
    .replace(/\r\n?/g, '\n')
    .replace(/^([ \t]*)[•·●‣]\s+/gm, '$1- ');

export interface MarkdownEditorProps {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  /** min textarea rows */
  minRows?: number;
  /** max textarea rows before scrolling */
  maxRows?: number;
  /** Optional className for the outer wrapper */
  className?: string;
  /** Optional aria-label for the textarea */
  ariaLabel?: string;
}

type Mode = 'edit' | 'preview';

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value,
  onChange,
  placeholder,
  minRows = 12,
  maxRows = 28,
  className,
  ariaLabel,
}) => {
  const [mode, setMode] = useState<Mode>('edit');
  const previewSource = useMemo(() => normalizeMarkdown(value), [value]);

  return (
    <div className={[styles.wrap, className].filter(Boolean).join(' ')}>
      <div className={styles.toolbar}>
        <div className={styles.tabs} role="tablist" aria-label="Editor mode">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'edit'}
            className={`${styles.tab} ${mode === 'edit' ? styles.tabActive : ''}`}
            onClick={() => setMode('edit')}
          >
            Edit
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'preview'}
            className={`${styles.tab} ${mode === 'preview' ? styles.tabActive : ''}`}
            onClick={() => setMode('preview')}
          >
            Preview
          </button>
        </div>
        <span className={styles.hint}>Markdown</span>
      </div>

      {mode === 'edit' ? (
        <CustomTextarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoSize={{ minRows, maxRows }}
          aria-label={ariaLabel}
          variant="borderless"
          fullWidth
          className={styles.textarea}
        />
      ) : value.trim() ? (
        <div className={styles.preview}>
          <ReactMarkdown>{previewSource}</ReactMarkdown>
        </div>
      ) : (
        <div className={styles.previewEmpty}>Nothing to preview yet.</div>
      )}
    </div>
  );
};

export default MarkdownEditor;
