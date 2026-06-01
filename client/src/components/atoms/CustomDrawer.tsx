import React, { useCallback, useEffect, useState } from 'react';
import { Drawer } from 'antd';
import * as styles from '@styles/customAtoms.module.scss';

export interface CustomDrawerProps {
  open: boolean;
  title?: React.ReactNode;
  onClose: () => void;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  resizable?: boolean;
  placement?: 'left' | 'right';
  destroyOnClose?: boolean;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

const CustomDrawer: React.FC<CustomDrawerProps> = ({
  open,
  title,
  onClose,
  width: initialWidth = 640,
  minWidth = 400,
  maxWidth = 1200,
  resizable = true,
  placement = 'right',
  destroyOnClose = true,
  footer,
  children,
}) => {
  const [width, setWidth] = useState(initialWidth);
  const [isResizing, setIsResizing] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!resizable) return;
    setIsResizing(true);
    e.preventDefault();
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth =
        placement === 'right' ? window.innerWidth - e.clientX : e.clientX;
      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setWidth(newWidth);
      }
    },
    [isResizing, minWidth, maxWidth, placement]
  );

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      placement={placement}
      width={width}
      destroyOnClose={destroyOnClose}
      maskClosable
      className={styles.drawer}
      styles={{ body: { padding: 0 } }}
    >
      {resizable && (
        <div
          onMouseDown={handleMouseDown}
          className={`${styles.drawerResizer} ${
            isResizing ? styles.drawerResizerActive : ''
          }`}
        />
      )}
      <div className={styles.drawerInner}>
        <div className={styles.drawerHead}>
          <div className={styles.drawerTitle}>{title}</div>
          <button
            type="button"
            className={styles.modalClose}
            onClick={onClose}
            aria-label="Close"
          >
            &times;
          </button>
        </div>
        <div className={styles.drawerBody}>{children}</div>
        {footer && <div className={styles.modalFooter}>{footer}</div>}
      </div>
    </Drawer>
  );
};

export default CustomDrawer;
