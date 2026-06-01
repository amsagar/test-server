import React from 'react';
import { useNavigate } from 'react-router-dom';
import CustomIcon from '@atoms/CustomIcon';
import CustomTooltip from '@atoms/CustomTooltip';
import SessionList from './SessionList';
import { ROUTE_PATHS } from '@constants/routePaths';
import type { ChatSessionDto } from '@interfaces/chat.interface';
import * as styles from '@styles/chatSidebar.module.scss';

export interface ChatSidebarProps {
  collapsed: boolean;
  onCollapse: () => void;

  width: number;
  resizing?: boolean;
  onBeginResize: (e: React.MouseEvent) => void;

  showArchived: boolean;
  onToggleArchived: (archived: boolean) => void;

  sessions: ChatSessionDto[];
  currentId: string | null;
  onNewChat: () => void;
  onOpenSession: (id: string) => void;
  onRenameSession: (id: string, title: string) => void | Promise<void>;
  onToggleArchive: (id: string, archived: boolean) => void | Promise<void>;
  onDeleteSession: (id: string) => void | Promise<void>;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  collapsed,
  onCollapse,
  width,
  resizing,
  onBeginResize,
  showArchived,
  onToggleArchived,
  sessions,
  currentId,
  onNewChat,
  onOpenSession,
  onRenameSession,
  onToggleArchive,
  onDeleteSession,
}) => {
  const navigate = useNavigate();

  return (
    <aside
      className={[
        styles.sidebar,
        collapsed ? styles.sidebarCollapsed : '',
        resizing ? styles.sidebarResizing : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ width: collapsed ? 0 : width }}
      aria-hidden={collapsed}
    >
      <div className={styles.sidebarInner} style={{ width }}>
      <div className={styles.sidebarHeader}>
        <div className={styles.sidebarBrand}>
          <span className={styles.sidebarBrandMark}>P</span>
          <span>PODS Agents</span>
        </div>
        <CustomTooltip title="Collapse sidebar" placement="right">
          <button
            type="button"
            className={styles.collapseBtn}
            onClick={onCollapse}
            aria-label="Collapse sidebar"
          >
            <CustomIcon name="sidebarFold" size={15} />
          </button>
        </CustomTooltip>
      </div>

      <button
        type="button"
        className={styles.newChatBtn}
        onClick={onNewChat}
      >
        <CustomIcon name="plus" size={14} />
        New chat
      </button>

      <div className={styles.toggle}>
        <button
          type="button"
          className={`${styles.toggleButton} ${
            !showArchived ? styles.toggleActive : ''
          }`}
          onClick={() => onToggleArchived(false)}
        >
          Recent
        </button>
        <button
          type="button"
          className={`${styles.toggleButton} ${
            showArchived ? styles.toggleActive : ''
          }`}
          onClick={() => onToggleArchived(true)}
        >
          Archived
        </button>
      </div>

      <SessionList
        sessions={sessions}
        currentId={currentId}
        showArchived={showArchived}
        onOpen={onOpenSession}
        onRename={onRenameSession}
        onToggleArchive={onToggleArchive}
        onDelete={onDeleteSession}
      />

      <button
        type="button"
        className={styles.settingsBtn}
        onClick={() => navigate(ROUTE_PATHS.SETTINGS)}
      >
        <CustomIcon name="settings" size={14} />
        Settings
      </button>
      </div>
      {!collapsed && (
        <div
          className={`${styles.resizer} ${resizing ? styles.resizerActive : ''}`}
          onMouseDown={onBeginResize}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize sidebar"
        />
      )}
    </aside>
  );
};

export default ChatSidebar;
