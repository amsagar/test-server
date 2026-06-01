import React from 'react';
import { Badge } from 'antd';

export interface CustomBadgeProps {
  count?: number;
  dot?: boolean;
  status?: 'success' | 'processing' | 'default' | 'error' | 'warning';
  children?: React.ReactNode;
}

const CustomBadge: React.FC<CustomBadgeProps> = ({
  count,
  dot,
  status,
  children,
}) => <Badge count={count} dot={dot} status={status}>{children}</Badge>;

export default CustomBadge;
