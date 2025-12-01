/* ===========================================
   PLASMA ORB - DEFINITIVE EDITION
   Esfera única con flujo orgánico perfecto
   =========================================== */

// ===========================================
// CONFIGURATION
// ===========================================
// Detectar si es móvil
const isMobile = window.innerWidth <= 768;
const isSmallMobile = window.innerWidth <= 480;

const CONFIG = {
    fftSize: 2048,
    smoothing: 0.85,
    
    // Sphere - más pequeña en móvil
    sphereRadius: isSmallMobile ? 1.6 : (isMobile ? 2.0 : 2.8),
    
    // Colors - Paleta completa
    colorDeepBlue: new THREE.Color(0x1a0066),   // Azul profundo
    colorPurple: new THREE.Color(0x6600cc),     // Morado
    colorMagenta: new THREE.Color(0xcc00ff),    // Magenta brillante
    colorCyan: new THREE.Color(0x00ccff),       // Cyan
    colorWhite: new THREE.Color(0xffffff),      // Blanco para highlights
    
    // Bloom
    bloomStrength: 1.8,
    bloomRadius: 0.6,
    bloomThreshold: 0.15
};

// Audio start time (1:40 = 100 seconds)
const AUDIO_START_TIME = 100;

// ===========================================
// GLOBAL VARIABLES
// ===========================================
let scene, camera, renderer, composer;
let plasmaSphere, glowSphere;
let audioContext, analyser, source, gainNode;
let frequencyData, isPlaying = false;
let clock, animationTime = 0;
let bass = 0, mid = 0, treble = 0;
let bassHistory = [];

// DOM Elements
const container = document.getElementById('container');
const overlay = document.getElementById('overlay');
const hud = document.getElementById('hud');
const startBtn = document.getElementById('startBtn');
const playPauseBtn = document.getElementById('playPause');
const volumeSlider = document.getElementById('volume');
const fpsCounter = document.getElementById('fps');

const AUDIO_FILE = './levels.mp3';
const splash = document.getElementById('splash');

// ===========================================
// INITIALIZATION
// ===========================================
function init() {
    clock = new THREE.Clock();
    
    initScene();
    initCamera();
    initRenderer();
    initPostProcessing();
    
    createPlasmaSphere();
    createOuterGlow();
    createAmbientParticles();
    
    initEventListeners();
    
    animate();
}

// ===========================================
// SCENE SETUP
// ===========================================
function initScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050008);
}

function initCamera() {
    const fov = isMobile ? 70 : 60;
    camera = new THREE.PerspectiveCamera(fov, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = isMobile ? 6 : 8;
}

function initRenderer() {
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
}

function initPostProcessing() {
    const renderScene = new THREE.RenderPass(scene, camera);
    
    const bloomPass = new THREE.UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        CONFIG.bloomStrength,
        CONFIG.bloomRadius,
        CONFIG.bloomThreshold
    );
    
    composer = new THREE.EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);
}

