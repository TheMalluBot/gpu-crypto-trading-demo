import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle, Info, BookOpen, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TooltipProps {
  content: string | React.ReactNode;
  title?: string;
  learnMoreUrl?: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  delay?: number;
  children?: React.ReactNode;
  className?: string;
  variant?: 'simple' | 'detailed';
}

export const HelpTooltip: React.FC<TooltipProps> = ({
  content,
  title,
  learnMoreUrl,
  position = 'auto',
  delay = 300,
  children,
  className = '',
  variant = 'simple'
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [actualPosition, setActualPosition] = useState(position);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible && position === 'auto' && tooltipRef.current && triggerRef.current) {
      const tooltip = tooltipRef.current;
      const trigger = triggerRef.current;
      const rect = trigger.getBoundingClientRect();
      
      // Determine best position based on available space
      const spaceAbove = rect.top;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceLeft = rect.left;
      const spaceRight = window.innerWidth - rect.right;
      
      // Tooltip dimensions (approximate)
      const tooltipHeight = 100;
      const tooltipWidth = 250;
      
      let bestPosition: typeof position = 'top';
      
      if (spaceAbove > tooltipHeight) {
        bestPosition = 'top';
      } else if (spaceBelow > tooltipHeight) {
        bestPosition = 'bottom';
      } else if (spaceRight > tooltipWidth) {
        bestPosition = 'right';
      } else if (spaceLeft > tooltipWidth) {
        bestPosition = 'left';
      }
      
      setActualPosition(bestPosition);
    }
  }, [isVisible, position]);

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsVisible(!isVisible);
  };

  const getPositionClasses = () => {
    const positions = {
      top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
      bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
      left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
      right: 'left-full top-1/2 transform -translate-y-1/2 ml-2',
    };
    return positions[actualPosition === 'auto' ? 'top' : actualPosition];
  };

  const getArrowClasses = () => {
    const arrows = {
      top: 'bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45',
      bottom: 'top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rotate-45',
      left: 'right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2 rotate-45',
      right: 'left-0 top-1/2 transform -translate-x-1/2 -translate-y-1/2 rotate-45',
    };
    return arrows[actualPosition === 'auto' ? 'top' : actualPosition];
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        className="cursor-help inline-flex items-center"
      >
        {children || (
          <HelpCircle className="w-4 h-4 text-gray-400 hover:text-gray-600 transition-colors" />
        )}
      </div>
      
      <AnimatePresence>
        {isVisible && (
          <motion.div
            ref={tooltipRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className={`absolute z-50 ${getPositionClasses()}`}
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={handleMouseLeave}
          >
            {variant === 'simple' ? (
              <div className="bg-gray-900 text-white text-sm rounded-lg shadow-lg px-3 py-2 max-w-xs">
                {content}
                <div className={`absolute w-2 h-2 bg-gray-900 ${getArrowClasses()}`} />
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl shadow-xl p-4 max-w-sm">
                {title && (
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="w-4 h-4 text-blue-500" />
                    <h4 className="font-semibold text-gray-900">{title}</h4>
                  </div>
                )}
                <div className="text-sm text-gray-700 leading-relaxed">
                  {content}
                </div>
                {learnMoreUrl && (
                  <a
                    href={learnMoreUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-3 text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    <BookOpen className="w-3 h-3" />
                    Learn more
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                <div className={`absolute w-3 h-3 bg-white border-l border-t border-gray-200 ${getArrowClasses()}`} />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Preset tooltips for common trading terms
export const TradingTermTooltip: React.FC<{ term: string; children?: React.ReactNode }> = ({ term, children }) => {
  const terms: Record<string, { title: string; content: string; learnMoreUrl?: string }> = {
    'lro': {
      title: 'Linear Regression Oscillator',
      content: 'A technical indicator that uses linear regression to identify trend direction and potential reversal points. Values above zero suggest uptrend, below zero suggest downtrend.',
      learnMoreUrl: '#'
    },
    'portfolio-heat': {
      title: 'Portfolio Heat',
      content: 'The total percentage of your portfolio at risk across all open positions. Keeping this below 6% helps prevent large drawdowns.',
      learnMoreUrl: '#'
    },
    'stop-loss': {
      title: 'Stop Loss',
      content: 'An automatic order that closes your position when the price moves against you by a certain amount, limiting your losses.',
      learnMoreUrl: '#'
    },
    'take-profit': {
      title: 'Take Profit',
      content: 'An automatic order that closes your position when the price reaches your target profit level, securing your gains.',
      learnMoreUrl: '#'
    },
    'paper-trading': {
      title: 'Paper Trading',
      content: 'Practice trading with virtual money instead of real funds. Perfect for learning and testing strategies without financial risk.',
      learnMoreUrl: '#'
    },
    'kelly-criterion': {
      title: 'Kelly Criterion',
      content: 'A mathematical formula that calculates the optimal position size based on your win rate and risk/reward ratio. Helps maximize long-term growth.',
      learnMoreUrl: '#'
    },
    'slippage': {
      title: 'Slippage',
      content: 'The difference between the expected price of a trade and the actual price at which it executes. Common during high volatility.',
      learnMoreUrl: '#'
    },
    'spread': {
      title: 'Bid-Ask Spread',
      content: 'The difference between the buying price (ask) and selling price (bid). Lower spreads mean lower trading costs.',
      learnMoreUrl: '#'
    },
    'leverage': {
      title: 'Leverage',
      content: 'Trading with borrowed funds to increase position size. Amplifies both profits and losses. Use with extreme caution.',
      learnMoreUrl: '#'
    },
    'market-order': {
      title: 'Market Order',
      content: 'An order to buy or sell immediately at the current market price. Executes quickly but price is not guaranteed.',
      learnMoreUrl: '#'
    },
    'limit-order': {
      title: 'Limit Order',
      content: 'An order to buy or sell at a specific price or better. Guarantees price but not execution.',
      learnMoreUrl: '#'
    },
    'volatility': {
      title: 'Volatility',
      content: 'How much and how quickly prices move. Higher volatility means larger price swings and higher risk.',
      learnMoreUrl: '#'
    }
  };

  const termData = terms[term.toLowerCase()] || {
    title: term,
    content: 'Information about this term is coming soon.'
  };

  return (
    <HelpTooltip
      title={termData.title}
      content={termData.content}
      learnMoreUrl={termData.learnMoreUrl}
      variant="detailed"
    >
      {children}
    </HelpTooltip>
  );
};

// Quick info tooltip for inline help
export const QuickInfo: React.FC<{ text: string }> = ({ text }) => (
  <HelpTooltip content={text} variant="simple" delay={100}>
    <Info className="w-3 h-3 text-gray-400 inline-block ml-1" />
  </HelpTooltip>
);