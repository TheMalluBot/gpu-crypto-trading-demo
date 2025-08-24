// Phase 2 Week 5 Frontend Performance Agent - Optimized Trading Panel
import React, { useState, useCallback, useMemo, memo, lazy, Suspense } from 'react';
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle, Info } from 'lucide-react';

// Lazy load heavy components
const OrderHistory = lazy(() => import('./OrderHistory'));
const AdvancedChart = lazy(() => import('./AdvancedChart'));

// Optimized interfaces with minimal data
interface OptimizedOrderForm {
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT';
  quantity: string;
  price: string;
}

interface MarketDataOptimized {
  price: number;
  change24h: number;
  volume: number;
  high24h: number;
  low24h: number;
}

interface OptimizedTradePanelProps {
  className?: string;
  marketData?: MarketDataOptimized;
  onOrderSubmit?: (order: OptimizedOrderForm) => Promise<void>;
  showAdvanced?: boolean;
}

// Memoized components for optimal performance
const PaperTradingBanner = memo(() => (
  <div className="paper-trading-banner" role="alert">
    <AlertTriangle size={20} aria-hidden="true" className="warning-icon" />
    <div>
      <span className="warning-title">Paper Trading Mode</span>
      <span className="warning-subtitle">No real money involved</span>
    </div>
  </div>
));

const MarketHeader = memo(({ marketData }: { marketData: MarketDataOptimized }) => {
  // Memoize expensive calculations
  const formattedPrice = useMemo(
    () =>
      marketData.price.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    [marketData.price]
  );

  const formattedHigh = useMemo(() => marketData.high24h.toLocaleString(), [marketData.high24h]);

  const formattedLow = useMemo(() => marketData.low24h.toLocaleString(), [marketData.low24h]);

  const changeClass = useMemo(
    () => (marketData.change24h >= 0 ? 'positive' : 'negative'),
    [marketData.change24h]
  );

  return (
    <div className="market-header">
      <div className="symbol-info">
        <h2 className="symbol-name">BTCUSDT</h2>
        <div className="price-display">
          <span
            className="current-price"
            role="text"
            aria-label={`Current price ${formattedPrice} USDT`}
          >
            ${formattedPrice}
          </span>
          <span className={`price-change ${changeClass}`}>
            {marketData.change24h >= 0 ? (
              <TrendingUp size={16} aria-hidden="true" />
            ) : (
              <TrendingDown size={16} aria-hidden="true" />
            )}
            {Math.abs(marketData.change24h)}%
          </span>
        </div>
      </div>

      <div className="market-stats">
        <div className="stat-item">
          <span className="stat-label">24h High</span>
          <span className="stat-value">${formattedHigh}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">24h Low</span>
          <span className="stat-value">${formattedLow}</span>
        </div>
      </div>
    </div>
  );
});

const OrderSummary = memo(
  ({
    orderForm,
    marketPrice,
    estimatedTotal,
  }: {
    orderForm: OptimizedOrderForm;
    marketPrice: number;
    estimatedTotal: number;
  }) => {
    // Memoize price display
    const priceDisplay = useMemo(() => {
      if (orderForm.type === 'MARKET') {
        return `~$${marketPrice.toLocaleString()}`;
      }
      return `$${parseFloat(orderForm.price || '0').toLocaleString()}`;
    }, [orderForm.type, orderForm.price, marketPrice]);

    const formattedTotal = useMemo(
      () =>
        estimatedTotal.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
      [estimatedTotal]
    );

    if (!orderForm.quantity) return null;

    return (
      <div className="order-summary">
        <h3 className="summary-title">Order Summary</h3>
        <div className="summary-row">
          <span>Type:</span>
          <span>
            {orderForm.side} {orderForm.type}
          </span>
        </div>
        <div className="summary-row">
          <span>Quantity:</span>
          <span>{orderForm.quantity} BTC</span>
        </div>
        <div className="summary-row">
          <span>Price:</span>
          <span>{priceDisplay}</span>
        </div>
        <div className="summary-row total-row">
          <span>Estimated Total:</span>
          <span className="total-amount">
            <DollarSign size={16} aria-hidden="true" />
            {formattedTotal}
          </span>
        </div>
      </div>
    );
  }
);

const LoadingSpinner = memo(() => <div className="loading-spinner" aria-hidden="true" />);

const SuccessMessage = memo(({ show }: { show: boolean }) => {
  if (!show) return null;

  return (
    <div className="success-message" role="alert" aria-live="polite">
      <div className="success-content">✅ Paper trade order placed successfully!</div>
    </div>
  );
});

