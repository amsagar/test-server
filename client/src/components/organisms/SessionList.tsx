import React, { useMemo } from 'react';
import SessionRow from '@molecules/SessionRow';
import { groupSessionsByDate } from '@utils/groupSessionsByDate';
import type { ChatSessionDto } from '@interfaces/chat.interface';
import * as styles from '@styles/chatSidebar.module.scss';

export interface SessionListProps {
  sessions: ChatSessionDto[];
  currentId: string | null;
  showArchived: boolean;
  onOpen: (id: string) => void;
  onRename: (id: string, title: string) => void | Promise<void>;
  onToggleArchive: (
    id: string,
    archived: boolean
  ) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
}

const SessionList: React.FC<SessionListProps> = ({
  sessions,
  currentId,
  showArchived,
  onOpen,
  onRename,
  onToggleArchive,
  onDelete,
}) => {
  const groups = useMemo(() => groupSessionsByDate(sessions), [sessions]);

  if (sessions.length === 0) {
    return (
      <div className={styles.sessionList}>
        <div className={styles.emptyList}>
          No {showArchived ? 'archived' : 'recent'} chats.
          <br />
          Start a new one to get going.
        </div>
      </div>
    );
  }

  return (
    <div className={styles.sessionList}>
      {groups.map((group) => (
        <div key={group.label}>
          <div className={styles.groupLabel}>{group.label}</div>
          <div className={styles.groupSessions}>
            {group.sessions.map((s) => (
              <SessionRow
                key={s.id}
                session={s}
                selected={s.id === currentId}
                onOpen={() => onOpen(s.id)}
                onRename={(title) => onRename(s.id, title)}
                onToggleArchive={() =>
                  onToggleArchive(s.id, !s.archived)
                }
                onDelete={() => onDelete(s.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default SessionList;
