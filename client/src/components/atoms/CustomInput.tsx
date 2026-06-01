import React from 'react';
import { Input } from 'antd';
import type { InputProps } from 'antd';
import * as styles from '@styles/customAtoms.module.scss';

export interface CustomInputProps extends InputProps {
  fullWidth?: boolean;
}

const CustomInput: React.FC<CustomInputProps> = ({
  fullWidth,
  className,
  ...rest
}) => {
  const merged = [
    styles.input,
    fullWidth ? styles.fullWidth : undefined,
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return <Input {...rest} className={merged} />;
};

export default CustomInput;
