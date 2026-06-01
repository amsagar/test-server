import React from 'react';
import { Input } from 'antd';
import type { TextAreaProps } from 'antd/es/input';
import * as styles from '@styles/customAtoms.module.scss';

const { TextArea } = Input;

export interface CustomTextareaProps extends TextAreaProps {
  fullWidth?: boolean;
}

const CustomTextarea: React.FC<CustomTextareaProps> = ({
  fullWidth,
  className,
  ...rest
}) => {
  const merged = [
    styles.textarea,
    fullWidth ? styles.fullWidth : undefined,
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return <TextArea {...rest} className={merged} />;
};

export default CustomTextarea;
