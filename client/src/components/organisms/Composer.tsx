import React, { useState } from 'react';
import CustomTextarea from '@atoms/CustomTextarea';
import CustomButton from '@atoms/CustomButton';
import CustomIcon from '@atoms/CustomIcon';
import * as styles from '@styles/composer.module.scss';

export interface ComposerProps {
  streaming: boolean;
  onSend: (text: string) => void;
  placeholder?: string;
}

const Composer: React.FC<ComposerProps> = ({
  streaming,
  onSend,
  placeholder = 'Send a message…',
}) => {
  const [value, setValue] = useState('');

  const submit = () => {
    const text = value.trim();
    if (!text || streaming) return;
    setValue('');
    onSend(text);
  };

  return (
    <div className={styles.composerOuter}>
      <div className={styles.composer}>
        <CustomTextarea
          className={styles.input}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={placeholder}
          autoSize={{ minRows: 1, maxRows: 8 }}
          variant="borderless"
          fullWidth
        />
        <CustomButton
          variant="primary"
          onClick={submit}
          disabled={streaming || !value.trim()}
          className={styles.sendButton}
          aria-label="Send"
        >
          <CustomIcon name={streaming ? 'reload' : 'arrowUp'} size={16} />
        </CustomButton>
      </div>
      <span className={styles.hint}>
        Press Enter to send · Shift + Enter for new line
      </span>
    </div>
  );
};

export default Composer;
