import React, { useMemo, useState } from 'react';
import { Table } from 'antd';
import type { TableColumnsType, TableProps } from 'antd';
import CustomFilter from '@atoms/CustomFilter';

export interface CustomTableProps<T extends object> {
  dataSource: T[];
  columns: TableColumnsType<T>;
  rowKey?: TableProps<T>['rowKey'];
  totalElements?: number;
  currentPage?: number;
  pageSize?: number;
  onPageChange?: (page: number, pageSize: number) => void;
  includePagination?: boolean;
  loading?: boolean;
  scrollY?: number;
  onRow?: (record: T, index?: number) => React.HTMLAttributes<HTMLElement>;
  onChange?: TableProps<T>['onChange'];
}

function CustomTable<T extends object>({
  dataSource,
  columns,
  rowKey = 'key',
  totalElements = 0,
  currentPage = 1,
  pageSize: pageSizeProp,
  onPageChange,
  includePagination,
  loading,
  scrollY,
  onRow,
  onChange,
}: CustomTableProps<T>) {
  const [pageSize, setPageSize] = useState<number>(pageSizeProp ?? 10);

  // Replace AntD's default filterDropdown with our CustomFilter for every
  // column that declares `filters` — keeps the "no defaults" rule intact.
  const wrappedColumns = useMemo(() => {
    return columns.map((col) => {
      const anyCol = col as TableColumnsType<T>[number] & {
        filters?: { text: React.ReactNode; value: string }[];
        filterDropdown?: unknown;
      };
      if (!anyCol.filters || anyCol.filterDropdown) return col;
      const options = anyCol.filters.map((f) => ({
        label: String(f.text),
        value: String(f.value),
      }));
      return {
        ...col,
        filterDropdown: ({
          selectedKeys,
          setSelectedKeys,
          confirm,
          clearFilters,
        }: {
          selectedKeys: React.Key[];
          setSelectedKeys: (keys: React.Key[]) => void;
          confirm: () => void;
          clearFilters?: () => void;
        }) => (
          <CustomFilter
            options={options}
            selectedKeys={(selectedKeys || []).map(String)}
            setSelectedKeys={(keys) => setSelectedKeys(keys)}
            confirm={confirm}
            clearFilters={clearFilters}
          />
        ),
      };
    });
  }, [columns]);

  const pagObj = {
    current: currentPage,
    total: totalElements,
    pageSize,
    onChange: (page: number, newPageSize: number) => {
      if (newPageSize !== pageSize) setPageSize(newPageSize);
      onPageChange?.(page, newPageSize);
    },
    showSizeChanger: true,
    pageSizeOptions: ['5', '10', '20', '50'],
    showTotal: (total: number) => `Total ${total} items`,
  };
  const pagination = includePagination ? pagObj : false;

  return (
    <Table<T>
      rowKey={rowKey}
      columns={wrappedColumns}
      dataSource={dataSource}
      pagination={pagination}
      loading={loading}
      onChange={onChange}
      scroll={scrollY ? { y: scrollY } : undefined}
      onRow={onRow ? (record) => onRow(record) : undefined}
      components={{
        header: {
          cell: (props: React.HTMLAttributes<HTMLTableCellElement>) => (
            <th {...props} style={{ fontFamily: 'Poppins' }} />
          ),
        },
        body: {
          row: (props: React.HTMLAttributes<HTMLTableRowElement>) => (
            <tr
              {...props}
              style={{ cursor: onRow ? 'pointer' : 'default' }}
            />
          ),
          cell: (props: React.HTMLAttributes<HTMLTableCellElement>) => (
            <td {...props} style={{ fontFamily: 'Poppins' }} />
          ),
        },
      }}
    />
  );
}

export default CustomTable;
