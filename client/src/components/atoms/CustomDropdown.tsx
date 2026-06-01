import React from 'react';
import { Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import * as styles from '@styles/customAtoms.module.scss';

export interface CustomDropdownItem {
  key: string;
  label: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

export interface CustomDropdownProps {
  items: CustomDropdownItem[];
  trigger?: ('click' | 'hover')[];
  placement?: 'bottomLeft' | 'bottomRight' | 'topLeft' | 'topRight';
  children: React.ReactElement;
  disabled?: boolean;
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({
  items,
  trigger = ['click'],
  placement = 'bottomRight',
  children,
  disabled,
}) => {
  const menu: MenuProps = {
    items: items.map((it) => ({
      key: it.key,
      label: it.label,
      danger: it.danger,
      disabled: it.disabled,
      onClick: it.onClick,
    })),
  };

  return (
    <Dropdown
      menu={menu}
      trigger={trigger}
      placement={placement}
      disabled={disabled}
      overlayClassName={styles.dropdownPopup}
    >
      {children}
    </Dropdown>
  );
};

export default CustomDropdown;
