varying vec3 vNormal;
varying vec2 vUv;

uniform sampler2D uTexture;
uniform float uPixelSize;
uniform vec3 uDotColor;
uniform vec3 uBgColor;
uniform float uTime;

// Leva Configurable Uniforms
uniform float uDistortion;
uniform float uWaveSpeed;
uniform float uAnimatePattern;

// Fluid Mouse Uniforms
uniform vec2 uMouse;
uniform float uTrailRadius;
uniform float uTrailIntensity;

// Cosine-based Color Palette Generator
vec3 palette( in float t, in vec3 a, in vec3 b, in vec3 c, in vec3 d ) {
    return a + b*cos( 6.28318*(c*t+d) );
}

void main() {
    // 1. Calculate Fluid Mouse Vector Displacement
    vec2 mouseDisplacement = vUv - uMouse;
    float distToMouse = length(mouseDisplacement);
    
    // Generate a smooth fluid falloff bubble around the cursor coordinate
    float fluidInfluence = smoothstep(uTrailRadius, 0.0, distToMouse);
    
    // Push the texture UV outwards based on the calculated distance
    vec2 fluidUvOffset = normalize(mouseDisplacement) * fluidInfluence * (uTrailIntensity * 0.1);

    // Apply baseline sine waves combined with the active mouse trail offset
    vec2 distortedUv = vUv + fluidUvOffset;
    distortedUv.x += sin(distortedUv.y * 4.0 + uTime * uWaveSpeed) * (uDistortion * 0.002);
    
    // Sample texture with the combined distortion map
    vec4 textureColor = texture2D(uTexture, distortedUv);

    // 2. Light and Texture Luminance calculation
    vec3 lightDir = normalize(vec3(0.5, 0.5, 1.0));
    float diffuse = max(dot(normalize(vNormal), lightDir), 0.0);
    float brightness = diffuse + 0.3;
    
    float textureBrightness = (textureColor.r + textureColor.g + textureColor.b) / 3.0;
    brightness *= textureBrightness;

    // 3. Coordinate Distortion for the Screen Dither
    vec2 coord = gl_FragCoord.xy / uPixelSize;
    if(uAnimatePattern > 0.5) {
        // Distort the raster dither grids dynamically around the cursor as well
        coord += fluidUvOffset * (uPixelSize * 5.0);
        coord.x += sin(coord.y * 0.2 + uTime * uWaveSpeed) * (uDistortion * 0.5);
        coord.y += cos(coord.x * 0.2 + uTime * uWaveSpeed) * (uDistortion * 0.5);
    }

    // Classic 4x4 Bayer Dithering Matrix
    const mat4 bayer = mat4(
         0.0,  8.0,  2.0, 10.0,
        12.0,  4.0, 14.0,  6.0,
         3.0, 11.0,  1.0,  9.0,
        15.0,  7.0, 13.0,  5.0
    ) / 16.0;

    int x = int(mod(coord.x, 4.0));
    int y = int(mod(coord.y, 4.0));
    float threshold = bayer[y][x];

    float ditherThreshold = step(threshold, brightness);

    // Generative Retro Color Styling
    vec3 psychedelicColor = palette(
        textureBrightness + uTime * 0.1 + (fluidInfluence * 0.5), // Mouse interactions inject color transitions too!
        vec3(0.5, 0.5, 0.5),
        vec3(0.5, 0.5, 0.5),
        vec3(1.0, 1.0, 1.0),
        vec3(0.0, 0.33, 0.67)
    );

    vec3 finalDotColor = mix(uDotColor, psychedelicColor, 0.5);
    vec3 finalPatternColor = mix(uBgColor, finalDotColor * textureColor.rgb * 1.5, ditherThreshold);

    gl_FragColor = vec4(finalPatternColor, textureColor.a);
}