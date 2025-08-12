// Phase 2 Week 5 Frontend Performance Agent - Virtualized List Component
import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';

interface VirtualizedListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number, style: React.CSSProperties) => React.ReactNode;
  overscan?: number;
  className?: string;
  onScroll?: (scrollTop: number) => void;
}

interface VisibleRange {
  start: number;
  end: number;
}

// Optimized virtualized list for large datasets
const VirtualizedList = memo(
  <T,>({
    items,
    itemHeight,
    containerHeight,
    renderItem,
    overscan = 5,
    className = '',
    onScroll,
  }: VirtualizedListProps<T>) => {
    const [scrollTop, setScrollTop] = useState(0);

    // Calculate visible range with memoization
    const visibleRange = useMemo((): VisibleRange => {
      const start = Math.floor(scrollTop / itemHeight);
      const end = Math.min(start + Math.ceil(containerHeight / itemHeight), items.length - 1);

      return {
        start: Math.max(0, start - overscan),
        end: Math.min(items.length - 1, end + overscan),
      };
    }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

    // Memoize visible items to prevent unnecessary re-renders
    const visibleItems = useMemo(() => {
      const result = [];
      for (let i = visibleRange.start; i <= visibleRange.end; i++) {
        if (items[i]) {
          result.push({
            item: items[i],
            index: i,
            style: {
              position: 'absolute' as const,
              top: i * itemHeight,
              left: 0,
              right: 0,
              height: itemHeight,
            },
          });
        }
      }
      return result;
    }, [items, visibleRange.start, visibleRange.end, itemHeight]);

    // Total height for scrollbar
    const totalHeight = items.length * itemHeight;

    // Optimized scroll handler
    const handleScroll = useCallback(
      (e: React.UIEvent<HTMLDivElement>) => {
        const newScrollTop = e.currentTarget.scrollTop;
        setScrollTop(newScrollTop);
        onScroll?.(newScrollTop);
      },
      [onScroll]
    );

    return (
      <div
        className={`virtualized-list ${className}`}
        style={{
          height: containerHeight,
          overflow: 'auto',
          position: 'relative',
        }}
        onScroll={handleScroll}
        role="list"
        aria-label="Virtualized list"
      >
        {/* Virtual spacer for total height */}
        <div
          style={{
            height: totalHeight,
            position: 'relative',
          }}
        >
          {/* Render only visible items */}
          {visibleItems.map(({ item, index, style }) => (
            <div
              key={index}
              style={style}
              role="listitem"
              aria-setsize={items.length}
              aria-posinset={index + 1}
            >
              {renderItem(item, index, style)}
            </div>
          ))}
        </div>
      </div>
    );
  }
);

VirtualizedList.displayName = 'VirtualizedList';

export default VirtualizedList;

// Specialized virtualized components for trading data

export interface OrderHistoryItem {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  type: string;
  quantity: number;
  price: number;
  timestamp: Date;
  status: string;
}

// Optimized order history row component
const OrderHistoryRow = memo(
  ({ order, style }: { order: OrderHistoryItem; style: React.CSSProperties }) => {
    const formattedPrice = useMemo(
      () =>
        order.price.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
      [order.price]
    );

    const formattedQuantity = useMemo(() => order.quantity.toFixed(6), [order.quantity]);

    const formattedTime = useMemo(() => order.timestamp.toLocaleTimeString(), [order.timestamp]);

    const sideClass = order.side === 'BUY' ? 'buy-order' : 'sell-order';

    return (
      <div className={`order-row ${sideClass}`} style={style}>
        <div className="order-time">{formattedTime}</div>
        <div className="order-symbol">{order.symbol}</div>
        <div className="order-side">{order.side}</div>
        <div className="order-quantity">{formattedQuantity}</div>
        <div className="order-price">${formattedPrice}</div>
        <div className="order-status">{order.status}</div>
      </div>
    );
  }
);

OrderHistoryRow.displayName = 'OrderHistoryRow';

// Virtualized order history component
export const VirtualizedOrderHistory = memo(
  ({ orders, containerHeight = 300 }: { orders: OrderHistoryItem[]; containerHeight?: number }) => {
    const renderOrderItem = useCallback(
      (order: OrderHistoryItem, index: number, style: React.CSSProperties) => (
        <OrderHistoryRow key={order.id} order={order} style={style} />
      ),
      []
    );

    return (
      <div className="virtualized-order-history">
        <div className="order-history-header">
          <div>Time</div>
          <div>Symbol</div>
          <div>Side</div>
          <div>Quantity</div>
          <div>Price</div>
          <div>Status</div>
        </div>
        <VirtualizedList
          items={orders}
          itemHeight={40}
          containerHeight={containerHeight}
          renderItem={renderOrderItem}
          className="order-history-list"
        />
      </div>
    );
  }
);

VirtualizedOrderHistory.displayName = 'VirtualizedOrderHistory';

// Market data item interface
export interface MarketDataItem {
  symbol: string;
  price: number;
  change24h: number;
  volume: number;
}

// Optimized market data row
const MarketDataRow = memo(
  ({ data, style }: { data: MarketDataItem; style: React.CSSProperties }) => {
    const formattedPrice = useMemo(
      () =>
        data.price.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
      [data.price]
    );

    const formattedVolume = useMemo(() => {
      if (data.volume > 1000000) {
        return `${(data.volume / 1000000).toFixed(1)}M`;
      } else if (data.volume > 1000) {
        return `${(data.volume / 1000).toFixed(1)}K`;
      }
      return data.volume.toString();
    }, [data.volume]);

    const changeClass = data.change24h >= 0 ? 'positive' : 'negative';

    return (
      <div className="market-data-row" style={style}>
        <div className="market-symbol">{data.symbol}</div>
        <div className="market-price">${formattedPrice}</div>
        <div className={`market-change ${changeClass}`}>
          {data.change24h >= 0 ? '+' : ''}
          {data.change24h.toFixed(2)}%
        </div>
        <div className="market-volume">{formattedVolume}</div>
      </div>
    );
  }
);

MarketDataRow.displayName = 'MarketDataRow';

// Virtualized market data component
export const VirtualizedMarketData = memo(
  ({
    marketData,
    containerHeight = 400,
  }: {
    marketData: MarketDataItem[];
    containerHeight?: number;
  }) => {
    const renderMarketItem = useCallback(
      (data: MarketDataItem, index: number, style: React.CSSProperties) => (
        <MarketDataRow key={data.symbol} data={data} style={style} />
      ),
      []
    );

    return (
      <div className="virtualized-market-data">
        <div className="market-data-header">
          <div>Symbol</div>
          <div>Price</div>
          <div>24h Change</div>
          <div>Volume</div>
        </div>
        <VirtualizedList
          items={marketData}
          itemHeight={50}
          containerHeight={containerHeight}
          renderItem={renderMarketItem}
          className="market-data-list"
        />
      </div>
    );
  }
);

VirtualizedMarketData.displayName = 'VirtualizedMarketData';
