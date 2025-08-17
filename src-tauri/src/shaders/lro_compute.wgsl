// GPU Compute Shader for Linear Regression Oscillator (LRO) Calculation
// Massively parallel processing for thousands of data points simultaneously

struct PriceData {
    price: f32,
    volume: f32,
    high: f32,
    low: f32,
}

struct LROResult {
    lro_value: f32,
    signal_line: f32,
    slope: f32,
    r_squared: f32,
}

struct LROParams {
    period: u32,
    signal_period: u32,
    overbought: f32,
    oversold: f32,
}

@group(0) @binding(0) var<storage, read> price_data: array<PriceData>;
@group(0) @binding(1) var<storage, read_write> results: array<LROResult>;
@group(0) @binding(2) var<uniform> params: LROParams;

// Workgroup size for optimal GPU utilization
@compute @workgroup_size(64, 1, 1)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let index = global_id.x;
    let data_length = arrayLength(&price_data);
    
    // Bounds check
    if (index >= data_length) {
        return;
    }
    
    // Calculate LRO for this data point
    let period = params.period;
    
    // Not enough data for calculation
    if (index < period - 1u) {
        results[index] = LROResult(0.0, 0.0, 0.0, 0.0);
        return;
    }
    
    // Linear regression calculation
    var sum_x: f32 = 0.0;
    var sum_y: f32 = 0.0;
    var sum_xy: f32 = 0.0;
    var sum_x2: f32 = 0.0;
    var sum_y2: f32 = 0.0;
    
    // Calculate sums for linear regression
    for (var i: u32 = 0u; i < period; i = i + 1u) {
        let data_index = index - period + 1u + i;
        let x = f32(i);
        let y = price_data[data_index].price;
        
        sum_x += x;
        sum_y += y;
        sum_xy += x * y;
        sum_x2 += x * x;
        sum_y2 += y * y;
    }
    
    let n = f32(period);
    let denominator = n * sum_x2 - sum_x * sum_x;
    
    // Prevent division by zero
    if (abs(denominator) < 0.0001) {
        results[index] = LROResult(0.0, 0.0, 0.0, 0.0);
        return;
    }
    
    // Calculate slope and intercept
    let slope = (n * sum_xy - sum_x * sum_y) / denominator;
    let intercept = (sum_y - slope * sum_x) / n;
    
    // Calculate R-squared for confidence
    let mean_y = sum_y / n;
    let ss_tot = sum_y2 - n * mean_y * mean_y;
    
    // Calculate residual sum of squares
    var ss_res: f32 = 0.0;
    for (var i: u32 = 0u; i < period; i = i + 1u) {
        let data_index = index - period + 1u + i;
        let x = f32(i);
        let y = price_data[data_index].price;
        let predicted = slope * x + intercept;
        let residual = y - predicted;
        ss_res += residual * residual;
    }
    
    let r_squared = select(0.0, 1.0 - (ss_res / ss_tot), ss_tot > 0.0001);
    
    // Calculate LRO value (deviation from regression line)
    let current_price = price_data[index].price;
    let predicted_price = slope * f32(period - 1u) + intercept;
    let lro_value = (current_price - predicted_price) / predicted_price * 100.0;
    
    // Calculate signal line (EMA of LRO values)
    var signal_line: f32 = 0.0;
    if (index >= params.signal_period) {
        var ema_sum: f32 = 0.0;
        var ema_weight: f32 = 0.0;
        let alpha = 2.0 / (f32(params.signal_period) + 1.0);
        
        for (var i: u32 = 0u; i < params.signal_period; i = i + 1u) {
            let prev_index = index - params.signal_period + 1u + i;
            if (prev_index < data_length && prev_index >= period - 1u) {
                let weight = pow(1.0 - alpha, f32(params.signal_period - 1u - i));
                ema_sum += results[prev_index].lro_value * weight;
                ema_weight += weight;
            }
        }
        
        if (ema_weight > 0.0) {
            signal_line = ema_sum / ema_weight;
        }
    }
    
    // Store results
    results[index] = LROResult(
        lro_value,
        signal_line,
        slope,
        r_squared
    );
}

// Helper function for calculating standard deviation
fn calculate_std_dev(data: array<f32, 64>, mean: f32, count: u32) -> f32 {
    var variance: f32 = 0.0;
    for (var i: u32 = 0u; i < count; i = i + 1u) {
        let diff = data[i] - mean;
        variance += diff * diff;
    }
    return sqrt(variance / f32(count));
}

// Parallel reduction for sum calculation (for large datasets)
fn parallel_sum(data: array<f32, 64>, count: u32) -> f32 {
    var local_sum: f32 = 0.0;
    for (var i: u32 = 0u; i < count; i = i + 1u) {
        local_sum += data[i];
    }
    return local_sum;
}