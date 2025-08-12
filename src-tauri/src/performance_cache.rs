// Advanced Performance Cache System
// AGENT-TRADER-PRO Phase 2 Performance Optimization

use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::RwLock;
use serde::{Serialize, Deserialize};
use rust_decimal::Decimal;
use crate::models::{MarketStats, OrderBookDepth, KlineData};

/// Cache entry with expiration and hit tracking
#[derive(Debug, Clone)]
struct CacheEntry<T> {
    data: T,
    created_at: Instant,
    expires_at: Instant,
    access_count: u64,
    last_accessed: Instant,
}

impl<T> CacheEntry<T> {
    fn new(data: T, ttl: Duration) -> Self {
        let now = Instant::now();
        Self {
            data,
            created_at: now,
            expires_at: now + ttl,
            access_count: 0,
            last_accessed: now,
        }
    }

    fn is_expired(&self) -> bool {
        Instant::now() > self.expires_at
    }

    fn access(&mut self) -> &T {
        self.access_count += 1;
        self.last_accessed = Instant::now();
        &self.data
    }
}

/// High-performance cache with intelligent eviction
pub struct PerformanceCache {
    market_stats: Arc<RwLock<HashMap<String, CacheEntry<MarketStats>>>>,
    order_books: Arc<RwLock<HashMap<String, CacheEntry<OrderBookDepth>>>>,
    kline_data: Arc<RwLock<HashMap<String, CacheEntry<Vec<KlineData>>>>>,
    cache_stats: Arc<RwLock<CacheStatistics>>,
    config: CacheConfig,
}

#[derive(Debug, Clone)]
pub struct CacheConfig {
    pub market_stats_ttl: Duration,
    pub order_book_ttl: Duration,
    pub kline_data_ttl: Duration,
    pub max_entries_per_type: usize,
    pub cleanup_interval: Duration,
}

impl Default for CacheConfig {
    fn default() -> Self {
        Self {
            market_stats_ttl: Duration::from_secs(5),     // 5 seconds for market stats
            order_book_ttl: Duration::from_millis(500),   // 500ms for order books
            kline_data_ttl: Duration::from_secs(60),      // 1 minute for kline data
            max_entries_per_type: 100,
            cleanup_interval: Duration::from_secs(30),
        }
    }
}

#[derive(Debug, Default, Clone)]
pub struct CacheStatistics {
    pub hits: u64,
    pub misses: u64,
    pub evictions: u64,
    pub expired_entries: u64,
    pub total_entries: usize,
    pub memory_estimate_bytes: usize,
}

impl CacheStatistics {
    pub fn hit_rate(&self) -> f64 {
        if self.hits + self.misses == 0 {
            0.0
        } else {
            self.hits as f64 / (self.hits + self.misses) as f64
        }
    }
}

impl PerformanceCache {
    pub fn new(config: CacheConfig) -> Self {
        Self {
            market_stats: Arc::new(RwLock::new(HashMap::new())),
            order_books: Arc::new(RwLock::new(HashMap::new())),
            kline_data: Arc::new(RwLock::new(HashMap::new())),
            cache_stats: Arc::new(RwLock::new(CacheStatistics::default())),
            config,
        }
    }

    /// Get market stats from cache or return None if not found/expired
    pub async fn get_market_stats(&self, symbol: &str) -> Option<MarketStats> {
        let mut cache = self.market_stats.write().await;
        let mut stats = self.cache_stats.write().await;

        if let Some(entry) = cache.get_mut(symbol) {
            if !entry.is_expired() {
                stats.hits += 1;
                return Some(entry.access().clone());
            } else {
                cache.remove(symbol);
                stats.expired_entries += 1;
            }
        }

        stats.misses += 1;
        None
    }

    /// Cache market stats with TTL
    pub async fn set_market_stats(&self, symbol: String, data: MarketStats) {
        let mut cache = self.market_stats.write().await;
        let mut stats = self.cache_stats.write().await;

        // Evict old entries if at capacity
        if cache.len() >= self.config.max_entries_per_type {
            self.evict_lru_market_stats(&mut cache, &mut stats).await;
        }

        cache.insert(symbol, CacheEntry::new(data, self.config.market_stats_ttl));
        stats.total_entries = cache.len();
    }

    /// Get order book from cache
    pub async fn get_order_book(&self, symbol: &str) -> Option<OrderBookDepth> {
        let mut cache = self.order_books.write().await;
        let mut stats = self.cache_stats.write().await;

        if let Some(entry) = cache.get_mut(symbol) {
            if !entry.is_expired() {
                stats.hits += 1;
                return Some(entry.access().clone());
            } else {
                cache.remove(symbol);
                stats.expired_entries += 1;
            }
        }

        stats.misses += 1;
        None
    }

