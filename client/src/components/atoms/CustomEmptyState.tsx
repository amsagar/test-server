import React from 'react';
import * as styles from '@styles/customAtoms.module.scss';

export interface CustomEmptyStateProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
}

const CustomEmptyState: React.FC<CustomEmptyStateProps> = ({
  title = 'Nothing here yet',
  description,
  action,
}) => (
  <div className={styles.empty}>
    <div className={styles.emptyTitle}>{title}</div>
    {description && <div>{description}</div>}
    {action}
  </div>
);

export default CustomEmptyState;
