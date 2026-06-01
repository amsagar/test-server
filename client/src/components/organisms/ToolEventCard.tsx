import React, { useState } from 'react';
import CustomIcon from '@atoms/CustomIcon';
import { formatJson } from '@utils/formatJson';
import type { UiToolCall } from '@interfaces/chat.interface';
import * as styles from '@styles/toolEventCard.module.scss';

export interface ToolEventCardProps {
  tool: UiToolCall;
}

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
          <div className={styles.label}>Input</div>
          <pre className={styles.pre}>{formatJson(tool.input)}</pre>
          <div className={styles.label}>Output</div>
          <pre className={styles.pre}>
            {tool.running ? 'Running...' : formatJson(tool.output)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default ToolEventCard;
