import React from 'react';
import { Divider } from 'antd';

export interface CustomDividerProps {
  children?: React.ReactNode;
  orientation?: 'left' | 'right' | 'center';
  dashed?: boolean;
  margin?: number;
}

const CustomDivider: React.FC<CustomDividerProps> = ({
  children,
  orientation = 'left',
  dashed,
  margin,
}) => (
  <Divider
    orientation={orientation}
    dashed={dashed}
    style={margin != null ? { margin: `${margin}px 0` } : undefined}
  >
    {children}
  </Divider>
);

export default CustomDivider;
