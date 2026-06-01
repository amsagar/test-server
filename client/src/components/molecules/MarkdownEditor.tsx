import React, { useState } from 'react';
import CustomTextarea from '@atoms/CustomTextarea';
import MarkdownContent from '@molecules/MarkdownContent';
import * as styles from '@styles/markdownEditor.module.scss';

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
          <MarkdownContent source={value} />
        </div>
      ) : (
        <div className={styles.previewEmpty}>Nothing to preview yet.</div>
      )}
    </div>
  );
};

export default MarkdownEditor;
