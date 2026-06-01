import React from 'react';
import { Spin } from 'antd';

export interface CustomSpinnerProps {
  size?: 'small' | 'default' | 'large';
  tip?: string;
  children?: React.ReactNode;
  spinning?: boolean;
}

const CustomSpinner: React.FC<CustomSpinnerProps> = ({
  size = 'default',
  tip,
  children,
  spinning,
}) => {
  if (children) {
    return (
      <Spin size={size} tip={tip} spinning={spinning ?? true}>
        {children}
      </Spin>
    );
  }
  return <Spin size={size} tip={tip} />;
};

export default CustomSpinner;
