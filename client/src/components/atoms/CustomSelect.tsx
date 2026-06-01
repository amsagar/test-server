import React from 'react';
import { Select } from 'antd';
import type { SelectProps } from 'antd';
import { DownOutlined } from '@ant-design/icons';
import * as styles from '@styles/customAtoms.module.scss';

export interface CustomSelectOption<V = string> {
  label: React.ReactNode;
  value: V;
  disabled?: boolean;
}

export interface CustomSelectProps<V = string>
  extends Omit<SelectProps<V>, 'options' | 'suffixIcon' | 'popupClassName'> {
  options: CustomSelectOption<V>[];
  fullWidth?: boolean;
}

function CustomSelect<V extends string | number = string>({
  options,
  fullWidth,
  className,
  ...rest
}: CustomSelectProps<V>) {
  const merged = [
    styles.select,
    fullWidth ? styles.fullWidth : undefined,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Select<V>
      {...rest}
      options={options}
      className={merged}
      suffixIcon={<DownOutlined style={{ fontSize: 11, color: '#757880' }} />}
      popupClassName={styles.selectPopup}
    />
  );
}

export default CustomSelect;
