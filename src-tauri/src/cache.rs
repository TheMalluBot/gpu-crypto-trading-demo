use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::RwLock;
use serde::{Serialize, Deserialize};
use crate::config::PerformanceConfig;
use crate::errors::{TradingError, TradingResult};

/// Cache entry with TTL and metadata
#[derive(Debug, Clone)]
pub struct CacheEntry<T> {
    pub data: T,
    pub created_at: Instant,
    pub ttl: Duration,
    pub access_count: u64,
    pub last_accessed: Instant,
}

impl<T> CacheEntry<T> {
    pub fn new(data: T, ttl: Duration) -> Self {
        let now = Instant::now();
        Self {
            data,
            created_at: now,
            ttl,
            access_count: 0,
            last_accessed: now,
        }
    }

    pub fn is_expired(&self) -> bool {
        self.created_at.elapsed() > self.ttl
    }

    pub fn access(&mut self) -> &T {
        self.access_count += 1;
        self.last_accessed = Instant::now();
        &self.data
    }
}

/// High-performance cache with LRU eviction and TTL
pub struct PerformanceCache<K, V>
where
    K: Clone + Eq + std::hash::Hash,
    V: Clone,
{
    entries: Arc<RwLock<HashMap<K, CacheEntry<V>>>>,
    config: PerformanceConfig,
    max_entries: usize,
    stats: Arc<RwLock<CacheStats>>,
}

#[derive(Debug, Clone, Default)]
pub struct CacheStats {
    pub hits: u64,
    pub misses: u64,
    pub evictions: u64,
    pub size: usize,
    pub memory_usage_bytes: usize,
}

impl CacheStats {
    pub fn hit_rate(&self) -> f64 {
        if self.hits + self.misses == 0 {
            0.0
        } else {
            self.hits as f64 / (self.hits + self.misses) as f64
        }
    }
}

impl<K, V> PerformanceCache<K, V>
where
    K: Clone + Eq + std::hash::Hash,
    V: Clone,
{
    pub fn new(config: PerformanceConfig) -> Self {
        let max_entries = (config.max_cache_size_mb * 1024 * 1024) / 1024; // Rough estimate

        Self {
            entries: Arc::new(RwLock::new(HashMap::new())),
            config,
            max_entries,
            stats: Arc::new(RwLock::new(CacheStats::default())),
        }
    }

    /// Get value from cache
    pub async fn get(&self, key: &K) -> Option<V> {
        let mut entries = self.entries.write().await;
        let mut stats = self.stats.write().await;

        if let Some(entry) = entries.get_mut(key) {
            if entry.is_expired() {
                entries.remove(key);
                stats.misses += 1;
                None
            } else {
                stats.hits += 1;
                Some(entry.access().clone())
            }
        } else {
            stats.misses += 1;
            None
        }
    }

    /// Put value into cache
    pub async fn put(&self, key: K, value: V) -> TradingResult<()> {
        if !self.config.enable_caching {
            return Ok(());
        }

        let mut entries = self.entries.write().await;
        let mut stats = self.stats.write().await;

        // Check if we need to evict entries
        if entries.len() >= self.max_entries {
            self.evict_lru(&mut entries, &mut stats).await;
        }

        let ttl = Duration::from_secs(self.config.cache_ttl_secs);
        let entry = CacheEntry::new(value, ttl);

        entries.insert(key, entry);
        stats.size = entries.len();

        Ok(())
    }

    /// Remove expired entries
    pub async fn cleanup_expired(&self) {
        let mut entries = self.entries.write().await;
        let mut stats = self.stats.write().await;

        let initial_size = entries.len();
        entries.retain(|_, entry| !entry.is_expired());

        let removed = initial_size - entries.len();
        stats.evictions += removed as u64;
        stats.size = entries.len();
    }

    /// Get cache statistics
    pub async fn get_stats(&self) -> CacheStats {
        self.stats.read().await.clone()
    }

    /// Clear all cache entries
    pub async fn clear(&self) {
        let mut entries = self.entries.write().await;
        let mut stats = self.stats.write().await;

        entries.clear();
        stats.size = 0;
    }

    /// Evict least recently used entries
    async fn evict_lru(&self, entries: &mut HashMap<K, CacheEntry<V>>, stats: &mut CacheStats) {
        let evict_count = self.max_entries / 4; // Evict 25% when full

        // Collect entries with their last access times
        let mut access_times: Vec<(K, Instant)> = entries
            .iter()
            .map(|(k, v)| (k.clone(), v.last_accessed))
            .collect();

        // Sort by last accessed time (oldest first)
        access_times.sort_by_key(|(_, time)| *time);

        // Remove oldest entries
        for (key, _) in access_times.into_iter().take(evict_count) {
            entries.remove(&key);
            stats.evictions += 1;
        }
    }
}

/// Specialized caches for different data types
pub struct TradingCacheManager {
    pub kline_cache: PerformanceCache<String, Vec<crate::models::KlineData>>,
    pub symbol_cache: PerformanceCache<String, Vec<crate::models::SymbolInfo>>,
    pub account_cache: PerformanceCache<String, crate::models::AccountInfo>,
    pub market_stats_cache: PerformanceCache<String, crate::models::MarketStats>,
    pub lro_cache: PerformanceCache<String, f64>,
}

impl TradingCacheManager {
    pub fn new(config: PerformanceConfig) -> Self {
        Self {
            kline_cache: PerformanceCache::new(config.clone()),
            symbol_cache: PerformanceCache::new(config.clone()),
            account_cache: PerformanceCache::new(config.clone()),
            market_stats_cache: PerformanceCache::new(config.clone()),
            lro_cache: PerformanceCache::new(config),
        }
    }

    /// Generate cache key for kline data
    pub fn kline_key(symbol: &str, interval: &str, limit: u32) -> String {
        format!("kline:{}:{}:{}", symbol, interval, limit)
    }

    /// Generate cache key for LRO calculation
    pub fn lro_key(symbol: &str, period: usize, prices_hash: u64) -> String {
        format!("lro:{}:{}:{}", symbol, period, prices_hash)
    }

    /// Get comprehensive cache statistics
    pub async fn get_all_stats(&self) -> HashMap<String, CacheStats> {
        let mut stats = HashMap::new();

        stats.insert("kline".to_string(), self.kline_cache.get_stats().await);
        stats.insert("symbol".to_string(), self.symbol_cache.get_stats().await);
        stats.insert("account".to_string(), self.account_cache.get_stats().await);
        stats.insert("market_stats".to_string(), self.market_stats_cache.get_stats().await);
        stats.insert("lro".to_string(), self.lro_cache.get_stats().await);

        stats
    }

    /// Cleanup expired entries in all caches
    pub async fn cleanup_all(&self) {
        tokio::join!(
            self.kline_cache.cleanup_expired(),
            self.symbol_cache.cleanup_expired(),
            self.account_cache.cleanup_expired(),
            self.market_stats_cache.cleanup_expired(),
            self.lro_cache.cleanup_expired(),
        );
    }

    /// Clear all caches
    pub async fn clear_all(&self) {
        tokio::join!(
            self.kline_cache.clear(),
            self.symbol_cache.clear(),
            self.account_cache.clear(),
            self.market_stats_cache.clear(),
            self.lro_cache.clear(),
        );
    }
}