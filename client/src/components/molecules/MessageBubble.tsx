import React from 'react';
import MarkdownContent from '@molecules/MarkdownContent';
import type { UiChatMessage } from '@interfaces/chat.interface';
import * as styles from '@styles/chatThread.module.scss';

export interface MessageBubbleProps {
  message: UiChatMessage;
  /** Show the typing dots when the assistant content is empty AND no tools yet */
  showTypingDots?: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  showTypingDots,
}) => {
  const isUser = message.role === 'user';
  const bubbleClass = isUser ? styles.bubbleUser : styles.bubbleAssistant;

  return (
    <div className={bubbleClass}>
      {isUser ? (
        message.content
      ) : message.content ? (
        <MarkdownContent source={message.content} />
      ) : showTypingDots ? (
        <span className={styles.typing} aria-live="polite" aria-label="Thinking">
          <span className={styles.typingShimmer}>Thinking</span>
          <span className={styles.typingDots}>
            <span />
            <span />
            <span />
          </span>
        </span>
      ) : null}
    </div>
  );
};

export default MessageBubble;
