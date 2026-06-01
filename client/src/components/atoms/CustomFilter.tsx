import React, { useState } from 'react';
import CustomButton from './CustomButton';
import * as styles from '@styles/customAtoms.module.scss';

export interface CustomFilterOption {
  label: string;
  value: string;
}

export interface CustomFilterDropdownProps {
  options: CustomFilterOption[];
  selectedKeys?: string[];
  setSelectedKeys?: (keys: string[]) => void;
  confirm?: () => void;
  clearFilters?: () => void;
}

/**
 * Custom replacement for AntD's default column filterDropdown UI. Used by
 * CustomTable when a column has filters — multi-select checkboxes + Apply /
 * Reset. No `Input.Search`, no `Checkbox.Group` defaults; we render our own.
 */
const CustomFilter: React.FC<CustomFilterDropdownProps> = ({
  options,
  selectedKeys = [],
  setSelectedKeys,
  confirm,
  clearFilters,
}) => {
  const [local, setLocal] = useState<string[]>(selectedKeys);

  const toggle = (value: string) => {
    setLocal((prev) =>
      prev.includes(value)
        ? prev.filter((v) => v !== value)
        : [...prev, value]
    );
  };

  const apply = () => {
    setSelectedKeys?.(local);
    confirm?.();
  };

  const reset = () => {
    setLocal([]);
    setSelectedKeys?.([]);
    clearFilters?.();
    confirm?.();
  };

  return (
    <div className={styles.filter}>
      <div className={styles.filterList}>
        {options.length === 0 && (
          <div className={styles.filterOption}>No filter values</div>
        )}
        {options.map((opt) => (
          <label key={opt.value} className={styles.filterOption}>
            <input
              type="checkbox"
              checked={local.includes(opt.value)}
              onChange={() => toggle(opt.value)}
            />
            <span>{opt.label}</span>
          </label>
        ))}
      </div>
      <div className={styles.filterActions}>
        <CustomButton variant="text" size="small" onClick={reset}>
          Reset
        </CustomButton>
        <CustomButton variant="primary" size="small" onClick={apply}>
          Apply
        </CustomButton>
      </div>
    </div>
  );
};

export default CustomFilter;
