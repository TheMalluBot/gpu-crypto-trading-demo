use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::Mutex;

#[derive(Debug, Clone)]
pub struct RateLimit {
    pub requests_per_minute: u32,
    pub requests_per_second: u32,
    pub weight_limit: u32,
}

impl Default for RateLimit {
    fn default() -> Self {
        Self {
            // Binance Spot API limits (as of 2024)
            requests_per_minute: 6000,  // 6000 requests per minute per IP
            requests_per_second: 10,    // 10 requests per second per IP
            weight_limit: 1200,         // 1200 weight per minute
        }
    }
}

#[derive(Debug)]
struct RequestRecord {
    timestamp: Instant,
    weight: u32,
}

pub struct RateLimiter {
    limits: RateLimit,
    requests: Arc<Mutex<Vec<RequestRecord>>>,
    backoff_until: Arc<Mutex<Option<Instant>>>,
}

impl RateLimiter {
    pub fn new(limits: RateLimit) -> Self {
        Self {
            limits,
            requests: Arc::new(Mutex::new(Vec::new())),
            backoff_until: Arc::new(Mutex::new(None)),
        }
    }

    pub async fn check_rate_limit(&self, weight: u32) -> Result<(), Duration> {
        let now = Instant::now();
        
        // Check if we're in backoff period
        {
            let backoff = self.backoff_until.lock().await;
            if let Some(backoff_time) = *backoff {
                if now < backoff_time {
                    return Err(backoff_time - now);
                }
            }
        }

        let mut requests = self.requests.lock().await;
        
        // Clean old requests (older than 1 minute)
        requests.retain(|req| now.duration_since(req.timestamp) < Duration::from_secs(60));
        
        // Check per-second limit (last 1 second)
        let recent_requests = requests.iter()
            .filter(|req| now.duration_since(req.timestamp) < Duration::from_secs(1))
            .count();
        
        if recent_requests >= self.limits.requests_per_second as usize {
            return Err(Duration::from_millis(1100)); // Wait just over 1 second
        }
        
        // Check per-minute limits
        let total_requests = requests.len();
        let total_weight: u32 = requests.iter().map(|req| req.weight).sum();
        
        if total_requests >= self.limits.requests_per_minute as usize {
            // Calculate time until oldest request expires
            if let Some(oldest) = requests.first() {
                let wait_time = Duration::from_secs(60) - now.duration_since(oldest.timestamp);
                return Err(wait_time);
            }
        }
        
        if total_weight + weight > self.limits.weight_limit {
            // Find when enough weight will expire to allow this request
            let mut cumulative_weight = total_weight + weight - self.limits.weight_limit;
            for req in requests.iter() {
                cumulative_weight = cumulative_weight.saturating_sub(req.weight);
                if cumulative_weight == 0 {
                    let wait_time = Duration::from_secs(60) - now.duration_since(req.timestamp);
                    return Err(wait_time);
                }
            }
            return Err(Duration::from_secs(60)); // Fallback
        }
        
        // Record this request
        requests.push(RequestRecord {
            timestamp: now,
            weight,
        });
        
        Ok(())
    }

    pub async fn handle_rate_limit_error(&self, retry_after: Option<Duration>) {
        let backoff_duration = retry_after.unwrap_or_else(|| {
            // Exponential backoff: start with 1 second, max 300 seconds (5 minutes)
            Duration::from_secs(60)
        });
        
        let mut backoff = self.backoff_until.lock().await;
        *backoff = Some(Instant::now() + backoff_duration);
        
        eprintln!("Rate limit hit, backing off for {:?}", backoff_duration);
    }

    pub async fn wait_for_rate_limit(&self, weight: u32) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        loop {
            match self.check_rate_limit(weight).await {
                Ok(()) => return Ok(()),
                Err(wait_time) => {
                    eprintln!("Rate limit would be exceeded, waiting {:?}", wait_time);
                    tokio::time::sleep(wait_time).await;
                }
            }
        }
    }
}

// Endpoint-specific rate limits and weights
pub struct BinanceEndpoints;