    /// Cache order book data
    pub async fn set_order_book(&self, symbol: String, data: OrderBookDepth) {
        let mut cache = self.order_books.write().await;
        let mut stats = self.cache_stats.write().await;

        if cache.len() >= self.config.max_entries_per_type {
            self.evict_lru_order_books(&mut cache, &mut stats).await;
        }

        cache.insert(symbol, CacheEntry::new(data, self.config.order_book_ttl));
        stats.total_entries += cache.len();
    }

    /// Get kline data from cache
    pub async fn get_kline_data(&self, key: &str) -> Option<Vec<KlineData>> {
        let mut cache = self.kline_data.write().await;
        let mut stats = self.cache_stats.write().await;

        if let Some(entry) = cache.get_mut(key) {
            if !entry.is_expired() {
                stats.hits += 1;
                return Some(entry.access().clone());
            } else {
                cache.remove(key);
                stats.expired_entries += 1;
            }
        }

        stats.misses += 1;
        None
    }

    /// Cache kline data
    pub async fn set_kline_data(&self, key: String, data: Vec<KlineData>) {
        let mut cache = self.kline_data.write().await;
        let mut stats = self.cache_stats.write().await;

        if cache.len() >= self.config.max_entries_per_type {
            self.evict_lru_kline_data(&mut cache, &mut stats).await;
        }

        cache.insert(key, CacheEntry::new(data, self.config.kline_data_ttl));
        stats.total_entries += cache.len();
    }

    /// Generate cache key for kline data
    pub fn kline_cache_key(&self, symbol: &str, interval: &str, limit: u32) -> String {
        format!("{}:{}:{}", symbol, interval, limit)
    }

    /// Get comprehensive cache statistics
    pub async fn get_statistics(&self) -> CacheStatistics {
        let stats = self.cache_stats.read().await;
        let mut result = stats.clone();
        
        // Update total entries count
        let market_count = self.market_stats.read().await.len();
        let order_book_count = self.order_books.read().await.len();
        let kline_count = self.kline_data.read().await.len();
        
        result.total_entries = market_count + order_book_count + kline_count;
        result.memory_estimate_bytes = self.estimate_memory_usage().await;
        
        result
    }

    /// Estimate total memory usage
    async fn estimate_memory_usage(&self) -> usize {
        // Rough estimation of memory usage
        let market_count = self.market_stats.read().await.len();
        let order_book_count = self.order_books.read().await.len();
        let kline_count = self.kline_data.read().await.len();

        // Approximate sizes in bytes
        const MARKET_STATS_SIZE: usize = 256;
        const ORDER_BOOK_SIZE: usize = 2048;
        const KLINE_DATA_SIZE: usize = 1024;

        (market_count * MARKET_STATS_SIZE) +
        (order_book_count * ORDER_BOOK_SIZE) +
        (kline_count * KLINE_DATA_SIZE)
    }

    /// Clean up expired entries
    pub async fn cleanup_expired(&self) {
        let mut stats = self.cache_stats.write().await;
        
        // Clean market stats
        {
            let mut cache = self.market_stats.write().await;
            let initial_count = cache.len();
            cache.retain(|_, entry| !entry.is_expired());
            stats.expired_entries += (initial_count - cache.len()) as u64;
        }

        // Clean order books
        {
            let mut cache = self.order_books.write().await;
            let initial_count = cache.len();
            cache.retain(|_, entry| !entry.is_expired());
            stats.expired_entries += (initial_count - cache.len()) as u64;
        }

        // Clean kline data
        {
            let mut cache = self.kline_data.write().await;
            let initial_count = cache.len();
            cache.retain(|_, entry| !entry.is_expired());
            stats.expired_entries += (initial_count - cache.len()) as u64;
        }
    }

    /// Clear all cached data
    pub async fn clear_all(&self) {
        self.market_stats.write().await.clear();
        self.order_books.write().await.clear();
        self.kline_data.write().await.clear();
        
        let mut stats = self.cache_stats.write().await;
        *stats = CacheStatistics::default();
    }

