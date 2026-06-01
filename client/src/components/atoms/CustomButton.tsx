import React from 'react';
import { Button } from 'antd';
import type { ButtonProps as AntdButtonProps } from 'antd';
import * as styles from '@styles/customAtoms.module.scss';

export type CustomButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'danger'
  | 'text';

export interface CustomButtonProps
  extends Omit<AntdButtonProps, 'type' | 'danger' | 'variant'> {
  variant?: CustomButtonVariant;
  fullWidth?: boolean;
}

const variantToAntd: Record<
  CustomButtonVariant,
  { type: AntdButtonProps['type']; danger?: boolean; className?: string }
> = {
  primary: { type: 'primary', className: styles.btnPrimary },
  secondary: { type: 'default' },
  ghost: { type: 'default', className: styles.btnGhost },
  danger: { type: 'primary', danger: true, className: styles.btnDanger },
  text: { type: 'text', className: styles.btnText },
};

const CustomButton: React.FC<CustomButtonProps> = ({
  variant = 'secondary',
  fullWidth,
  className,
  children,
  ...rest
}) => {
  const cfg = variantToAntd[variant];
  const merged = [
    styles.btn,
    cfg.className,
    fullWidth ? styles.btnFull : undefined,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Button {...rest} type={cfg.type} danger={cfg.danger} className={merged}>
      {children}
    </Button>
  );
};

export default CustomButton;