impl BinanceEndpoints {
    pub fn get_weight(endpoint: &str) -> u32 {
        match endpoint {
            // Market Data Endpoints
            "/api/v3/ping" => 1,
            "/api/v3/time" => 1,
            "/api/v3/exchangeInfo" => 10,
            "/api/v3/depth" => 1, // 5 for limit > 100, 10 for limit > 500, 50 for limit > 1000
            "/api/v3/trades" => 1,
            "/api/v3/historicalTrades" => 5,
            "/api/v3/aggTrades" => 1,
            "/api/v3/klines" => 1,
            "/api/v3/avgPrice" => 1,
            "/api/v3/ticker/24hr" => 1, // 40 when no symbol parameter
            "/api/v3/ticker/price" => 1, // 2 when no symbol parameter
            "/api/v3/ticker/bookTicker" => 1, // 2 when no symbol parameter
            
            // Account Endpoints
            "/api/v3/order" => 1,
            "/api/v3/order/test" => 1,
            "/api/v3/openOrders" => 3, // 40 when no symbol parameter
            "/api/v3/allOrders" => 10,
            "/api/v3/account" => 10,
            "/api/v3/myTrades" => 10,
            
            // Margin Endpoints
            "/sapi/v1/margin/account" => 10,
            "/sapi/v1/margin/order" => 6,
            "/sapi/v1/margin/openOrders" => 10,
            
            // Futures Endpoints
            "/fapi/v1/ping" => 1,
            "/fapi/v1/time" => 1,
            "/fapi/v1/exchangeInfo" => 1,
            "/fapi/v1/depth" => 2,
            "/fapi/v1/klines" => 1,
            "/fapi/v1/ticker/24hr" => 1,
            "/fapi/v1/account" => 5,
            "/fapi/v1/balance" => 5,
            "/fapi/v1/positionRisk" => 5,
            
            // Default weight for unknown endpoints
            _ => 1,
        }
    }
    
    pub fn get_endpoint_from_url(url: &str) -> &str {
        if let Some(path_start) = url.find("/api/") {
            let path = &url[path_start..];
            if let Some(query_start) = path.find('?') {
                &path[..query_start]
            } else {
                path
            }
        } else if let Some(path_start) = url.find("/sapi/") {
            let path = &url[path_start..];
            if let Some(query_start) = path.find('?') {
                &path[..query_start]
            } else {
                path
            }
        } else if let Some(path_start) = url.find("/fapi/") {
            let path = &url[path_start..];
            if let Some(query_start) = path.find('?') {
                &path[..query_start]
            } else {
                path
            }
        } else {
            "/"
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio::time::{sleep, Duration};

    #[tokio::test]
    async fn test_rate_limiter_basic() {
        let limiter = RateLimiter::new(RateLimit {
            requests_per_minute: 5,
            requests_per_second: 2,
            weight_limit: 10,
        });

        // Should allow first request
        assert!(limiter.check_rate_limit(1).await.is_ok());
        
        // Should allow second request
        assert!(limiter.check_rate_limit(1).await.is_ok());
        
        // Should block third request due to per-second limit
        assert!(limiter.check_rate_limit(1).await.is_err());
    }
    
    #[tokio::test]
    async fn test_weight_limit() {
        let limiter = RateLimiter::new(RateLimit {
            requests_per_minute: 100,
            requests_per_second: 10,
            weight_limit: 5,
        });

        // Should allow request with weight 3
        assert!(limiter.check_rate_limit(3).await.is_ok());
        
        // Should block request with weight 3 (total would be 6 > 5)
        assert!(limiter.check_rate_limit(3).await.is_err());
        
        // Should allow request with weight 2 (total would be 5)
        assert!(limiter.check_rate_limit(2).await.is_ok());
    }
    
    #[test]
    fn test_endpoint_weight_detection() {
        assert_eq!(BinanceEndpoints::get_weight("/api/v3/account"), 10);
        assert_eq!(BinanceEndpoints::get_weight("/api/v3/ping"), 1);
        assert_eq!(BinanceEndpoints::get_weight("/unknown/endpoint"), 1);
    }
    
    #[test]
    fn test_endpoint_extraction() {
        assert_eq!(
            BinanceEndpoints::get_endpoint_from_url("https://api.binance.com/api/v3/account?timestamp=123"),
            "/api/v3/account"
        );
        assert_eq!(
            BinanceEndpoints::get_endpoint_from_url("https://api.binance.com/api/v3/ping"),
            "/api/v3/ping"
        );
    }
}