// ===========================================
// PLASMA SPHERE - La esfera definitiva
// ===========================================
function createPlasmaSphere() {
    const geometry = new THREE.IcosahedronGeometry(CONFIG.sphereRadius, 80);
    
    const material = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uBass: { value: 0 },
            uMid: { value: 0 },
            uTreble: { value: 0 },
            uColorDeep: { value: CONFIG.colorDeepBlue },
            uColorPurple: { value: CONFIG.colorPurple },
            uColorMagenta: { value: CONFIG.colorMagenta },
            uColorCyan: { value: CONFIG.colorCyan },
            uColorWhite: { value: CONFIG.colorWhite }
        },
        vertexShader: `
            uniform float uTime;
            uniform float uBass;
            uniform float uMid;
            
            varying vec3 vNormal;
            varying vec3 vPosition;
            varying vec3 vWorldPosition;
            varying float vDisplacement;
            varying float vElevation;
            
            // Simplex noise
            vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
            vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
            vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
            vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
            
            float snoise(vec3 v) {
                const vec2 C = vec2(1.0/6.0, 1.0/3.0);
                const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
                
                vec3 i = floor(v + dot(v, C.yyy));
                vec3 x0 = v - i + dot(i, C.xxx);
                
                vec3 g = step(x0.yzx, x0.xyz);
                vec3 l = 1.0 - g;
                vec3 i1 = min(g.xyz, l.zxy);
                vec3 i2 = max(g.xyz, l.zxy);
                
                vec3 x1 = x0 - i1 + C.xxx;
                vec3 x2 = x0 - i2 + C.yyy;
                vec3 x3 = x0 - D.yyy;
                
                i = mod289(i);
                vec4 p = permute(permute(permute(
                    i.z + vec4(0.0, i1.z, i2.z, 1.0))
                    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
                
                float n_ = 0.142857142857;
                vec3 ns = n_ * D.wyz - D.xzx;
                
                vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
                vec4 x_ = floor(j * ns.z);
                vec4 y_ = floor(j - 7.0 * x_);
                
                vec4 x = x_ *ns.x + ns.yyyy;
                vec4 y = y_ *ns.x + ns.yyyy;
                vec4 h = 1.0 - abs(x) - abs(y);
                
                vec4 b0 = vec4(x.xy, y.xy);
                vec4 b1 = vec4(x.zw, y.zw);
                
                vec4 s0 = floor(b0)*2.0 + 1.0;
                vec4 s1 = floor(b1)*2.0 + 1.0;
                vec4 sh = -step(h, vec4(0.0));
                
                vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
                vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
                
                vec3 p0 = vec3(a0.xy, h.x);
                vec3 p1 = vec3(a0.zw, h.y);
                vec3 p2 = vec3(a1.xy, h.z);
                vec3 p3 = vec3(a1.zw, h.w);
                
                vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
                p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
                
                vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
                m = m * m;
                return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
            }
            
            void main() {
                vNormal = normal;
                vPosition = position;
                
                // Velocidad base lenta
                float speed = 0.15;
                float audioSpeed = speed + uBass * 0.1;
                
                // Capas de ruido orgánico (suaves y lentas)
                float noise1 = snoise(position * 0.8 + uTime * audioSpeed);
                float noise2 = snoise(position * 1.2 - uTime * audioSpeed * 0.6);
                float noise3 = snoise(position * 0.5 + vec3(uTime * 0.1, 0.0, uTime * 0.08));
                
                // Combinar ruidos suavemente
                float combinedNoise = (noise1 * 0.5 + noise2 * 0.3 + noise3 * 0.2);
                
                // Intensidad del displacement controlada
                float baseIntensity = 0.12;
                float audioIntensity = uBass * 0.15 + uMid * 0.08;
                float intensity = baseIntensity + audioIntensity;
                
                // Displacement final suave
                float displacement = combinedNoise * intensity;
                
                vDisplacement = displacement;
                vElevation = combinedNoise;
                
                // Aplicar displacement
                vec3 newPosition = position + normal * displacement;
                vWorldPosition = newPosition;
                
                gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
            }
        `,
        fragmentShader: `
            uniform float uTime;
            uniform float uBass;
            uniform float uMid;
            uniform float uTreble;
            uniform vec3 uColorDeep;
            uniform vec3 uColorPurple;
            uniform vec3 uColorMagenta;
            uniform vec3 uColorCyan;
            uniform vec3 uColorWhite;
            
            varying vec3 vNormal;
            varying vec3 vPosition;
            varying vec3 vWorldPosition;
            varying float vDisplacement;
            varying float vElevation;
            
            void main() {
                // Fresnel effect para bordes luminosos
                vec3 viewDir = normalize(cameraPosition - vWorldPosition);
                float fresnel = pow(1.0 - abs(dot(viewDir, normalize(vNormal))), 2.5);
                
                // Gradientes suaves basados en posición normalizada
                vec3 normPos = normalize(vPosition);
                
                // Flujo de color lento y orgánico
                float flow1 = sin(normPos.x * 2.0 + normPos.y * 1.5 + uTime * 0.2) * 0.5 + 0.5;
                float flow2 = cos(normPos.y * 2.0 + normPos.z * 1.5 + uTime * 0.15) * 0.5 + 0.5;
                float flow3 = sin(normPos.z * 2.0 + normPos.x * 1.5 + uTime * 0.18) * 0.5 + 0.5;
                
                // Mezcla de colores suave
                vec3 color = uColorDeep;
                color = mix(color, uColorPurple, flow1 * 0.7);
                color = mix(color, uColorMagenta, flow2 * 0.5);
                color = mix(color, uColorCyan, flow3 * 0.3);
                
                // Agregar blanco en los picos de elevación y fresnel
                float whiteMix = smoothstep(0.3, 0.8, vElevation) * 0.4;
                whiteMix += fresnel * 0.5;
                whiteMix += uBass * 0.2; // Más blanco con el bajo
                color = mix(color, uColorWhite, clamp(whiteMix, 0.0, 0.7));
                
                // Brillo base
                float brightness = 0.6 + vElevation * 0.3 + fresnel * 0.4;
                brightness += uBass * 0.3 + uTreble * 0.15;
                
                // Pulso sutil
                float pulse = sin(uTime * 0.5) * 0.05 + 0.95;
                
                vec3 finalColor = color * brightness * pulse;
                
                // Alpha para efecto de energía
                float alpha = 0.85 + fresnel * 0.15;
                
                gl_FragColor = vec4(finalColor, alpha);
            }
        `,
        transparent: true,
        side: THREE.FrontSide
    });
    
    plasmaSphere = new THREE.Mesh(geometry, material);
    scene.add(plasmaSphere);
}

