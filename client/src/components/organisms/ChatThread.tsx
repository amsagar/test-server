import React, { useEffect, useRef, useState } from 'react';
import CustomButton from '@atoms/CustomButton';
import CustomTooltip from '@atoms/CustomTooltip';
import CustomIcon from '@atoms/CustomIcon';
import MessageBubble from '@molecules/MessageBubble';
import MessageEditor from '@molecules/MessageEditor';
import ToolEventCard from './ToolEventCard';
import type { UiChatMessage } from '@interfaces/chat.interface';
import * as styles from '@styles/chatThread.module.scss';

export interface ChatThreadProps {
  messages: UiChatMessage[];
  streaming: boolean;
  hasSession: boolean;
  assistantName?: string;
  onResend: (userIndex: number, text: string) => void;
}

const ChatThread: React.FC<ChatThreadProps> = ({
  messages,
  streaming,
  hasSession,
  assistantName,
  onResend,
}) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const displayName = assistantName?.trim() || '';
  const avatarInitial = (displayName[0] || 'P').toUpperCase();

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo(0, el.scrollHeight);
  }, [messages]);

  const handleCopy = async (index: number, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      window.setTimeout(() => {
        setCopiedIndex((curr) => (curr === index ? null : curr));
      }, 1400);
    } catch {
      // ignore — clipboard may be unavailable in certain contexts
    }
  };

  if (messages.length === 0) {
    return (
      <div className={styles.thread} ref={scrollRef}>
        <div className={styles.emptyHero}>
          {displayName && (
            <div className={styles.emptyHeroBadge}>
              <span className={styles.emptyHeroBadgeMark}>{avatarInitial}</span>
              <span className={styles.emptyHeroBadgeLabel}>{displayName}</span>
            </div>
          )}
          <div className={styles.emptyHeroTitle}>
            How can I help you today?
          </div>
          <div className={styles.emptyHeroSub}>
            {hasSession
              ? 'Send a message to continue this chat.'
              : 'Pick an assistant and ask anything — your message will start a new chat.'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.thread} ref={scrollRef}>
      <div className={styles.threadInner}>
        {messages.map((m, i) => {
          const isUser = m.role === 'user';
          const showTypingDots =
            !isUser && (m.tools || []).length === 0 && !m.content;
          const isEditing = editingIndex === i;
          const canRegenerate =
            !isUser && i > 0 && messages[i - 1]?.role === 'user' && !streaming;
          const isCopied = copiedIndex === i;

          return (
            <div
              key={i}
              className={`${styles.message} ${
                isUser ? styles.messageUser : styles.messageAssistant
              }`}
            >
              {!isUser && displayName && (
                <div className={styles.messageHeader}>
                  <span className={styles.avatar}>{avatarInitial}</span>
                  <span className={styles.senderName}>{displayName}</span>
                </div>
              )}

              {!isUser &&
                (m.tools || []).map((t) => (
                  <ToolEventCard key={t.id} tool={t} />
                ))}

              {isEditing && isUser ? (
                <MessageEditor
                  initialValue={m.content}
                  disabled={streaming}
                  onCancel={() => setEditingIndex(null)}
                  onSubmit={(text) => {
                    setEditingIndex(null);
                    onResend(i, text);
                  }}
                />
              ) : (
                <MessageBubble message={m} showTypingDots={showTypingDots} />
              )}

              {!isEditing && !streaming && (
                <div className={styles.actions}>
                  {isUser ? (
                    <>
                      <CustomTooltip title={isCopied ? 'Copied' : 'Copy'}>
                        <CustomButton
                          variant="text"
                          size="small"
                          onClick={() => void handleCopy(i, m.content)}
                          aria-label="Copy"
                        >
                          <CustomIcon name={isCopied ? 'check' : 'copy'} />
                        </CustomButton>
                      </CustomTooltip>
                      <CustomTooltip title="Edit & resend">
                        <CustomButton
                          variant="text"
                          size="small"
                          onClick={() => setEditingIndex(i)}
                          aria-label="Edit"
                        >
                          <CustomIcon name="edit" />
                        </CustomButton>
                      </CustomTooltip>
                      <CustomTooltip title="Resend">
                        <CustomButton
                          variant="text"
                          size="small"
                          onClick={() => onResend(i, m.content)}
                          aria-label="Resend"
                        >
                          <CustomIcon name="reload" />
                        </CustomButton>
                      </CustomTooltip>
                    </>
                  ) : (
                    <>
                      <CustomTooltip title={isCopied ? 'Copied' : 'Copy reply'}>
                        <CustomButton
                          variant="text"
                          size="small"
                          onClick={() => void handleCopy(i, m.content)}
                          aria-label="Copy reply"
                          disabled={!m.content}
                        >
                          <CustomIcon name={isCopied ? 'check' : 'copy'} />
                        </CustomButton>
                      </CustomTooltip>
                      {canRegenerate && (
                        <CustomTooltip title="Regenerate">
                          <CustomButton
                            variant="text"
                            size="small"
                            onClick={() =>
                              onResend(i - 1, messages[i - 1].content)
                            }
                            aria-label="Regenerate"
                          >
                            <CustomIcon name="reload" />
                          </CustomButton>
                        </CustomTooltip>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ChatThread;
