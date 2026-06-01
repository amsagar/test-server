import React, { useEffect, useState } from 'react';
import CustomModal from './CustomModal';
import CustomButton from './CustomButton';
import * as styles from '@styles/customAtoms.module.scss';

export interface ConfirmOptions {
  title: string;
  body?: React.ReactNode;
  okText?: string;
  cancelText?: string;
  danger?: boolean;
  onOk?: () => void | Promise<void>;
  onCancel?: () => void;
}

type Listener = (opts: ConfirmOptions | null) => void;

let listener: Listener | null = null;

/**
 * Imperative confirm dialog. Mount <ConfirmHost /> once at the app root, then
 * call `confirm({ title, body, danger, onOk })` from anywhere. Replaces
 * `window.confirm` so we render our own modal chrome (no native browser UI,
 * no AntD `Modal.confirm`, no AntD `Popconfirm`).
 */
export const confirm = (opts: ConfirmOptions): void => {
  if (!listener) {
    console.warn(
      '[CustomConfirm] <ConfirmHost /> is not mounted; falling back to window.confirm.'
    );
    if (window.confirm(opts.title)) {
      void opts.onOk?.();
    } else {
      opts.onCancel?.();
    }
    return;
  }
  listener(opts);
};

export const ConfirmHost: React.FC = () => {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listener = setOpts;
    return () => {
      listener = null;
    };
  }, []);

  const close = () => {
    if (busy) return;
    setOpts(null);
  };

  const handleOk = async () => {
    if (!opts) return;
    setBusy(true);
    try {
      await opts.onOk?.();
      setOpts(null);
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = () => {
    opts?.onCancel?.();
    close();
  };

  if (!opts) return null;

  return (
    <CustomModal
      open
      title={opts.title}
      onClose={handleCancel}
      width="sm"
      maskClosable={!busy}
      footer={
        <>
          <CustomButton onClick={handleCancel} disabled={busy}>
            {opts.cancelText ?? 'Cancel'}
          </CustomButton>
          <CustomButton
            variant={opts.danger ? 'danger' : 'primary'}
            onClick={handleOk}
            loading={busy}
          >
            {opts.okText ?? 'Confirm'}
          </CustomButton>
        </>
      }
    >
      <div className={styles.confirmBody}>{opts.body}</div>
    </CustomModal>
  );
};

export default ConfirmHost;
