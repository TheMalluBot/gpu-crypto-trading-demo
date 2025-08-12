import React, { useState, useMemo } from 'react';
import { TradeBookHeader } from './TradeBookHeader';
import { TradeStats } from './TradeStats';
import { TradeFilters } from './TradeFilters';
import { TradeTable } from './TradeTable';
import { useTrades, TradeFilters as TradeFiltersType } from '../../hooks/useTrades';
import NotificationManager from '../../utils/notifications';

/**
 * TradeBookSection handles all trade-related functionality
 * Encapsulates trade filtering, statistics, and table display
 */
export const TradeBookSection: React.FC = () => {
  const { trades, filterTrades } = useTrades();

  const [filters, setFilters] = useState<TradeFiltersType>({
    symbol: '',
    side: '',
    status: '',
    strategy: '',
    date_from: '',
    date_to: '',
    min_pnl: '',
    max_pnl: '',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [tradesPerPage] = useState(10);

  const filteredTrades = useMemo(() => {
    return filterTrades(filters, searchTerm, selectedTimeframe);
  }, [trades, filters, searchTerm, selectedTimeframe, filterTrades]);

  const filteredTradeStats = useMemo(() => {
    const totalPnL = filteredTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
    const totalFees = filteredTrades.reduce((sum, trade) => sum + trade.fees, 0);
    const avgPnL = filteredTrades.length > 0 ? totalPnL / filteredTrades.length : 0;
    const winningTrades = filteredTrades.filter(trade => (trade.pnl || 0) > 0);
    const currentWinRate =
      filteredTrades.length > 0 ? (winningTrades.length / filteredTrades.length) * 100 : 0;

    return {
      total_pnl: totalPnL,
      total_fees: totalFees,
      avg_pnl: avgPnL,
      win_rate: currentWinRate,
      total_trades: filteredTrades.length,
      winning_trades: winningTrades.length,
      losing_trades: filteredTrades.length - winningTrades.length,
    };
  }, [filteredTrades]);

  const exportTrades = () => {
    const csv = [
      'Date,Symbol,Side,Type,Entry,Exit,Quantity,P/L,P/L %,Status,Strategy,Duration,Fees,Notes',
      ...filteredTrades.map(trade =>
        [
          new Date(trade.timestamp).toISOString().split('T')[0],
          trade.symbol,
          trade.side,
          trade.type,
          trade.entry_price.toFixed(2),
          trade.exit_price?.toFixed(2) || '',
          trade.quantity.toFixed(4),
          trade.pnl?.toFixed(2) || '',
          trade.pnl_percentage?.toFixed(2) || '',
          trade.status,
          trade.strategy || '',
          trade.duration || '',
          trade.fees.toFixed(4),
          trade.notes || '',
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trade_history_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const importTrades = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = e => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = event => {
          try {
            const csv = event.target?.result as string;
            const lines = csv.split('\n');
            lines[0].split(','); // headers

            const importedTrades = lines
              .slice(1)
              .filter(line => line.trim())
              .map((line, index) => {
                const values = line.split(',');
                return {
                  id: `imported_${Date.now()}_${index}`,
                  timestamp: new Date(values[0]).toISOString(),
                  symbol: values[1],
                  side: values[2] as 'Long' | 'Short',
                  type: values[3] as 'Market' | 'Limit' | 'Bot',
                  entry_price: parseFloat(values[4]),
                  exit_price: values[5] ? parseFloat(values[5]) : undefined,
                  quantity: parseFloat(values[6]),
                  pnl: values[7] ? parseFloat(values[7]) : undefined,
                  pnl_percentage: values[8] ? parseFloat(values[8]) : undefined,
                  status: values[9] as 'Open' | 'Closed' | 'Cancelled',
                  strategy: values[10] || undefined,
                  duration: values[11] || undefined,
                  fees: parseFloat(values[12]) || 0,
                  notes: values[13] || undefined,
                };
              });

            NotificationManager.success(
              'Import Successful',
              `Imported ${importedTrades.length} trades successfully.`
            );
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            NotificationManager.error(
              'Import Failed',
              `Failed to parse CSV file: ${errorMessage}. Please check the file format.`
            );
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  // Pagination
  const totalPages = Math.ceil(filteredTrades.length / tradesPerPage);

  return (
    <>
      {/* Trade Book Header */}
      <TradeBookHeader
        filteredTradesCount={filteredTrades.length}
        onToggleFilters={() => setShowFilters(!showFilters)}
        onImportTrades={importTrades}
        onExportTrades={exportTrades}
      />

      {/* Trade Stats */}
      <TradeStats
        totalPnL={filteredTradeStats.total_pnl}
        avgPnL={filteredTradeStats.avg_pnl}
        winRate={filteredTradeStats.win_rate}
        totalFees={filteredTradeStats.total_fees}
        winningTrades={filteredTradeStats.winning_trades}
      />

      {/* Trade Filters */}
      {showFilters && (
        <TradeFilters
          showFilters={showFilters}
          filters={filters}
          onFiltersChange={setFilters}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          selectedTimeframe={selectedTimeframe}
          onTimeframeChange={setSelectedTimeframe}
          onClearFilters={() => {
            setFilters({
              symbol: '',
              side: '',
              status: '',
              strategy: '',
              date_from: '',
              date_to: '',
              min_pnl: '',
              max_pnl: '',
            });
            setSearchTerm('');
          }}
        />
      )}

      {/* Trade Table */}
      <TradeTable
        trades={filteredTrades}
        currentPage={currentPage}
        totalPages={totalPages}
        tradesPerPage={tradesPerPage}
        onPageChange={setCurrentPage}
      />
    </>
  );
};
