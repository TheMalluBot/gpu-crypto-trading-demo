import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight } from 'lucide-react';

export interface TableColumn<T> {
  key: keyof T;
  header: string;
  render?: (value: any, item: T) => React.ReactNode;
  className?: string;
  sortable?: boolean;
  mobileHidden?: boolean;
}

export interface ResponsiveTableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  className?: string;
  onRowClick?: (item: T) => void;
  loading?: boolean;
  emptyMessage?: string;
  rowKey: keyof T;
}

export function ResponsiveTable<T extends Record<string, any>>({
  data,
  columns,
  className = '',
  onRowClick,
  loading = false,
  emptyMessage = 'No data available',
  rowKey
}: ResponsiveTableProps<T>) {
  const [expandedRows, setExpandedRows] = useState<Set<string | number>>(new Set());
  const [sortConfig, setSortConfig] = useState<{
    key: keyof T | null;
    direction: 'asc' | 'desc';
  }>({ key: null, direction: 'asc' });

  const toggleRowExpansion = (id: string | number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const handleSort = (key: keyof T) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const sortedData = React.useMemo(() => {
    if (!sortConfig.key) return data;

    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key!];
      const bValue = b[sortConfig.key!];

      if (aValue === bValue) return 0;

      const comparison = aValue < bValue ? -1 : 1;
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [data, sortConfig]);

  const visibleColumns = columns.filter(col => !col.mobileHidden);
  const hiddenColumns = columns.filter(col => col.mobileHidden);

  if (loading) {
    return (
      <div className={`${className} glass-morphic p-6`}>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-white/10 rounded mb-2"></div>
              <div className="h-4 bg-white/5 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={`${className} glass-morphic p-6 text-center`}>
        <p className="text-white/60">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={`${className} glass-morphic overflow-hidden`}>
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full" role="table">
          <thead>
            <tr className="text-white/60 text-sm border-b border-white/10">
              {columns.map((column) => (
                <th 
                  key={String(column.key)} 
                  className={`text-left py-3 px-4 ${column.className || ''}`}
                  scope="col"
                >
                  {column.sortable ? (
                    <button
                      onClick={() => handleSort(column.key)}
                      className="flex items-center space-x-1 hover:text-white transition-colors focus:outline-none focus:text-white"
                      aria-label={`Sort by ${column.header}`}
                    >
                      <span>{column.header}</span>
                      {sortConfig.key === column.key && (
                        <span aria-hidden="true">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((item) => (
              <tr 
                key={String(item[rowKey])}
                className={`border-b border-white/5 hover:bg-white/5 transition-colors ${
                  onRowClick ? 'cursor-pointer' : ''
                }`}
                onClick={() => onRowClick?.(item)}
                role={onRowClick ? 'button' : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={onRowClick ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onRowClick(item);
                  }
                } : undefined}
              >
                {columns.map((column) => (
                  <td key={String(column.key)} className={`py-3 px-4 ${column.className || ''}`}>
                    {column.render 
                      ? column.render(item[column.key], item)
                      : String(item[column.key] ?? '-')
                    }
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-2 p-4">
        {sortedData.map((item) => {
          const isExpanded = expandedRows.has(item[rowKey]);
          
          return (
            <motion.div
              key={String(item[rowKey])}
              className="glass-card p-4 cursor-pointer"
              onClick={() => onRowClick?.(item)}
              whileTap={{ scale: 0.98 }}
              layout
            >
              {/* Main visible info */}
              <div className="flex items-center justify-between">
                <div className="flex-1 space-y-1">
                  {visibleColumns.slice(0, 2).map((column) => (
                    <div key={String(column.key)} className="flex justify-between items-center">
                      <span className="text-white/60 text-sm">{column.header}:</span>
                      <span className="text-white font-medium">
                        {column.render 
                          ? column.render(item[column.key], item)
                          : String(item[column.key] ?? '-')
                        }
                      </span>
                    </div>
                  ))}
                </div>
                
                {hiddenColumns.length > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleRowExpansion(item[rowKey]);
                    }}
                    className="ml-2 p-1 rounded-full hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
                    aria-expanded={isExpanded}
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-white/60" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-white/60" />
                    )}
                  </button>
                )}
              </div>

              {/* Expanded details */}
              <AnimatePresence>
                {isExpanded && hiddenColumns.length > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="mt-3 pt-3 border-t border-white/10 space-y-2"
                  >
                    {hiddenColumns.map((column) => (
                      <div key={String(column.key)} className="flex justify-between items-center">
                        <span className="text-white/60 text-sm">{column.header}:</span>
                        <span className="text-white">
                          {column.render 
                            ? column.render(item[column.key], item)
                            : String(item[column.key] ?? '-')
                          }
                        </span>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

ResponsiveTable.displayName = 'ResponsiveTable';