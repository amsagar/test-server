import React from 'react';
import { Switch } from 'antd';
import * as styles from '@styles/customAtoms.module.scss';

export interface CustomSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
}

const CustomSwitch: React.FC<CustomSwitchProps> = ({
  checked,
  onChange,
  disabled,
  ariaLabel,
  className,
}) => (
  <Switch
    checked={checked}
    onChange={onChange}
    disabled={disabled}
    aria-label={ariaLabel}
    className={[styles.switch, className].filter(Boolean).join(' ')}
  />
);

export default CustomSwitch;
