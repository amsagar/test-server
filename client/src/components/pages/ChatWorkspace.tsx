import React, { useEffect } from 'react';
import CustomLayout from '@templates/CustomLayout';
import CustomSelect from '@atoms/CustomSelect';
import CustomIcon from '@atoms/CustomIcon';
import CustomTooltip from '@atoms/CustomTooltip';
import ChatSidebar from '@organisms/ChatSidebar';
import ChatThread from '@organisms/ChatThread';
import Composer from '@organisms/Composer';
import FieldLabel from '@molecules/FieldLabel';
import { useChatStore } from '@store/useChatStore';
import { useNotification } from '@providers/NotificationProviders';
import { useSidebarCollapse } from '@utils/useSidebarCollapse';
import { useSidebarWidth } from '@utils/useSidebarWidth';
import * as styles from '@styles/chatWorkspace.module.scss';

const ChatWorkspace: React.FC = () => {
  const openNotification = useNotification();
  const { collapsed, toggle: toggleSidebar } = useSidebarCollapse();
  const { width: sidebarWidth, resizing, beginResize } = useSidebarWidth();

  const {
    sessions,
    showArchived,
    currentId,
    assistants,
    selectedAssistantId,
    styles: responseStyles,
    selectedStyleId,
    messages,
    streaming,
    refreshSessions,
    refreshAssistants,
    refreshStyles,
    setShowArchived,
    setSelectedAssistantId,
    setSelectedStyleId,
    openSession,
    newChat,
    renameSession,
    toggleArchive,
    deleteSession,
    setSessionStyle,
    send,
    resendFromUser,
  } = useChatStore();

  useEffect(() => {
    void refreshSessions();
  }, [refreshSessions]);

  useEffect(() => {
    void refreshAssistants().catch((e) =>
      openNotification(e?.message || 'Failed to load assistants', 'Error')
    );
  }, [refreshAssistants, openNotification]);

  const wrap = <T extends unknown[]>(
    fn: (...args: T) => Promise<unknown> | unknown,
    label: string
  ) =>
    async (...args: T) => {
      try {
        await fn(...args);
      } catch (e) {
        const msg = (e as Error)?.message || `Failed to ${label}`;
        openNotification(msg, 'Error');
      }
    };

  const currentSession = sessions.find((s) => s.id === currentId) || null;
  const headerAssistantId =
    currentSession?.assistantId || selectedAssistantId || '';

  useEffect(() => {
    void refreshStyles(headerAssistantId).catch((e) =>
      openNotification(e?.message || 'Failed to load styles', 'Error')
    );
  }, [headerAssistantId, refreshStyles, openNotification]);

  const activeAssistant =
    assistants.find((a) => a.id === headerAssistantId) || null;

  const composerPlaceholder = activeAssistant
    ? `Message ${activeAssistant.name}…`
    : assistants.length === 0
      ? 'Create an assistant in Settings to start chatting'
      : 'Pick an assistant to start chatting';

  const assistantOptions =
    assistants.length === 0
      ? [{ value: '', label: 'No assistants yet' }]
      : assistants.map((a) => ({ value: a.id, label: a.name }));

  const styleOptions = [
    { value: '', label: 'Default style' },
    ...responseStyles.map((s) => ({ value: s.id, label: s.name })),
  ];

  return (
    <CustomLayout className={styles.workspace}>
      <ChatSidebar
        collapsed={collapsed}
        onCollapse={toggleSidebar}
        width={sidebarWidth}
        resizing={resizing}
        onBeginResize={beginResize}
        showArchived={showArchived}
        onToggleArchived={setShowArchived}
        sessions={sessions}
        currentId={currentId}
        onNewChat={wrap(newChat, 'create chat')}
        onOpenSession={wrap(openSession, 'open session')}
        onRenameSession={wrap(renameSession, 'rename')}
        onToggleArchive={wrap(toggleArchive, 'archive')}
        onDeleteSession={wrap(deleteSession, 'delete')}
      />

      <main className={styles.chat}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            {collapsed && (
              <CustomTooltip title="Open sidebar" placement="right">
                <button
                  type="button"
                  className={styles.expandBtn}
                  onClick={toggleSidebar}
                  aria-label="Open sidebar"
                >
                  <CustomIcon name="sidebarUnfold" size={16} />
                </button>
              </CustomTooltip>
            )}
          </div>
          <div className={styles.headerRight}>
            <FieldLabel
              inline
              label="Style"
              info={
                currentSession
                  ? 'Apply a saved response style to shape how the assistant replies in this chat. Manage styles in Settings → Response styles.'
                  : 'Pre-pick a response style for your next chat. Manage styles in Settings → Response styles.'
              }
            >
              <CustomSelect
                className={styles.stylePicker}
                options={styleOptions}
                value={
                  currentSession
                    ? currentSession.styleId || ''
                    : selectedStyleId
                }
                onChange={(v) => {
                  const next = (v as string) || '';
                  if (currentSession) {
                    void wrap(setSessionStyle, 'apply style')(
                      currentSession.id,
                      next
                    );
                  } else {
                    setSelectedStyleId(next);
                  }
                }}
                placeholder="Default style"
                allowClear
              />
            </FieldLabel>
            <FieldLabel
              inline
              label="Assistant"
              info={
                currentSession
                  ? 'The assistant is locked once a chat is started. Create a new chat to pick a different assistant.'
                  : 'Pick which assistant handles this new chat. Configure assistants in Settings → Assistants.'
              }
            >
              <CustomSelect
                className={styles.assistantPicker}
                options={assistantOptions}
                value={headerAssistantId}
                onChange={(v) => setSelectedAssistantId(v as string)}
                placeholder="Select assistant"
                disabled={!!currentSession}
              />
            </FieldLabel>
          </div>
        </header>

        <ChatThread
          messages={messages}
          streaming={streaming}
          hasSession={!!currentId}
          assistantName={activeAssistant?.name}
          onResend={(idx, text) =>
            void wrap(resendFromUser, 'resend')(idx, text)
          }
        />

        <Composer
          streaming={streaming}
          onSend={(t) => void wrap(send, 'send')(t)}
          placeholder={composerPlaceholder}
        />
      </main>
    </CustomLayout>
  );
};

export default ChatWorkspace;
