import React, { useState } from 'react';
import CustomTextarea from '@atoms/CustomTextarea';
import CustomButton from '@atoms/CustomButton';
import CustomIcon from '@atoms/CustomIcon';
import * as styles from '@styles/composer.module.scss';

export interface ComposerProps {
  streaming: boolean;
  disabled?: boolean;
  onSend: (text: string) => void;
  placeholder?: string;
}

const Composer: React.FC<ComposerProps> = ({
  streaming,
  disabled,
  onSend,
  placeholder = 'Send a message…',
}) => {
  const [value, setValue] = useState('');
  const blocked = streaming || disabled;

  const submit = () => {
    const text = value.trim();
    if (!text || blocked) return;
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
          disabled={blocked}
        />
        <CustomButton
          variant="primary"
          onClick={submit}
          disabled={blocked || !value.trim()}
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
