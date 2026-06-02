import React, { useEffect, useMemo, useState } from 'react';
import CustomIcon from '@atoms/CustomIcon';
import ToolEventCard from './ToolEventCard';
import type { UiToolCall } from '@interfaces/chat.interface';
import * as styles from '@styles/toolEventCard.module.scss';

export interface ToolEventsGroupProps {
  tools: UiToolCall[];
  /** Expand the group while the assistant is still running tools on this turn. */
  activeTurn?: boolean;
}

const groupSummary = (tools: UiToolCall[]): string => {
  const n = tools.length;
  if (n === 0) return '';
  return n === 1 ? '1 step' : `${n} steps`;
};

const ToolEventsGroup: React.FC<ToolEventsGroupProps> = ({
  tools,
  activeTurn,
}) => {
  const anyRunning = tools.some((t) => t.running);
  const anyError = tools.some((t) => t.error);

  const [groupOpen, setGroupOpen] = useState(activeTurn || anyRunning);

  useEffect(() => {
    if (anyRunning || activeTurn) {
      setGroupOpen(true);
    }
  }, [anyRunning, activeTurn]);

  const groupLabel = useMemo(() => {
    if (anyRunning) return 'Working…';
    if (anyError) return 'Completed with errors';
    return 'Completed';
  }, [anyRunning, anyError]);

  const groupIcon = anyRunning ? (
    <CustomIcon name="loading" size={14} color="#0060c0" />
  ) : anyError ? (
    <CustomIcon name="warning" size={14} color="#d4380d" />
  ) : (
    <CustomIcon name="check-circle" size={14} color="#16a34a" />
  );

  if (tools.length === 0) {
    return null;
  }

  return (
    <div className={styles.group}>
      <button
        type="button"
        className={styles.groupHead}
        onClick={() => setGroupOpen((o) => !o)}
        aria-expanded={groupOpen}
      >
        <span className={styles.groupStatus}>{groupIcon}</span>
        <span className={styles.groupTitle}>
          <span className={styles.groupLabel}>{groupLabel}</span>
          <span className={styles.groupMeta}>{groupSummary(tools)}</span>
        </span>
        <span className={styles.caret}>
          <CustomIcon
            name={groupOpen ? 'caret-down' : 'caret-right'}
            size={11}
          />
        </span>
      </button>

      {groupOpen && (
        <div className={styles.groupBody}>
          <div className={styles.groupSteps}>
            {tools.map((t) => (
              <ToolEventCard key={t.id} tool={t} nested />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ToolEventsGroup;
