use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::{Semaphore, RwLock};
use reqwest::Client;
use crate::config::PerformanceConfig;
use crate::errors::{TradingError, TradingResult};

/// Connection pool statistics
#[derive(Debug, Clone, Default)]
pub struct ConnectionPoolStats {
    pub active_connections: usize,
    pub total_requests: u64,
    pub failed_requests: u64,
    pub average_response_time_ms: f64,
    pub pool_hits: u64,
    pub pool_misses: u64,
}

/// HTTP connection pool manager for optimized API requests
pub struct ConnectionPoolManager {
    clients: Arc<RwLock<Vec<PooledClient>>>,
    semaphore: Arc<Semaphore>,
    config: PerformanceConfig,
    stats: Arc<RwLock<ConnectionPoolStats>>,
}

#[derive(Debug, Clone)]
struct PooledClient {
    client: Client,
    created_at: Instant,
    last_used: Instant,
    request_count: u64,
    is_healthy: bool,
}

impl PooledClient {
    fn new(config: &PerformanceConfig) -> TradingResult<Self> {
        let client = Client::builder()
            .timeout(Duration::from_secs(30))
            .connect_timeout(Duration::from_secs(10))
            .pool_idle_timeout(Duration::from_secs(config.connection_idle_timeout_secs))
            .pool_max_idle_per_host(config.max_connections as usize)
            .user_agent("CryptoTrader/1.0")
            .gzip(config.enable_compression)
            .brotli(config.enable_compression)
            .deflate(config.enable_compression)
            .build()
            .map_err(|e| TradingError::internal_error(format!("Failed to create HTTP client: {}", e)))?;

        let now = Instant::now();
        Ok(Self {
            client,
            created_at: now,
            last_used: now,
            request_count: 0,
            is_healthy: true,
        })
    }

    fn is_expired(&self, idle_timeout: Duration) -> bool {
        self.last_used.elapsed() > idle_timeout
    }

    fn use_client(&mut self) -> &Client {
        self.last_used = Instant::now();
        self.request_count += 1;
        &self.client
    }
}

impl ConnectionPoolManager {
    pub fn new(config: PerformanceConfig) -> TradingResult<Self> {
        let max_connections = config.max_connections as usize;

        Ok(Self {
            clients: Arc::new(RwLock::new(Vec::new())),
            semaphore: Arc::new(Semaphore::new(max_connections)),
            config,
            stats: Arc::new(RwLock::new(ConnectionPoolStats::default())),
        })
    }

    /// Get a client from the pool or create a new one
    pub async fn get_client(&self) -> TradingResult<Client> {
        if !self.config.enable_connection_pooling {
            // If pooling is disabled, create a new client each time
            return Ok(Client::new());
        }

        // Acquire semaphore permit
        let _permit = self.semaphore.acquire().await
            .map_err(|e| TradingError::internal_error(format!("Failed to acquire connection permit: {}", e)))?;

        let mut clients = self.clients.write().await;
        let mut stats = self.stats.write().await;

        // Clean up expired clients
        let idle_timeout = Duration::from_secs(self.config.connection_idle_timeout_secs);
        clients.retain(|client| !client.is_expired(idle_timeout));

        // Try to find an available healthy client
        if let Some(pooled_client) = clients.iter_mut().find(|c| c.is_healthy) {
            stats.pool_hits += 1;
            stats.active_connections = clients.len();
            return Ok(pooled_client.use_client().clone());
        }

        // Create new client if pool is not full
        if clients.len() < self.config.max_connections as usize {
            let mut new_client = PooledClient::new(&self.config)?;
            let client = new_client.use_client().clone();
            clients.push(new_client);

            stats.pool_misses += 1;
            stats.active_connections = clients.len();

            Ok(client)
        } else {
            // Pool is full, reuse the least recently used client
            if let Some(lru_client) = clients.iter_mut().min_by_key(|c| c.last_used) {
                stats.pool_hits += 1;
                Ok(lru_client.use_client().clone())
            } else {
                // Fallback: create a new client
                let new_client = PooledClient::new(&self.config)?;
                Ok(new_client.client)
            }
        }
    }

    /// Record request statistics
    pub async fn record_request(&self, response_time_ms: f64, success: bool) {
        let mut stats = self.stats.write().await;

        stats.total_requests += 1;
        if !success {
            stats.failed_requests += 1;
        }

        // Update average response time using exponential moving average
        if stats.total_requests == 1 {
            stats.average_response_time_ms = response_time_ms;
        } else {
            let alpha = 0.1; // Smoothing factor
            stats.average_response_time_ms = alpha * response_time_ms + (1.0 - alpha) * stats.average_response_time_ms;
        }
    }

    /// Get pool statistics
    pub async fn get_stats(&self) -> ConnectionPoolStats {
        let clients = self.clients.read().await;
        let mut stats = self.stats.read().await.clone();
        stats.active_connections = clients.len();
        stats
    }

    /// Health check for all pooled clients
    pub async fn health_check(&self) -> TradingResult<()> {
        let mut clients = self.clients.write().await;

        for client in clients.iter_mut() {
            // Simple health check - try to make a HEAD request to a reliable endpoint
            match client.client.head("https://httpbin.org/status/200").send().await {
                Ok(response) => {
                    client.is_healthy = response.status().is_success();
                }
                Err(_) => {
                    client.is_healthy = false;
                }
            }
        }

        // Remove unhealthy clients
        clients.retain(|client| client.is_healthy);

        Ok(())
    }

    /// Clear all pooled connections
    pub async fn clear_pool(&self) {
        let mut clients = self.clients.write().await;
        clients.clear();

        let mut stats = self.stats.write().await;
        stats.active_connections = 0;
    }

    /// Cleanup expired connections
    pub async fn cleanup_expired(&self) {
        let mut clients = self.clients.write().await;
        let idle_timeout = Duration::from_secs(self.config.connection_idle_timeout_secs);

        let initial_count = clients.len();
        clients.retain(|client| !client.is_expired(idle_timeout));

        let removed_count = initial_count - clients.len();
        if removed_count > 0 {
            println!("Cleaned up {} expired connections from pool", removed_count);
        }

        let mut stats = self.stats.write().await;
        stats.active_connections = clients.len();
    }
}