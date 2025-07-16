import './style.css'

// Application state
const state = {
  currentPanel: 'trade',
  currentPrice: 67234.50,
  priceChange: 2.45,
  paperTrading: true,
  isAnimationsEnabled: true,
  positions: [
    { symbol: 'BTCUSDT', side: 'LONG', entry: 66800, quantity: 100, pnl: 434.50 },
    { symbol: 'ETHUSDT', side: 'SHORT', entry: 3420, quantity: 200, pnl: -45.23 },
    { symbol: 'ADAUSDT', side: 'LONG', entry: 0.45, quantity: 500, pnl: 845.29 }
  ]
}

// Create animated particles
function createParticles() {
  const container = document.getElementById('particles');
  const particleCount = 150;
  
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.left = Math.random() * 100 + '%';
    particle.style.top = Math.random() * 100 + '%';
    particle.style.animationDelay = Math.random() * 6 + 's';
    particle.style.animationDuration = (Math.random() * 3 + 3) + 's';
    
    // Random colors for particles
    const colors = [
      'rgba(59, 130, 246, 0.6)',   // Blue
      'rgba(168, 85, 247, 0.6)',   // Purple
      'rgba(16, 185, 129, 0.6)',   // Green
      'rgba(245, 158, 11, 0.6)',   // Yellow
      'rgba(239, 68, 68, 0.6)'     // Red
    ];
    particle.style.background = colors[Math.floor(Math.random() * colors.length)];
    
    container.appendChild(particle);
  }
}

// Navigation functionality
function setupNavigation() {
  const navButtons = {
    trade: document.getElementById('trade-btn'),
    analytics: document.getElementById('analytics-btn'),
    settings: document.getElementById('settings-btn')
  };
  
  const panels = {
    trade: document.getElementById('trade-panel'),
    analytics: document.getElementById('analytics-panel'),
    settings: document.getElementById('settings-panel')
  };
  
  function switchPanel(panelName) {
    // Hide all panels
    Object.values(panels).forEach(panel => panel.classList.add('hidden'));
    
    // Remove active class from all buttons
    Object.values(navButtons).forEach(btn => btn.classList.remove('active'));
    
    // Show selected panel and activate button
    panels[panelName].classList.remove('hidden');
    navButtons[panelName].classList.add('active');
    
    state.currentPanel = panelName;
  }
  
  // Add click listeners
  Object.entries(navButtons).forEach(([panelName, button]) => {
    button.addEventListener('click', () => switchPanel(panelName));
  });
}

