// GPU Compute Shader for Technical Indicators
// Parallel calculation of RSI, MACD, Bollinger Bands, ATR, Stochastic

struct PriceData {
    price: f32,
    volume: f32,
    high: f32,
    low: f32,
}

struct Indicators {
    rsi: f32,
    macd: f32,
    macd_signal: f32,
    bollinger_upper: f32,
    bollinger_lower: f32,
    atr: f32,
    stochastic_k: f32,
    stochastic_d: f32,
}

@group(0) @binding(0) var<storage, read> price_data: array<PriceData>;
@group(0) @binding(1) var<storage, read_write> indicators: array<Indicators>;

@compute @workgroup_size(64, 1, 1)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let index = global_id.x;
    let data_length = arrayLength(&price_data);
    
    if (index >= data_length) {
        return;
    }
    
    // Calculate RSI (14-period)
    let rsi = calculate_rsi(index, 14u);
    
    // Calculate MACD (12, 26, 9)
    let macd_result = calculate_macd(index, 12u, 26u, 9u);
    
    // Calculate Bollinger Bands (20-period, 2 std dev)
    let bollinger = calculate_bollinger_bands(index, 20u, 2.0);
    
    // Calculate ATR (14-period)
    let atr = calculate_atr(index, 14u);
    
    // Calculate Stochastic (14, 3, 3)
    let stochastic = calculate_stochastic(index, 14u, 3u);
    
    // Store results
    indicators[index] = Indicators(
        rsi,
        macd_result.x,  // MACD line
        macd_result.y,  // Signal line
        bollinger.x,    // Upper band
        bollinger.y,    // Lower band
        atr,
        stochastic.x,   // %K
        stochastic.y    // %D
    );
}

// RSI Calculation
fn calculate_rsi(index: u32, period: u32) -> f32 {
    if (index < period) {
        return 50.0; // Neutral RSI
    }
    
    var gains: f32 = 0.0;
    var losses: f32 = 0.0;
    
    for (var i: u32 = 1u; i <= period; i = i + 1u) {
        let curr_price = price_data[index - period + i].price;
        let prev_price = price_data[index - period + i - 1u].price;
        let change = curr_price - prev_price;
        
        if (change > 0.0) {
            gains += change;
        } else {
            losses += abs(change);
        }
    }
    
    let avg_gain = gains / f32(period);
    let avg_loss = losses / f32(period);
    
    if (avg_loss == 0.0) {
        return 100.0;
    }
    
    let rs = avg_gain / avg_loss;
    return 100.0 - (100.0 / (1.0 + rs));
}

// MACD Calculation
fn calculate_macd(index: u32, fast: u32, slow: u32, signal: u32) -> vec2<f32> {
    if (index < slow) {
        return vec2<f32>(0.0, 0.0);
    }
    
    // Calculate EMAs
    let ema_fast = calculate_ema(index, fast);
    let ema_slow = calculate_ema(index, slow);
    
    let macd_line = ema_fast - ema_slow;
    
    // Calculate signal line (EMA of MACD)
    var signal_line: f32 = 0.0;
    if (index >= slow + signal) {
        signal_line = calculate_ema_of_macd(index, signal, slow);
    }
    
    return vec2<f32>(macd_line, signal_line);
}

// EMA Calculation
fn calculate_ema(index: u32, period: u32) -> f32 {
    if (index < period) {
        return price_data[index].price;
    }
    
    let alpha = 2.0 / (f32(period) + 1.0);
    var ema = price_data[index - period + 1u].price;
    
    for (var i: u32 = index - period + 2u; i <= index; i = i + 1u) {
        ema = alpha * price_data[i].price + (1.0 - alpha) * ema;
    }
    
    return ema;
}

// EMA of MACD values
fn calculate_ema_of_macd(index: u32, period: u32, macd_start: u32) -> f32 {
    let alpha = 2.0 / (f32(period) + 1.0);
    var ema: f32 = 0.0;
    
    for (var i: u32 = 0u; i < period; i = i + 1u) {
        let macd_index = index - period + 1u + i;
        if (macd_index >= macd_start) {
            let fast_ema = calculate_ema(macd_index, 12u);
            let slow_ema = calculate_ema(macd_index, 26u);
            let macd_value = fast_ema - slow_ema;
            
            if (i == 0u) {
                ema = macd_value;
            } else {
                ema = alpha * macd_value + (1.0 - alpha) * ema;
            }
        }
    }
    
    return ema;
}

// Bollinger Bands Calculation
fn calculate_bollinger_bands(index: u32, period: u32, std_dev_mult: f32) -> vec2<f32> {
    if (index < period) {
        return vec2<f32>(0.0, 0.0);
    }
    
    // Calculate SMA
    var sum: f32 = 0.0;
    for (var i: u32 = 0u; i < period; i = i + 1u) {
        sum += price_data[index - period + 1u + i].price;
    }
    let sma = sum / f32(period);
    
    // Calculate standard deviation
    var variance: f32 = 0.0;
    for (var i: u32 = 0u; i < period; i = i + 1u) {
        let price = price_data[index - period + 1u + i].price;
        let diff = price - sma;
        variance += diff * diff;
    }
    let std_dev = sqrt(variance / f32(period));
    
    let upper_band = sma + std_dev_mult * std_dev;
    let lower_band = sma - std_dev_mult * std_dev;
    
    return vec2<f32>(upper_band, lower_band);
}

// ATR Calculation
fn calculate_atr(index: u32, period: u32) -> f32 {
    if (index < period) {
        return 0.0;
    }
    
    var atr_sum: f32 = 0.0;
    
    for (var i: u32 = 1u; i <= period; i = i + 1u) {
        let curr = price_data[index - period + i];
        let prev = price_data[index - period + i - 1u];
        
        let high_low = curr.high - curr.low;
        let high_close = abs(curr.high - prev.price);
        let low_close = abs(curr.low - prev.price);
        
        let true_range = max(high_low, max(high_close, low_close));
        atr_sum += true_range;
    }
    
    return atr_sum / f32(period);
}

// Stochastic Oscillator Calculation
fn calculate_stochastic(index: u32, period: u32, smooth: u32) -> vec2<f32> {
    if (index < period) {
        return vec2<f32>(50.0, 50.0);
    }
    
    // Find highest high and lowest low
    var highest: f32 = price_data[index - period + 1u].high;
    var lowest: f32 = price_data[index - period + 1u].low;
    
    for (var i: u32 = 1u; i < period; i = i + 1u) {
        let data = price_data[index - period + 1u + i];
        highest = max(highest, data.high);
        lowest = min(lowest, data.low);
    }
    
    let current_close = price_data[index].price;
    let range = highest - lowest;
    
    var k_percent: f32 = 50.0;
    if (range > 0.0) {
        k_percent = ((current_close - lowest) / range) * 100.0;
    }
    
    // Calculate %D (smoothed %K)
    var d_percent: f32 = k_percent;
    if (index >= period + smooth - 1u) {
        var sum_k: f32 = 0.0;
        for (var i: u32 = 0u; i < smooth; i = i + 1u) {
            // Simplified: just average recent K values
            sum_k += k_percent;
        }
        d_percent = sum_k / f32(smooth);
    }
    
    return vec2<f32>(k_percent, d_percent);
}