// ===========================================
// OUTER GLOW - Halo exterior suave
// ===========================================
function createOuterGlow() {
    const geometry = new THREE.IcosahedronGeometry(CONFIG.sphereRadius * 1.15, 32);
    
    const material = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uBass: { value: 0 },
            uColor1: { value: CONFIG.colorPurple },
            uColor2: { value: CONFIG.colorMagenta }
        },
        vertexShader: `
            varying vec3 vNormal;
            varying vec3 vPosition;
            
            void main() {
                vNormal = normalize(normalMatrix * normal);
                vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float uTime;
            uniform float uBass;
            uniform vec3 uColor1;
            uniform vec3 uColor2;
            
            varying vec3 vNormal;
            varying vec3 vPosition;
            
            void main() {
                // Glow basado en fresnel inverso
                vec3 viewDir = normalize(-vPosition);
                float rim = 1.0 - abs(dot(viewDir, vNormal));
                rim = pow(rim, 3.0);
                
                // Color del glow
                float colorMix = sin(uTime * 0.3) * 0.5 + 0.5;
                vec3 glowColor = mix(uColor1, uColor2, colorMix);
                
                // Intensidad con audio
                float intensity = 0.3 + uBass * 0.4;
                
                gl_FragColor = vec4(glowColor * intensity, rim * 0.5);
            }
        `,
        transparent: true,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    
    glowSphere = new THREE.Mesh(geometry, material);
    scene.add(glowSphere);
}

// ===========================================
// AMBIENT PARTICLES
// ===========================================
let ambientParticles;

function createAmbientParticles() {
    const count = isMobile ? 100 : 300;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    
    const colorOptions = [CONFIG.colorPurple, CONFIG.colorMagenta, CONFIG.colorCyan];
    
    for (let i = 0; i < count; i++) {
        const r = 4.5 + Math.random() * 12;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        
        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = r * Math.cos(phi);
        
        const color = colorOptions[Math.floor(Math.random() * colorOptions.length)];
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const material = new THREE.PointsMaterial({
        size: 0.06,
        vertexColors: true,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending
    });
    
    ambientParticles = new THREE.Points(geometry, material);
    scene.add(ambientParticles);
}

// ===========================================
// AUDIO SYSTEM
// ===========================================
async function initAudio() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = CONFIG.fftSize;
        analyser.smoothingTimeConstant = CONFIG.smoothing;
        frequencyData = new Uint8Array(analyser.frequencyBinCount);
        
        gainNode = audioContext.createGain();
        gainNode.gain.value = volumeSlider.value;
        
        const response = await fetch(AUDIO_FILE);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.loop = true;
        
        source.connect(analyser);
        analyser.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // UI Transition
        overlay.classList.add('hidden');
        
        // Mostrar splash LEVELS AVICII
        splash.classList.remove('hidden');
        splash.classList.add('visible');
        
        // Después de 3 segundos, animar salida y mostrar HUD
        setTimeout(() => {
            splash.classList.add('exit');
            hud.classList.remove('hidden');
            
            setTimeout(() => {
                splash.classList.add('hidden');
                splash.classList.remove('visible', 'exit');
            }, 1200);
        }, 3000);
        
        // Empezar en 1:40 (100 segundos)
        source.start(0, AUDIO_START_TIME);
        isPlaying = true;
        
    } catch (error) {
        console.error('Audio Error:', error);
        alert('Error loading audio. Check if levels.mp3 exists.');
        startBtn.textContent = 'ERROR';
    }
}

function analyzeAudio() {
    if (!analyser || !isPlaying) return;
    
    analyser.getByteFrequencyData(frequencyData);
    
    const bassRange = frequencyData.slice(0, 20);
    const midRange = frequencyData.slice(20, 150);
    const trebleRange = frequencyData.slice(150, 500);
    
    bass = getAverage(bassRange) / 255;
    mid = getAverage(midRange) / 255;
    treble = getAverage(trebleRange) / 255;
    
    bassHistory.push(bass);
    if (bassHistory.length > 30) bassHistory.shift();
}

function getAverage(array) {
    return array.reduce((a, b) => a + b, 0) / array.length;
}

