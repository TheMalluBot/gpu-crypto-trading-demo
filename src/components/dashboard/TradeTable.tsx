import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '../common/Button';
import { ResponsiveTable, TableColumn } from '../common/ResponsiveTable';
import { StatusBadge } from '../common/StatusBadge';
import { PnLDisplay } from '../common/PnLDisplay';
import { TradeRecord } from '../../hooks/useTrades';
import { formatDate, formatPrice, formatQuantity } from '../../utils/formatters';

interface TradeTableProps {
  trades: TradeRecord[];
  currentPage: number;
  totalPages: number;
  tradesPerPage: number;
  onPageChange: (page: number) => void;
}

export const TradeTable: React.FC<TradeTableProps> = ({
  trades,
  currentPage,
  totalPages,
  tradesPerPage,
  onPageChange,
}) => {
  const indexOfLastTrade = currentPage * tradesPerPage;
  const indexOfFirstTrade = indexOfLastTrade - tradesPerPage;
  const currentTrades = trades.slice(indexOfFirstTrade, indexOfLastTrade);

  const columns: TableColumn<TradeRecord>[] = [
    {
      key: 'timestamp',
      header: 'Date',
      render: value => formatDate(value),
      sortable: true,
    },
    {
      key: 'symbol',
      header: 'Symbol',
      className: 'font-medium',
      sortable: true,
    },
    {
      key: 'side',
      header: 'Side',
      render: value => <StatusBadge status={value} variant="trade-side" />,
    },
    {
      key: 'type',
      header: 'Type',
      className: 'text-white/80 text-sm',
      mobileHidden: true,
    },
    {
      key: 'entry_price',
      header: 'Entry',
      render: value => `$${formatPrice(value)}`,
      sortable: true,
    },
    {
      key: 'exit_price',
      header: 'Exit',
      render: value => (value ? `$${formatPrice(value)}` : '-'),
      mobileHidden: true,
    },
    {
      key: 'quantity',
      header: 'Quantity',
      render: (value, record) => formatQuantity(value, record.symbol),
      mobileHidden: true,
    },
    {
      key: 'pnl',
      header: 'P/L',
      render: value => <PnLDisplay value={value} />,
      sortable: true,
    },
    {
      key: 'pnl_percentage',
      header: 'P/L %',
      render: value => <PnLDisplay value={value} showPercentage={true} />,
      mobileHidden: true,
    },
    {
      key: 'duration',
      header: 'Duration',
      render: value => value || '-',
      className: 'text-white/60 text-sm',
      mobileHidden: true,
    },
    {
      key: 'status',
      header: 'Status',
      render: value => <StatusBadge status={value} variant="trade-status" />,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <ResponsiveTable
        data={currentTrades}
        columns={columns}
        rowKey="id"
        emptyMessage="No trades found"
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="glass-morphic p-4 mt-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-white/60 text-sm text-center sm:text-left">
              Showing {indexOfFirstTrade + 1} to {Math.min(indexOfLastTrade, trades.length)} of{' '}
              {trades.length} trades
            </div>

            <nav className="flex items-center space-x-2" aria-label="Table pagination">
              <Button
                variant="secondary"
                onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
                disabled={currentPage === 1}
                size="sm"
                aria-label="Go to previous page"
              >
                Previous
              </Button>

              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const page = i + Math.max(1, currentPage - 2);
                return page <= totalPages ? (
                  <Button
                    key={page}
                    variant={currentPage === page ? 'primary' : 'secondary'}
                    onClick={() => onPageChange(page)}
                    size="sm"
                    aria-label={`Go to page ${page}`}
                    aria-current={currentPage === page ? 'page' : undefined}
                  >
                    {page}
                  </Button>
                ) : null;
              })}

              <Button
                variant="secondary"
                onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
                disabled={currentPage === totalPages}
                size="sm"
                aria-label="Go to next page"
              >
                Next
              </Button>
            </nav>
          </div>
        </div>
      )}
    </motion.div>
  );
};
