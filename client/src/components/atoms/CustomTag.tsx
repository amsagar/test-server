import React from 'react';
import { Tag } from 'antd';
import * as styles from '@styles/customAtoms.module.scss';

export type CustomTagTone = 'success' | 'warning' | 'error' | 'info' | 'neutral';

const toneToColor: Record<CustomTagTone, string> = {
  success: 'green',
  warning: 'orange',
  error: 'red',
  info: 'blue',
  neutral: 'default',
};

export interface CustomTagProps {
  tone?: CustomTagTone;
  children: React.ReactNode;
  className?: string;
}

const CustomTag: React.FC<CustomTagProps> = ({
  tone = 'neutral',
  children,
  className,
}) => (
  <Tag
    color={toneToColor[tone]}
    className={[styles.tag, className].filter(Boolean).join(' ')}
  >
    {children}
  </Tag>
);

export default CustomTag;
