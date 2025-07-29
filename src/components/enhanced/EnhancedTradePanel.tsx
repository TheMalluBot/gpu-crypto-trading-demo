// Phase 2 Week 4 UI/UX Designer - Enhanced Trading Panel
import React, { useState, useCallback, useMemo } from 'react'
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle, Info } from 'lucide-react'

interface EnhancedTradePanelProps {
  className?: string
}

interface OrderFormData {
  symbol: string
  side: 'BUY' | 'SELL'
  type: 'MARKET' | 'LIMIT'
  quantity: string
  price: string
}

export default function EnhancedTradePanel({ className = '' }: EnhancedTradePanelProps) {
  const [orderForm, setOrderForm] = useState<OrderFormData>({
    symbol: 'BTCUSDT',
    side: 'BUY',
    type: 'MARKET',
    quantity: '',
    price: ''
  })
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)

  // Mocked market data - in real app would come from props/context
  const marketData = useMemo(() => ({
    price: 50234.56,
    change24h: 2.34,
    volume: 1234567890,
    high24h: 51000.00,
    low24h: 49500.00
  }), [])

  const handleInputChange = useCallback((field: keyof OrderFormData, value: string) => {
    setOrderForm(prev => ({ ...prev, [field]: value }))
  }, [])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orderForm.quantity) return
    
    setIsSubmitting(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsSubmitting(false)
    setShowConfirmation(true)
    setTimeout(() => setShowConfirmation(false), 3000)
  }, [orderForm])

  const estimatedTotal = useMemo(() => {
    const qty = parseFloat(orderForm.quantity) || 0
    const price = orderForm.type === 'MARKET' ? marketData.price : parseFloat(orderForm.price) || 0
    return qty * price
  }, [orderForm.quantity, orderForm.price, orderForm.type, marketData.price])

  return (
    <div 
      className={`enhanced-trade-panel ${className}`}
      data-testid="enhanced-trade-panel"
      role="region"
      aria-label="Trading Panel"
    >
      {/* Paper Trading Warning */}
      <div className="paper-trading-banner">
        <AlertTriangle 
          size={20} 
          aria-hidden="true"
          className="warning-icon"
        />
        <div>
          <span className="warning-title">Paper Trading Mode</span>
          <span className="warning-subtitle">No real money involved</span>
        </div>
      </div>

      {/* Market Data Header */}
      <div className="market-header">
        <div className="symbol-info">
          <h2 className="symbol-name">{orderForm.symbol}</h2>
          <div className="price-display">
            <span className="current-price" role="text" aria-label={`Current price ${marketData.price.toLocaleString()} USDT`}>
              ${marketData.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
            <span className={`price-change ${marketData.change24h >= 0 ? 'positive' : 'negative'}`}>
              {marketData.change24h >= 0 ? <TrendingUp size={16} aria-hidden="true" /> : <TrendingDown size={16} aria-hidden="true" />}
              {Math.abs(marketData.change24h)}%
            </span>
          </div>
        </div>
        
        <div className="market-stats">
          <div className="stat-item">
            <span className="stat-label">24h High</span>
            <span className="stat-value">${marketData.high24h.toLocaleString()}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">24h Low</span>
            <span className="stat-value">${marketData.low24h.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Order Form */}
      <form onSubmit={handleSubmit} className="order-form" noValidate>
        <fieldset className="form-fieldset">
          <legend className="sr-only">Order Type Selection</legend>
          
          {/* Buy/Sell Toggle */}
          <div className="side-selector" role="radiogroup" aria-label="Order side selection">
            <button
              type="button"
              role="radio"
              aria-checked={orderForm.side === 'BUY'}
              className={`side-button buy-button ${orderForm.side === 'BUY' ? 'active' : ''}`}
              onClick={() => handleInputChange('side', 'BUY')}
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
              onClick={() => handleInputChange('side', 'SELL')}
              aria-label="Sell order"
            >
              <TrendingDown size={16} aria-hidden="true" />
              Sell
            </button>
          </div>

          {/* Order Type */}
          <div className="form-group">
            <label htmlFor="order-type" className="form-label">Order Type</label>
            <select
              id="order-type"
              value={orderForm.type}
              onChange={(e) => handleInputChange('type', e.target.value)}
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
                : 'Execute when price reaches your specified limit'
              }
            </div>
          </div>

          {/* Quantity Input */}
          <div className="form-group">
            <label htmlFor="quantity" className="form-label">
              Quantity <span className="required-indicator" aria-label="required">*</span>
            </label>
            <div className="input-group">
              <input
                id="quantity"
                type="number"
                min="0"
                step="0.00001"
                value={orderForm.quantity}
                onChange={(e) => handleInputChange('quantity', e.target.value)}
                className="form-input"
                placeholder="0.00000"
                aria-describedby="quantity-help"
                required
                aria-invalid={!orderForm.quantity && 'true'}
              />
              <span className="input-suffix">BTC</span>
            </div>
            <div id="quantity-help" className="form-help">
              Minimum: 0.00001 BTC
            </div>
          </div>

          {/* Price Input (for limit orders) */}
          {orderForm.type === 'LIMIT' && (
            <div className="form-group">
              <label htmlFor="price" className="form-label">
                Price <span className="required-indicator" aria-label="required">*</span>
              </label>
              <div className="input-group">
                <input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={orderForm.price}
                  onChange={(e) => handleInputChange('price', e.target.value)}
                  className="form-input"
                  placeholder="0.00"
                  aria-describedby="price-help"
                  required={orderForm.type === 'LIMIT'}
                />
                <span className="input-suffix">USDT</span>
              </div>
              <div id="price-help" className="form-help">
                Current market price: ${marketData.price.toLocaleString()}
              </div>
            </div>
          )}

          {/* Order Summary */}
          {orderForm.quantity && (
            <div className="order-summary">
              <h3 className="summary-title">Order Summary</h3>
              <div className="summary-row">
                <span>Type:</span>
                <span>{orderForm.side} {orderForm.type}</span>
              </div>
              <div className="summary-row">
                <span>Quantity:</span>
                <span>{orderForm.quantity} BTC</span>
              </div>
              <div className="summary-row">
                <span>Price:</span>
                <span>
                  {orderForm.type === 'MARKET' 
                    ? `~$${marketData.price.toLocaleString()}`
                    : `$${parseFloat(orderForm.price || '0').toLocaleString()}`
                  }
                </span>
              </div>
              <div className="summary-row total-row">
                <span>Estimated Total:</span>
                <span className="total-amount">
                  <DollarSign size={16} aria-hidden="true" />
                  {estimatedTotal.toLocaleString('en-US', { 
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2 
                  })}
                </span>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!orderForm.quantity || isSubmitting || (orderForm.type === 'LIMIT' && !orderForm.price)}
            className={`submit-button ${orderForm.side === 'BUY' ? 'buy-submit' : 'sell-submit'}`}
            aria-describedby="submit-help"
          >
            {isSubmitting ? (
              <>
                <div className="loading-spinner" aria-hidden="true"></div>
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

      {/* Success Message */}
      {showConfirmation && (
        <div 
          className="success-message"
          role="alert"
          aria-live="polite"
        >
          <div className="success-content">
            ✅ Paper trade order placed successfully!
          </div>
        </div>
      )}
    </div>
  )
}

// CSS-in-JS styles would typically be in a separate stylesheet
// This is included here for demonstration of the design system