// ===========================================
// ANIMATION LOOP
// ===========================================
function animate() {
    requestAnimationFrame(animate);
    
    if (!isPlaying) {
        composer.render();
        return;
    }
    
    const delta = clock.getDelta();
    animationTime += delta;
    
    analyzeAudio();
    
    // PLASMA SPHERE
    if (plasmaSphere) {
        plasmaSphere.material.uniforms.uTime.value = animationTime;
        plasmaSphere.material.uniforms.uBass.value = bass;
        plasmaSphere.material.uniforms.uMid.value = mid;
        plasmaSphere.material.uniforms.uTreble.value = treble;
        
        // Rotación muy lenta
        plasmaSphere.rotation.y += 0.001;
        plasmaSphere.rotation.x += 0.0005;
        
        // Escala reactiva suave
        const targetScale = 1 + bass * 0.1;
        plasmaSphere.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.08);
    }
    
    // OUTER GLOW
    if (glowSphere) {
        glowSphere.material.uniforms.uTime.value = animationTime;
        glowSphere.material.uniforms.uBass.value = bass;
        glowSphere.rotation.y = plasmaSphere.rotation.y;
        glowSphere.rotation.x = plasmaSphere.rotation.x;
        glowSphere.scale.copy(plasmaSphere.scale);
    }
    
    // AMBIENT PARTICLES
    if (ambientParticles) {
        ambientParticles.rotation.y += 0.0005;
    }
    
    // CAMERA - Movimiento muy sutil (menos en móvil)
    const camMovement = isMobile ? 0.3 : 0.8;
    camera.position.x = Math.sin(animationTime * 0.05) * camMovement;
    camera.position.y = Math.cos(animationTime * 0.04) * (camMovement * 0.6);
    camera.lookAt(0, 0, 0);
    
    // FPS
    if (Math.random() > 0.95) {
        fpsCounter.textContent = Math.round(1 / delta);
    }
    
    composer.render();
}

// ===========================================
// EVENT LISTENERS
// ===========================================
function initEventListeners() {
    const iconPause = document.querySelector('.icon-pause');
    const iconPlay = document.querySelector('.icon-play');
    const muteBtn = document.getElementById('muteBtn');
    const iconVolume = document.querySelector('.icon-volume');
    const iconMuted = document.querySelector('.icon-muted');
    const volumeFill = document.querySelector('.volume-fill');
    const volumeThumb = document.querySelector('.volume-thumb');
    const volumeValue = document.querySelector('.volume-value');
    let lastVolume = 0.7;
    
    startBtn.addEventListener('click', () => {
        startBtn.innerHTML = '<span class="btn-text">LOADING...</span>';
        initAudio();
    });
    
    playPauseBtn.addEventListener('click', () => {
        if (!audioContext) return;
        if (isPlaying) {
            audioContext.suspend();
            isPlaying = false;
            iconPause.classList.add('hidden');
            iconPlay.classList.remove('hidden');
        } else {
            audioContext.resume();
            isPlaying = true;
            iconPause.classList.remove('hidden');
            iconPlay.classList.add('hidden');
        }
    });
    
    // Volume slider con visual feedback
    volumeSlider.addEventListener('input', () => {
        const value = volumeSlider.value;
        if (gainNode) gainNode.gain.value = value;
        
        // Actualizar visual
        const percent = value * 100;
        volumeFill.style.width = percent + '%';
        volumeThumb.style.left = percent + '%';
        volumeValue.textContent = Math.round(percent);
        
        // Actualizar icono si está muteado
        if (value > 0) {
            iconVolume.classList.remove('hidden');
            iconMuted.classList.add('hidden');
            lastVolume = value;
        }
    });
    
    // Mute button
    muteBtn.addEventListener('click', () => {
        if (volumeSlider.value > 0) {
            lastVolume = volumeSlider.value;
            volumeSlider.value = 0;
            if (gainNode) gainNode.gain.value = 0;
            iconVolume.classList.add('hidden');
            iconMuted.classList.remove('hidden');
            volumeFill.style.width = '0%';
            volumeThumb.style.left = '0%';
            volumeValue.textContent = '0';
        } else {
            volumeSlider.value = lastVolume;
            if (gainNode) gainNode.gain.value = lastVolume;
            iconVolume.classList.remove('hidden');
            iconMuted.classList.add('hidden');
            const percent = lastVolume * 100;
            volumeFill.style.width = percent + '%';
            volumeThumb.style.left = percent + '%';
            volumeValue.textContent = Math.round(percent);
        }
    });
    
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        composer.setSize(window.innerWidth, window.innerHeight);
    });
}

// Start
init();
