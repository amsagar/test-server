import React from 'react';
import { Tooltip } from 'antd';
import type { TooltipProps } from 'antd';
import * as styles from '@styles/customAtoms.module.scss';

export interface CustomTooltipProps {
  title: React.ReactNode;
  children: React.ReactNode;
  placement?: TooltipProps['placement'];
  disabled?: boolean;
  mouseEnterDelay?: number;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({
  title,
  children,
  placement = 'top',
  disabled = false,
  mouseEnterDelay = 0.3,
}) => {
  if (disabled || !title) return <>{children}</>;

  return (
    <Tooltip
      title={title}
      placement={placement}
      mouseEnterDelay={mouseEnterDelay}
      overlayClassName={styles.tooltipOverlay}
      color="#2b2a26"
      arrow
    >
      {children}
    </Tooltip>
  );
};

export default CustomTooltip;
