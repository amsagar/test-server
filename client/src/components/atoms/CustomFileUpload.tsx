import React, { useRef, useState } from 'react';
import CustomButton from './CustomButton';
import * as styles from '@styles/customAtoms.module.scss';

export interface CustomFileUploadProps {
  accept?: string;
  buttonLabel?: string;
  dropLabel?: React.ReactNode;
  value?: File | null;
  onChange?: (file: File | null) => void;
  disabled?: boolean;
}

const CustomFileUpload: React.FC<CustomFileUploadProps> = ({
  accept,
  buttonLabel = 'Choose file',
  dropLabel = 'Click or drop a file here',
  value,
  onChange,
  disabled,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);

  const pick = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    onChange?.(files[0]);
  };

  return (
    <div className={styles.upload}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        style={{ display: 'none' }}
        onChange={(e) => handleFiles(e.target.files)}
      />
      <div
        className={styles.uploadDropzone}
        onClick={pick}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        style={{
          borderColor: dragging ? '#0060c0' : undefined,
          color: dragging ? '#0060c0' : undefined,
        }}
      >
        {dropLabel}
      </div>
      {value && (
        <div className={styles.uploadFile}>
          <span className={styles.uploadFileName}>{value.name}</span>
          <CustomButton
            variant="text"
            size="small"
            onClick={() => onChange?.(null)}
          >
            Remove
          </CustomButton>
        </div>
      )}
      <CustomButton variant="ghost" onClick={pick} disabled={disabled}>
        {buttonLabel}
      </CustomButton>
    </div>
  );
};

export default CustomFileUpload;