// Simulate realistic price updates
function updatePrices() {
  const priceElement = document.querySelector('.current-price');
  const changeElement = document.querySelector('.price-change');
  
  setInterval(() => {
    // Random price movement
    const volatility = 0.002; // 0.2% volatility
    const change = (Math.random() - 0.5) * 2 * volatility;
    const newPrice = state.currentPrice * (1 + change);
    const changePercent = ((newPrice - state.currentPrice) / state.currentPrice) * 100;
    
    state.currentPrice = newPrice;
    state.priceChange = changePercent;
    
    // Update price display
    priceElement.textContent = `$${newPrice.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
    
    // Update change display
    const isPositive = changePercent >= 0;
    changeElement.className = `flex items-center space-x-1 ${isPositive ? 'price-up' : 'price-down'}`;
    changeElement.innerHTML = `
      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="${isPositive ? 
          'M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z' :
          'M14.707 12.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l2.293-2.293a1 1 0 011.414 0z'
        }" clip-rule="evenodd"></path>
      </svg>
      <span>${isPositive ? '+' : ''}${changePercent.toFixed(2)}%</span>
    `;
    
    // Update portfolio P/L
    updatePortfolio();
  }, 3000);
}

// Update portfolio values
function updatePortfolio() {
  const totalPnL = state.positions.reduce((sum, pos) => sum + pos.pnl, 0);
  const totalPnLElement = document.querySelector('.total-pnl');
  
  if (totalPnLElement) {
    totalPnLElement.textContent = `$${totalPnL.toFixed(2)}`;
    totalPnLElement.className = `text-xl font-bold ${totalPnL >= 0 ? 'price-up' : 'price-down'}`;
  }
}

// Setup interactive toggles
function setupToggles() {
  const paperTradingToggle = document.getElementById('paper-trading-toggle');
  const animationToggle = document.getElementById('animation-toggle');
  
  paperTradingToggle?.addEventListener('click', () => {
    state.paperTrading = !state.paperTrading;
    paperTradingToggle.classList.toggle('bg-blue-500', state.paperTrading);
    paperTradingToggle.classList.toggle('bg-white/20', !state.paperTrading);
    
    const dot = paperTradingToggle.querySelector('div');
    dot.style.transform = state.paperTrading ? 'translateX(20px)' : 'translateX(0)';
  });
  
  animationToggle?.addEventListener('click', () => {
    state.isAnimationsEnabled = !state.isAnimationsEnabled;
    animationToggle.classList.toggle('bg-blue-500', state.isAnimationsEnabled);
    animationToggle.classList.toggle('bg-white/20', !state.isAnimationsEnabled);
    
    const dot = animationToggle.querySelector('div');
    dot.style.transform = state.isAnimationsEnabled ? 'translateX(20px)' : 'translateX(0)';
    
    // Toggle particles visibility
    const particles = document.getElementById('particles');
    particles.style.display = state.isAnimationsEnabled ? 'block' : 'none';
  });
}

// Setup order form interactions
function setupOrderForm() {
  const longBtn = document.getElementById('long-btn');
  const shortBtn = document.getElementById('short-btn');
  const placeOrderBtn = document.getElementById('place-order-btn');
  
  let selectedSide = 'LONG';
  
  longBtn?.addEventListener('click', () => {
    selectedSide = 'LONG';
    longBtn.classList.add('bg-green-500', 'text-white');
    longBtn.classList.remove('glass-card', 'text-white/80');
    shortBtn.classList.remove('bg-red-500', 'text-white');
    shortBtn.classList.add('glass-card', 'text-white/80');
    
    placeOrderBtn.textContent = 'Place Long Order';
    placeOrderBtn.className = 'w-full py-3 px-4 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg trade-btn';
  });
  
  shortBtn?.addEventListener('click', () => {
    selectedSide = 'SHORT';
    shortBtn.classList.add('bg-red-500', 'text-white');
    shortBtn.classList.remove('glass-card', 'text-white/80');
    longBtn.classList.remove('bg-green-500', 'text-white');
    longBtn.classList.add('glass-card', 'text-white/80');
    
    placeOrderBtn.textContent = 'Place Short Order';
    placeOrderBtn.className = 'w-full py-3 px-4 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg trade-btn';
  });
  
  placeOrderBtn?.addEventListener('click', () => {
    // Simulate order placement
    const quantity = document.getElementById('quantity-input')?.value || 100;
    const symbol = document.getElementById('symbol-select')?.value || 'BTCUSDT';
    
    // Add visual feedback
    placeOrderBtn.textContent = 'Placing Order...';
    placeOrderBtn.disabled = true;
    
    setTimeout(() => {
      // Simulate adding new position
      const newPosition = {
        symbol: symbol,
        side: selectedSide,
        entry: state.currentPrice,
        quantity: parseFloat(quantity),
        pnl: 0
      };
      
      state.positions.unshift(newPosition);
      updatePortfolio();
      
      placeOrderBtn.textContent = `Place ${selectedSide} Order`;
      placeOrderBtn.disabled = false;
      
      // Show success message
      showNotification(`${selectedSide} order placed successfully!`, 'success');
    }, 1500);
  });
}

// Show notification
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `fixed top-4 right-4 z-50 px-6 py-3 rounded-lg text-white font-medium transition-all duration-300 ${
    type === 'success' ? 'bg-green-500' : 
    type === 'error' ? 'bg-red-500' : 
    'bg-blue-500'
  }`;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateY(-20px)';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Update FPS counter
function updateFPS() {
  const fpsElement = document.querySelector('.fps-counter');
  let fps = 60;
  
  setInterval(() => {
    fps = 58 + Math.random() * 6; // Simulate 58-64 FPS
    if (fpsElement) {
      fpsElement.textContent = `${fps.toFixed(1)} FPS`;
    }
  }, 1000);
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  createParticles();
  setupNavigation();
  updatePrices();
  setupToggles();
  setupOrderForm();
  updateFPS();
  updatePortfolio();
  
  console.log('🚀 Crypto Trader Preview loaded successfully!');
  console.log('💡 Click the navigation tabs to explore different panels');
  console.log('🎯 Try placing orders and toggling settings');
});

// Export for debugging
window.cryptoTrader = {
  state,
  showNotification
};