// Main optimized component
const OptimizedTradePanel = memo(
  ({
    className = '',
    marketData = {
      price: 50234.56,
      change24h: 2.34,
      volume: 1234567890,
      high24h: 51000.0,
      low24h: 49500.0,
    },
    onOrderSubmit,
    showAdvanced = false,
  }: OptimizedTradePanelProps) => {
    // Optimized state management
    const [orderForm, setOrderForm] = useState<OptimizedOrderForm>({
      symbol: 'BTCUSDT',
      side: 'BUY',
      type: 'MARKET',
      quantity: '',
      price: '',
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);

    // Memoized callbacks to prevent unnecessary re-renders
    const handleInputChange = useCallback((field: keyof OptimizedOrderForm, value: string) => {
      setOrderForm(prev => ({ ...prev, [field]: value }));
    }, []);

    const handleSideChange = useCallback((side: 'BUY' | 'SELL') => {
      setOrderForm(prev => ({ ...prev, side }));
    }, []);

    const handleSubmit = useCallback(
      async (e: React.FormEvent) => {
        e.preventDefault();
        if (!orderForm.quantity) return;

        setIsSubmitting(true);

        try {
          if (onOrderSubmit) {
            await onOrderSubmit(orderForm);
          } else {
            // Simulate API call with realistic delay
            await new Promise(resolve => setTimeout(resolve, 800));
          }

          setShowConfirmation(true);
          setTimeout(() => setShowConfirmation(false), 3000);
        } catch (error) {
          console.error('Order submission failed:', error);
        } finally {
          setIsSubmitting(false);
        }
      },
      [orderForm, onOrderSubmit]
    );

    // Memoized expensive calculations
    const estimatedTotal = useMemo(() => {
      const qty = parseFloat(orderForm.quantity) || 0;
      const price =
        orderForm.type === 'MARKET' ? marketData.price : parseFloat(orderForm.price) || 0;
      return qty * price;
    }, [orderForm.quantity, orderForm.price, orderForm.type, marketData.price]);

    const isFormValid = useMemo(() => {
      return orderForm.quantity && (orderForm.type === 'MARKET' || orderForm.price);
    }, [orderForm.quantity, orderForm.type, orderForm.price]);

    const submitButtonClass = useMemo(
      () => `submit-button ${orderForm.side === 'BUY' ? 'buy-submit' : 'sell-submit'}`,
      [orderForm.side]
    );

    return (
      <div
        className={`optimized-trade-panel ${className}`}
        data-testid="optimized-trade-panel"
        role="region"
        aria-label="Trading Panel"
      >
        <PaperTradingBanner />
        <MarketHeader marketData={marketData} />

        <form onSubmit={handleSubmit} className="order-form" noValidate>
          <fieldset className="form-fieldset">
            <legend className="sr-only">Order Configuration</legend>

            {/* Optimized Buy/Sell Toggle */}
            <div className="side-selector" role="radiogroup" aria-label="Order side">
              <button
                type="button"
                role="radio"
                aria-checked={orderForm.side === 'BUY'}
                className={`side-button buy-button ${orderForm.side === 'BUY' ? 'active' : ''}`}
                onClick={() => handleSideChange('BUY')}
                aria-label="Buy order"
              >
                <TrendingUp size={16} aria-hidden="true" />
                Buy
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={orderForm.side === 'SELL'}
                className={`side-button sell-button ${orderForm.side === 'SELL' ? 'active' : ''}`}
                onClick={() => handleSideChange('SELL')}
                aria-label="Sell order"
              >
                <TrendingDown size={16} aria-hidden="true" />
                Sell
              </button>
            </div>

            {/* Order Type Selection */}
            <div className="form-group">
              <label htmlFor="order-type" className="form-label">
                Order Type
              </label>
              <select
                id="order-type"
                value={orderForm.type}
                onChange={e => handleInputChange('type', e.target.value)}
                className="form-select"
                aria-describedby="order-type-help"
              >
                <option value="MARKET">Market Order</option>
                <option value="LIMIT">Limit Order</option>
              </select>
              <div id="order-type-help" className="form-help">
                <Info size={14} aria-hidden="true" />
                {orderForm.type === 'MARKET'
                  ? 'Execute immediately at current market price'
                  : 'Execute when price reaches your specified limit'}
              </div>
            </div>

            {/* Quantity Input */}
            <div className="form-group">
              <label htmlFor="quantity" className="form-label">
                Quantity{' '}
                <span className="required-indicator" aria-label="required">
                  *
                </span>
              </label>
              <div className="input-group">
                <input
                  id="quantity"
                  type="number"
                  min="0"
                  step="0.00001"
                  value={orderForm.quantity}
                  onChange={e => handleInputChange('quantity', e.target.value)}
                  className="form-input"
                  placeholder="0.00000"
                  aria-describedby="quantity-help"
                  required
                  aria-invalid={!orderForm.quantity ? 'true' : 'false'}
                />
                <span className="input-suffix">BTC</span>
              </div>
              <div id="quantity-help" className="form-help">
                Minimum: 0.00001 BTC
              </div>
            </div>

            {/* Price Input (conditional) */}
            {orderForm.type === 'LIMIT' && (
              <div className="form-group">
                <label htmlFor="price" className="form-label">
                  Price{' '}
                  <span className="required-indicator" aria-label="required">
                    *
                  </span>
                </label>
                <div className="input-group">
                  <input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={orderForm.price}
                    onChange={e => handleInputChange('price', e.target.value)}
                    className="form-input"
                    placeholder="0.00"
                    aria-describedby="price-help"
                    required
                  />
                  <span className="input-suffix">USDT</span>
                </div>
                <div id="price-help" className="form-help">
                  Current market price: ${marketData.price.toLocaleString()}
                </div>
              </div>
            )}

            <OrderSummary
              orderForm={orderForm}
              marketPrice={marketData.price}
              estimatedTotal={estimatedTotal}
            />

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              className={submitButtonClass}
              aria-describedby="submit-help"
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner />
                  Placing Order...
                </>
              ) : (
                `${orderForm.side} ${orderForm.symbol}`
              )}
            </button>

            <div id="submit-help" className="form-help">
              This is a paper trading order - no real money will be used
            </div>
          </fieldset>
        </form>

        {/* Lazy loaded advanced features */}
        {showAdvanced && (
          <Suspense
            fallback={<div className="loading-placeholder">Loading advanced features...</div>}
          >
            <OrderHistory />
            <AdvancedChart />
          </Suspense>
        )}

        <SuccessMessage show={showConfirmation} />
      </div>
    );
  }
);

OptimizedTradePanel.displayName = 'OptimizedTradePanel';

export default OptimizedTradePanel;
