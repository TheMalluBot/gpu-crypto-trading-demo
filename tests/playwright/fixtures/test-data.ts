/**
 * Test data fixtures for cryptocurrency trading app tests
 */

export const TRADING_SYMBOLS = [
  'BTCUSDT',
  'ETHUSDT',
  'ADAUSDT',
  'DOTUSDT',
  'LINKUSDT'
] as const;

export const INVALID_API_CREDENTIALS = {
  hmac: {
    api_key: 'invalid_key_too_short',
    api_secret: 'invalid_secret_too_short',
    type: 'HMAC' as const
  },
  ed25519: {
    api_key: 'invalid_ed25519_key',
    api_secret: 'invalid_ed25519_private_key',
    type: 'Ed25519' as const
  },
  rsa: {
    api_key: 'invalid_rsa_key',
    api_secret: 'not_a_pem_key',
    type: 'RSA' as const
  }
};

export const VALID_TEST_CREDENTIALS = {
  hmac: {
    api_key: 'test_hmac_key_64_characters_long_for_testing_purposes_only_mock',
    api_secret: 'test_hmac_secret_64_characters_long_for_testing_purposes_mock',
    type: 'HMAC' as const
  },
  ed25519: {
    api_key: 'test_ed25519_public_key_44_chars_mock_test_data',
    api_secret: 'test_ed25519_private_key_base64_encoded_mock_data_for_testing_purposes_only_not_real',
    type: 'Ed25519' as const
  }
};

export const TRADE_TEST_DATA = {
  validTrade: {
    symbol: 'BTCUSDT',
    side: 'Long' as const,
    orderType: 'Market' as const,
    quantity: 100,
    takeProfitPercent: 2,
    stopLossPercent: 1
  },
  invalidTrades: [
    {
      symbol: '',
      side: 'Long' as const,
      orderType: 'Market' as const,
      quantity: 0,
      error: 'Invalid symbol and quantity'
    },
    {
      symbol: 'BTCUSDT',
      side: 'Long' as const,
      orderType: 'Limit' as const,
      quantity: 100,
      entryPrice: 0,
      error: 'Entry price required for limit orders'
    },
    {
      symbol: 'BTCUSDT',
      side: 'Long' as const,
      orderType: 'Market' as const,
      quantity: -10,
      error: 'Negative quantity not allowed'
    }
  ]
};

export const SETTINGS_TEST_DATA = {
  urls: {
    mainnet: 'https://api.binance.com',
    testnet: 'https://testnet.binance.vision',
    invalid: 'not-a-valid-url',
    malicious: 'javascript:alert("xss")'
  },
  themeSettings: {
    professional: 'Professional',
    animations: {
      enabled: false,
      disabled: true
    },
    performance: {
      enabled: true,
      disabled: false
    }
  }
};

export const ACCESSIBILITY_TEST_DATA = {
  requiredAriaLabels: [
    'Skip to main content',
    'Toggle testnet mode',
    'Toggle background animations',
    'Toggle performance mode'
  ],
  focusableElements: [
    'button',
    'input',
    'select',
    'textarea',
    'a[href]',
    '[tabindex]:not([tabindex="-1"])'
  ],
  headingStructure: [
    'h1',
    'h2',
    'h3'
  ]
};

export const SECURITY_TEST_DATA = {
  xssAttempts: [
    '<script>alert("xss")</script>',
    'javascript:void(0)',
    'onload="alert(1)"',
    '"><script>alert(document.cookie)</script>',
    "'; DROP TABLE users; --"
  ],
  sqlInjectionAttempts: [
    "' OR '1'='1",
    "'; DROP TABLE trades; --",
    "' UNION SELECT * FROM users --",
    "admin'--",
    "' OR 1=1#"
  ],
  invalidInputs: {
    negativeNumbers: [-1, -100, -0.001],
    extremeNumbers: [Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER, Infinity, -Infinity],
    specialCharacters: ['<>', '&amp;', '"quotes"', "'single'", '\n\r\t'],
    emptyStrings: ['', '   ', '\0', null, undefined]
  }
};

export const RESPONSIVE_BREAKPOINTS = {
  mobile: { width: 375, height: 667 },
  mobileLarge: { width: 425, height: 760 },
  tablet: { width: 768, height: 1024 },
  tabletLarge: { width: 1024, height: 768 },
  desktop: { width: 1440, height: 900 },
  desktopLarge: { width: 1920, height: 1080 }
} as const;

export const PERFORMANCE_THRESHOLDS = {
  loadTime: 5000, // 5 seconds max
  domContentLoaded: 3000, // 3 seconds max
  firstPaint: 2000, // 2 seconds max
  firstContentfulPaint: 2500, // 2.5 seconds max
  largestContentfulPaint: 4000, // 4 seconds max
  cumulativeLayoutShift: 0.25, // CLS threshold
  firstInputDelay: 300 // 300ms max
} as const;

export const ERROR_MESSAGES = {
  connection: {
    failed: 'Connection failed',
    timeout: 'Connection timeout',
    unauthorized: 'Unauthorized'
  },
  validation: {
    required: 'is required',
    invalid: 'is invalid',
    tooShort: 'too short',
    tooLong: 'too long'
  },
  trading: {
    paperMode: 'Paper Trading',
    insufficientFunds: 'Insufficient funds',
    invalidSymbol: 'Invalid symbol',
    marketClosed: 'Market closed'
  }
} as const;