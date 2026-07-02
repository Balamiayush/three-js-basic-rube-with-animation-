varying vec3 vNormal;
varying vec2 vUv;

uniform sampler2D uTexture;
uniform float uUseTexture;

uniform float uPixelSize;
uniform vec3 uDotColor;    // bright streak color (white/mint mix)
uniform vec3 uBgColor;     // near-black background
uniform float uTime;

uniform float uDistortion;
uniform float uWaveSpeed;
uniform float uAnimatePattern;

uniform sampler2D uTrailTexture;
uniform float uMouseDistortion;

// nebula/streak controls
uniform float uStreakAngle;
uniform float uStreakScale;
uniform float uStreakSpeed;
uniform float uStreakSharpness;
uniform float uStarDensity;

// ---------- noise ----------
float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 5; i++) {
        value += amplitude * noise(p);
        p *= 2.05;
        amplitude *= 0.55;
    }
    return value;
}

void main() {
    // mouse trail sample (used for glow + local distortion)
    float trail = texture2D(uTrailTexture, vUv).r;

    // ---------- build diagonal streak field ----------
    float angle = uStreakAngle;
    vec2 dir = vec2(cos(angle), sin(angle));
    vec2 perp = vec2(-dir.y, dir.x);

    vec2 p = (vUv - 0.5) * uStreakScale;
    // squash along the streak direction, stretch across it -> long thin bands
    vec2 streakUv = vec2(dot(p, dir) * 0.12, dot(p, perp) * 1.0);
    streakUv.x -= uTime * uStreakSpeed;
    streakUv += trail * uMouseDistortion * 0.6; // mouse pushes the streaks

    // domain warp for a more organic, less "grid-like" flow
    vec2 warp = vec2(fbm(streakUv * 1.6 + 10.0), fbm(streakUv * 1.6 - 10.0));
    float n = fbm(streakUv + warp * 0.8);

    // turn the noise field into thin bright ridges (comet-trail look)
    float ridge = 1.0 - abs(n * 2.0 - 1.0);
    ridge = pow(ridge, uStreakSharpness);

    // secondary softer layer for volume behind the sharp streaks
    float haze = fbm(streakUv * 0.5 + 5.0) * 0.35;

    float brightness = ridge * 0.9 + haze;
    brightness += trail * 0.4; // mouse glow

    // ---------- optional photo texture blend ----------
    if (uUseTexture > 0.5) {
        vec2 driftingUv = vUv;
        driftingUv.x += sin(driftingUv.y * 4.0 + uTime * uWaveSpeed) * (uDistortion * 0.002);
        vec4 texColor = texture2D(uTexture, driftingUv);
        float texBrightness = (texColor.r + texColor.g + texColor.b) / 3.0;
        brightness = mix(brightness, brightness * texBrightness * 1.5, 0.5);
    }

    // ---------- scattered stars ----------
    vec2 starCell = floor(vUv * 900.0);
    float starRand = hash(starCell);
    float star = step(1.0 - uStarDensity, starRand);
    // vary star brightness a touch with a second hash + gentle twinkle
    float twinkle = 0.6 + 0.4 * sin(uTime * 2.0 + starRand * 50.0);
    brightness += star * starRand * twinkle * 0.8;

    // ---------- animated coordinate wobble ----------
    vec2 coord = gl_FragCoord.xy / uPixelSize;
    if (uAnimatePattern > 0.5) {
        coord.x += sin(coord.y * 0.2 + uTime * uWaveSpeed) * (uDistortion * 0.5);
        coord.y += cos(coord.x * 0.2 + uTime * uWaveSpeed) * (uDistortion * 0.5);
    }

    // ---------- 4x4 Bayer ordered dither ----------
    const mat4 bayer = mat4(
         0.0,  8.0,  2.0, 10.0,
        12.0,  4.0, 14.0,  6.0,
         3.0, 11.0,  1.0,  9.0,
        15.0,  7.0, 13.0,  5.0
    ) / 16.0;

    int x = int(mod(coord.x, 4.0));
    int y = int(mod(coord.y, 4.0));
    float threshold = bayer[y][x];

    float ditherThreshold = step(threshold, clamp(brightness, 0.0, 1.0));

    // ---------- color: white core -> mint-green edges ----------
    vec3 white = vec3(1.0);
    vec3 streakColor = mix(uDotColor, white, smoothstep(0.4, 1.0, ridge));

    vec3 finalColor = mix(uBgColor, streakColor, ditherThreshold);
    // faint glow bleed even where dither is off
    finalColor += streakColor * haze * 0.15;
    finalColor += streakColor * trail * 0.8;

    gl_FragColor = vec4(finalColor, 1.0);
}