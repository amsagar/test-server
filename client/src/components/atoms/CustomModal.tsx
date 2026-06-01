import React from 'react';
import { Modal } from 'antd';
import * as styles from '@styles/customAtoms.module.scss';

export type CustomModalWidth = 'sm' | 'md' | 'lg' | 'wide';

const widthMap: Record<CustomModalWidth, number> = {
  sm: 420,
  md: 560,
  lg: 720,
  wide: 960,
};

export interface CustomModalProps {
  open: boolean;
  title?: React.ReactNode;
  onClose: () => void;
  width?: CustomModalWidth | number;
  footer?: React.ReactNode;
  children: React.ReactNode;
  maskClosable?: boolean;
  destroyOnClose?: boolean;
}

const CustomModal: React.FC<CustomModalProps> = ({
  open,
  title,
  onClose,
  width = 'md',
  footer,
  children,
  maskClosable = true,
  destroyOnClose = true,
}) => {
  const resolvedWidth =
    typeof width === 'number' ? width : widthMap[width];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      closable={false}
      maskClosable={maskClosable}
      destroyOnClose={destroyOnClose}
      width={resolvedWidth}
      className={styles.modalOverlay}
      centered
    >
      <div className={styles.modalHead}>
        <div className={styles.modalTitle}>{title}</div>
        <button
          type="button"
          className={styles.modalClose}
          onClick={onClose}
          aria-label="Close"
        >
          &times;
        </button>
      </div>
      <div className={styles.modalBody}>{children}</div>
      {footer && <div className={styles.modalFooter}>{footer}</div>}
    </Modal>
  );
};

export default CustomModal;