    /// Start background cleanup task
    pub fn start_cleanup_task(cache: Arc<Self>) {
        let cleanup_interval = cache.config.cleanup_interval;
        
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(cleanup_interval);
            
            loop {
                interval.tick().await;
                cache.cleanup_expired().await;
            }
        });
    }

    // LRU eviction methods
    async fn evict_lru_market_stats(
        &self,
        cache: &mut HashMap<String, CacheEntry<MarketStats>>,
        stats: &mut CacheStatistics,
    ) {
        if let Some((key, _)) = cache.iter()
            .min_by_key(|(_, entry)| entry.last_accessed)
            .map(|(k, v)| (k.clone(), v.clone()))
        {
            cache.remove(&key);
            stats.evictions += 1;
        }
    }

    async fn evict_lru_order_books(
        &self,
        cache: &mut HashMap<String, CacheEntry<OrderBookDepth>>,
        stats: &mut CacheStatistics,
    ) {
        if let Some((key, _)) = cache.iter()
            .min_by_key(|(_, entry)| entry.last_accessed)
            .map(|(k, v)| (k.clone(), v.clone()))
        {
            cache.remove(&key);
            stats.evictions += 1;
        }
    }

    async fn evict_lru_kline_data(
        &self,
        cache: &mut HashMap<String, CacheEntry<Vec<KlineData>>>,
        stats: &mut CacheStatistics,
    ) {
        if let Some((key, _)) = cache.iter()
            .min_by_key(|(_, entry)| entry.last_accessed)
            .map(|(k, v)| (k.clone(), v.clone()))
        {
            cache.remove(&key);
            stats.evictions += 1;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio::time::sleep;

    #[tokio::test]
    async fn test_cache_basic_operations() {
        let cache = PerformanceCache::new(CacheConfig::default());
        
        // Test market stats caching
        let symbol = "BTCUSDT".to_string();
        let stats = MarketStats {
            symbol: symbol.clone(),
            price: Decimal::new(45000, 0),
            price_change: Decimal::new(500, 0),
            price_change_percent: Decimal::new(111, 2), // 1.11%
            weighted_avg_price: Decimal::new(44800, 0),
            prev_close_price: Decimal::new(44500, 0),
            last_price: Decimal::new(45000, 0),
            last_qty: Decimal::new(1, 1), // 0.1
            bid_price: Decimal::new(44999, 0),
            ask_price: Decimal::new(45001, 0),
            high: Decimal::new(45200, 0),
            low: Decimal::new(44300, 0),
            volume: Decimal::new(1000, 0),
            quote_volume: Decimal::new(45000000, 0),
            count: 5000,
            open_time: chrono::Utc::now(),
            close_time: chrono::Utc::now(),
        };

        // Cache miss initially
        assert!(cache.get_market_stats(&symbol).await.is_none());

        // Set and get
        cache.set_market_stats(symbol.clone(), stats.clone()).await;
        let cached = cache.get_market_stats(&symbol).await;
        assert!(cached.is_some());
        assert_eq!(cached.unwrap().symbol, symbol);

        // Check statistics
        let cache_stats = cache.get_statistics().await;
        assert_eq!(cache_stats.hits, 1);
        assert_eq!(cache_stats.misses, 1);
        assert!(cache_stats.hit_rate() > 0.0);
    }

    #[tokio::test]
    async fn test_cache_expiration() {
        let mut config = CacheConfig::default();
        config.market_stats_ttl = Duration::from_millis(100); // Very short TTL

        let cache = PerformanceCache::new(config);
        let symbol = "BTCUSDT".to_string();
        let stats = MarketStats::default(); // Assume we have a default implementation

        cache.set_market_stats(symbol.clone(), stats).await;
        
        // Should be available immediately
        assert!(cache.get_market_stats(&symbol).await.is_some());

        // Wait for expiration
        sleep(Duration::from_millis(150)).await;

        // Should be expired now
        assert!(cache.get_market_stats(&symbol).await.is_none());
    }

    #[tokio::test]
    async fn test_cache_cleanup() {
        let cache = PerformanceCache::new(CacheConfig::default());
        
        // Add some data
        cache.set_market_stats("BTC".to_string(), MarketStats::default()).await;
        cache.set_market_stats("ETH".to_string(), MarketStats::default()).await;

        let stats_before = cache.get_statistics().await;
        assert_eq!(stats_before.total_entries, 2);

        // Clean up (should not remove anything as TTL is long)
        cache.cleanup_expired().await;

        let stats_after = cache.get_statistics().await;
        assert_eq!(stats_after.total_entries, 2);

        // Clear all
        cache.clear_all().await;

        let stats_cleared = cache.get_statistics().await;
        assert_eq!(stats_cleared.total_entries, 0);
    }
}