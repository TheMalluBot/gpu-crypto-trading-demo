@group(0) @binding(0)
var output_texture: texture_storage_2d<rgba8unorm, write>;

@group(0) @binding(1)
var<storage, read_write> particles: array<Particle>;

@group(0) @binding(2)
var<uniform> uniforms: Uniforms;

struct Particle {
    position: vec2<f32>,
    velocity: vec2<f32>,
    color: vec4<f32>,
}

struct Uniforms {
    time: f32,
    delta_time: f32,
    width: f32,
    height: f32,
}

@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let screen_pos = vec2<i32>(global_id.xy);
    let screen_size = vec2<i32>(512, 512);
    
    if (screen_pos.x >= screen_size.x || screen_pos.y >= screen_size.y) {
        return;
    }
    
    // Clear background with gradient
    let uv = vec2<f32>(screen_pos) / vec2<f32>(screen_size);
    let bg_color = vec4<f32>(
        0.1 + 0.3 * uv.x,
        0.1 + 0.2 * uv.y,
        0.2 + 0.4 * (uv.x + uv.y) * 0.5,
        1.0
    );
    
    var final_color = bg_color;
    
    // Render particles
    for (var i = 0u; i < arrayLength(&particles); i++) {
        let particle = particles[i];
        
        // Update particle position
        var new_pos = particle.position + particle.velocity;
        var new_vel = particle.velocity;
        
        // Bounce off walls
        if (new_pos.x < -1.0 || new_pos.x > 1.0) {
            new_vel.x = -new_vel.x;
            new_pos.x = clamp(new_pos.x, -1.0, 1.0);
        }
        if (new_pos.y < -1.0 || new_pos.y > 1.0) {
            new_vel.y = -new_vel.y;
            new_pos.y = clamp(new_pos.y, -1.0, 1.0);
        }
        
        // Add some noise
        new_vel += vec2<f32>(
            sin(uniforms.time + f32(i) * 0.1) * 0.001,
            cos(uniforms.time + f32(i) * 0.1) * 0.001
        );
        
        // Update particle
        particles[i].position = new_pos;
        particles[i].velocity = new_vel;
        
        // Convert to screen coordinates
        let screen_coord = (new_pos + 1.0) * 0.5 * vec2<f32>(screen_size);
        let particle_screen = vec2<i32>(screen_coord);
        
        // Render particle if it's close to current pixel
        let dist = length(vec2<f32>(screen_pos - particle_screen));
        if (dist < 3.0) {
            let alpha = 1.0 - (dist / 3.0);
            let particle_color = vec4<f32>(
                particle.color.rgb * alpha,
                alpha
            );
            final_color = mix(final_color, particle_color, alpha);
        }
    }
    
    textureStore(output_texture, screen_pos, final_color);
}