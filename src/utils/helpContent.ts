export const HELP_CONTENT = {
  dashboard: {
    title: "Dashboard Help",
    sections: [
      {
        title: "Overview",
        content: [
          "The dashboard provides a comprehensive view of your trading activity, portfolio performance, and market data.",
          "Use this page to monitor your trades, analyze performance metrics, and manage your trading profile."
        ]
      },
      {
        title: "Profile Section",
        content: [
          "View and edit your trading profile information including username, experience level, and preferred trading style.",
          "Track your overall statistics including total trades, win rate, and total volume traded.",
          "Click the edit button to update your profile information and trading preferences."
        ]
      },
      {
        title: "Market Overview",
        content: [
          "Monitor real-time market data for various cryptocurrency pairs.",
          "Click on any symbol to quickly navigate to the trading panel with that pair selected.",
          "Use the market data to identify trading opportunities and market trends."
        ]
      },
      {
        title: "Trade History",
        content: [
          "View all your past and current trades with detailed information including entry/exit prices, P&L, and fees.",
          "Use filters to search for specific trades by symbol, date range, strategy, or P&L amounts.",
          "Export your trade history to CSV format for external analysis or tax reporting.",
          "Import trades from CSV files to consolidate your trading history from multiple sources."
        ]
      }
    ]
  },
  
  trading: {
    title: "Trading Panel Help",
    sections: [
      {
        title: "Getting Started",
        content: [
          "The trading panel allows you to execute manual trades and monitor real-time market data.",
          "Select a cryptocurrency pair, choose your order type, and specify the amount to trade.",
          "Always review your order details before submitting to ensure accuracy."
        ]
      },
      {
        title: "Order Types",
        content: [
          "Market Order: Execute immediately at the current market price. Best for quick entries/exits.",
          "Limit Order: Set a specific price at which you want to buy or sell. Order executes only when price is reached.",
          "Stop-Loss Order: Automatically close a position when price moves against you to limit losses."
        ]
      },
      {
        title: "Position Management",
        content: [
          "Monitor your open positions including unrealized P&L, entry price, and current market value.",
          "Set stop-loss and take-profit levels to manage risk automatically.",
          "Close positions partially or completely based on your trading strategy."
        ]
      },
      {
        title: "Risk Management",
        content: [
          "Never risk more than you can afford to lose on a single trade.",
          "Use position sizing to limit your exposure - typically 1-3% of portfolio per trade.",
          "Always set stop-loss orders to protect against significant losses.",
          "Diversify across multiple assets to reduce concentration risk."
        ]
      }
    ]
  },

  bot: {
    title: "Trading Bot Help",
    sections: [
      {
        title: "Automated Trading",
        content: [
          "The trading bot allows you to automate your trading strategies based on predefined rules and market conditions.",
          "Configure parameters such as entry/exit signals, position size, and risk management rules.",
          "The bot will execute trades according to your strategy while you're away from the screen."
        ]
      },
      {
        title: "Bot Configuration",
        content: [
          "Set your preferred trading pairs and strategy parameters.",
          "Configure risk management settings including maximum position size and stop-loss levels.",
          "Define entry and exit conditions based on technical indicators or price movements.",
          "Test your strategy in simulation mode before deploying with real funds."
        ]
      },
      {
        title: "Monitoring Bot Performance",
        content: [
          "Regularly check bot performance metrics including win rate, average profit/loss, and total returns.",
          "Monitor bot activity logs to understand decision-making process.",
          "Adjust parameters based on market conditions and performance results.",
          "Always maintain manual oversight and be ready to intervene if needed."
        ]
      },
      {
        title: "Safety Guidelines",
        content: [
          "Start with small amounts when testing new bot strategies.",
          "Never leave the bot running without periodic supervision.",
          "Set maximum daily/weekly loss limits to prevent significant drawdowns.",
          "Keep your API keys secure and use trading-only permissions when possible."
        ]
      }
    ]
  },

  settings: {
    title: "Settings Help",
    sections: [
      {
        title: "Application Settings",
        content: [
          "Customize the application appearance, behavior, and performance options.",
          "Configure API connections for real trading or use demo mode for practice.",
          "Set up notifications for important events like trade executions or bot alerts."
        ]
      },
      {
        title: "Performance Options",
        content: [
          "Disable animations if you experience performance issues on lower-end devices.",
          "Adjust chart refresh rates to balance between real-time data and system performance.",
          "Configure GPU acceleration settings for optimal rendering performance."
        ]
      },
      {
        title: "Security Settings",
        content: [
          "Enable two-factor authentication for enhanced account security.",
          "Configure session timeout settings for automatic logout.",
          "Review and manage API key permissions for connected exchanges.",
          "Set up backup and recovery options for your trading data."
        ]
      }
    ]
  }
};