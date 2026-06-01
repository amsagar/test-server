import React, { useState } from 'react';
import CustomIcon from '@atoms/CustomIcon';
import MarkdownContent from '@molecules/MarkdownContent';
import { formatJson } from '@utils/formatJson';
import { isJsonPayload } from '@utils/isJsonPayload';
import type { UiToolCall } from '@interfaces/chat.interface';
import * as styles from '@styles/toolEventCard.module.scss';

export interface ToolEventCardProps {
  tool: UiToolCall;
}

const PayloadBlock: React.FC<{
  label: string;
  raw: string | null;
  running?: boolean;
}> = ({ label, raw, running }) => {
  if (running) {
    return (
      <>
        <div className={styles.label}>{label}</div>
        <div className={styles.running}>Running…</div>
      </>
    );
  }

  if (!raw?.trim()) {
    return (
      <>
        <div className={styles.label}>{label}</div>
        <div className={styles.empty}>—</div>
      </>
    );
  }

  if (isJsonPayload(raw)) {
    return (
      <>
        <div className={styles.label}>{label}</div>
        <pre className={styles.pre}>{formatJson(raw)}</pre>
      </>
    );
  }

  return (
    <>
      <div className={styles.label}>{label}</div>
      <div className={styles.md}>
        <MarkdownContent source={raw} compact />
      </div>
    </>
  );
};

const ToolEventCard: React.FC<ToolEventCardProps> = ({ tool }) => {
  const [open, setOpen] = useState(false);

  const statusIcon = tool.running ? (
    <CustomIcon name="loading" size={13} color="#0060c0" />
  ) : tool.error ? (
    <CustomIcon name="warning" size={13} color="#d4380d" />
  ) : (
    <CustomIcon name="check-circle" size={13} color="#16a34a" />
  );

  return (
    <div className={`${styles.card} ${tool.error ? styles.error : ''}`}>
      <div className={styles.head} onClick={() => setOpen((o) => !o)}>
        <span className={styles.status}>{statusIcon}</span>
        <span className={styles.name}>{tool.name}</span>
        <span className={styles.caret}>
          <CustomIcon name={open ? 'caret-down' : 'caret-right'} size={11} />
        </span>
      </div>
      {open && (
        <div className={styles.body}>
          <PayloadBlock label="Input" raw={tool.input} />
          <PayloadBlock
            label="Output"
            raw={tool.output}
            running={tool.running}
          />
        </div>
      )}
    </div>
  );
};

export default ToolEventCard;
