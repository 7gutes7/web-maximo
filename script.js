document.addEventListener('DOMContentLoaded', () => {
    initLenis();
    // initAutoSnap(); (Deshabilitado según indicación)
    initScrollNavbar();
    initLogoSwap();
    initCurtainReveals();
    initHorizontalCurtainReveals();
    initRevealObserver();
    initHeroVideoObserver();
    initSilkBackground();
    initGaleriaCurtain();
    initTransitionCurtain();
    initMatchCatalogCurtain();
    initDrawerFloatingLines();
});

// 0. Lenis — Smooth scroll con inercia
function initLenis() {
    if (typeof Lenis === 'undefined') return;
    const lenis = new Lenis({
        duration: 1.2,
        easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: 'vertical',
        smoothWheel: true,
        wheelMultiplier: 1,
        touchMultiplier: 1.5,
    });

    function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    window.lenis = lenis;
}

// 0a. Snap Magnético por Viewport (estilo springs.house)
function initAutoSnap() {
    const lenis = window.lenis;
    if (!lenis) return;

    function isDrawerActive() {
        const drawer = document.getElementById('vm-drawer-overlay');
        return drawer && drawer.classList.contains('active');
    }

    let isSnapping = false;

    function getSnapPoints() {
        const vh = window.innerHeight;
        const points = [];

        // 1. Puntos dentro del contenedor de cortinas sticky
        const wrapper = document.querySelector('.curtain-wrapper');
        if (wrapper) {
            const wrapperTop = wrapper.offsetTop;
            points.push(wrapperTop);              // 01. Hero Section
            points.push(wrapperTop + 1.0 * vh);   // 02. Sección 2 (#esencia)
            points.push(wrapperTop + 2.0 * vh);   // 03. Sección 3 (#casos-exito - Revelación)
            points.push(wrapperTop + 3.4 * vh);   // 04. Sección 3 (Tarjetas completas)
        }

        // 2. Secciones del proyecto fuera del curtain wrapper
        const allSections = document.querySelectorAll('body > section, main > section, section:not(.curtain-wrapper section), footer, .footer');
        allSections.forEach(sec => {
            if (!wrapper || !wrapper.contains(sec)) {
                if (sec.offsetTop >= 0) {
                    points.push(sec.offsetTop);
                }
            }
        });

        // Eliminar duplicados y ordenar de menor a mayor
        return Array.from(new Set(points)).sort((a, b) => a - b);
    }

    function executeSnap() {
        if (isDrawerActive() || isSnapping) return;
        const currentScrollY = window.scrollY;
        const docHeight = document.documentElement.scrollHeight;
        const viewHeight = window.innerHeight;
        const maxScroll = docHeight - viewHeight;

        const points = getSnapPoints();
        if (!points.length) return;

        // Encontrar el punto de snap más cercano al scroll actual
        let closest = points[0];
        let minDiff = Math.abs(currentScrollY - points[0]);

        for (let i = 1; i < points.length; i++) {
            const diff = Math.abs(currentScrollY - points[i]);
            if (diff < minDiff) {
                minDiff = diff;
                closest = points[i];
            }
        }

        const targetY = Math.max(0, Math.min(closest, maxScroll));

        // Si la distancia al punto de snap es mayor a 15px, ejecutar desplazamiento suave
        if (Math.abs(currentScrollY - targetY) > 15) {
            isSnapping = true;
            // Velocidad reducida un 35% -> Duración extendida de 1.2s a 1.85s
            lenis.scrollTo(targetY, {
                duration: 1.85,
                easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
                onComplete: () => {
                    setTimeout(() => { isSnapping = false; }, 80);
                }
            });
        }
    }

    let snapTimer;
    function scheduleSnap() {
        if (isSnapping) return;
        clearTimeout(snapTimer);
        snapTimer = setTimeout(executeSnap, 160);
    }

    lenis.on('scroll', scheduleSnap);
    window.addEventListener('scroll', scheduleSnap, { passive: true });

    setTimeout(executeSnap, 200);
}

// 0b. Curtain Reveal Vertical (Sección 2 sobre Hero)
function initCurtainReveals() {
    const wrapper = document.querySelector('.curtain-wrapper');
    const esencia = document.getElementById('esencia');
    if (!wrapper || !esencia) return;

    function update() {
        const rect = wrapper.getBoundingClientRect();
        const vh = window.innerHeight;
        const scrolled = -rect.top;
        const progress = Math.min(1, Math.max(0, scrolled / vh));
        const clipPercent = (1 - progress) * 100;

        esencia.style.setProperty('--curtain', `${clipPercent}%`);
    }

    const lenis = window.lenis;
    if (lenis) {
        lenis.on('scroll', update);
    } else {
        window.addEventListener('scroll', update, { passive: true });
    }
    update();
}

// 0b2. Curtain Reveal Vertical (Sección 4: Galería Comercial)
function initGaleriaCurtain() {
    const galeria = document.getElementById('galeria-comercial');
    const wrapper = document.querySelector('.curtain-wrapper');
    if (!galeria || !wrapper) return;

    function update() {
        const rect = wrapper.getBoundingClientRect();
        const vh = window.innerHeight;
        const scrolled = -rect.top;
        // Revelación de Galería Comercial de 3.5vh a 4.5vh (100% visible en 4.5vh)
        const progress = Math.min(1, Math.max(0, (scrolled - 3.5 * vh) / vh));
        const clipPercent = (1 - progress) * 100;

        galeria.style.setProperty('--curtain-galeria', `${clipPercent}%`);
    }

    const lenis = window.lenis;
    if (lenis) {
        lenis.on('scroll', update);
    } else {
        window.addEventListener('scroll', update, { passive: true });
    }
    update();
}

// 0b3. Curtain Reveal 2 Fases (Sección 5: Transición de Imagen)
function initTransitionCurtain() {
    const sec = document.getElementById('transicion-imagen');
    const wrapper = document.querySelector('.curtain-wrapper');
    if (!sec || !wrapper) return;

    function update() {
        const rect = wrapper.getBoundingClientRect();
        const vh = window.innerHeight;
        const scrolled = -rect.top;

        // Inicia la revelación justo al estar 100% visible Galería Comercial (4.5vh) hasta 6.5vh
        const progress = Math.min(1, Math.max(0, (scrolled - 4.5 * vh) / (2.0 * vh)));

        let clipPathValue = '';

        if (progress <= 0.5) {
            // Fase 1: Revela la mitad derecha (50% a 100%), de arriba hacia abajo (0% a 100%)
            const phase1 = progress / 0.5; // 0.0 a 1.0
            const yPercent = phase1 * 100;
            clipPathValue = `polygon(50% 0%, 100% 0%, 100% ${yPercent}%, 50% ${yPercent}%)`;
        } else {
            // Fase 2: Mitad derecha 100% visible, abre la mitad izquierda del centro (50%) a la izquierda (0%)
            const phase2 = (progress - 0.5) / 0.5; // 0.0 a 1.0
            const xLeft = 50 - phase2 * 50; // 50% a 0%
            clipPathValue = `polygon(${xLeft}% 0%, 100% 0%, 100% 100%, ${xLeft}% 100%)`;
        }

        sec.style.clipPath = clipPathValue;
        sec.style.webkitClipPath = clipPathValue;
    }

    const lenis = window.lenis;
    if (lenis) {
        lenis.on('scroll', update);
    } else {
        window.addEventListener('scroll', update, { passive: true });
    }
    update();
}

// 0b4. Curtain Reveal 2 Fases Invertida & Desfile de Tarjetas (Sección 6: Catálogo — El Match)
function initMatchCatalogCurtain() {
    const sec = document.getElementById('el-match');
    const wrapper = document.querySelector('.curtain-wrapper');
    if (!sec || !wrapper) return;

    const rightCol = sec.querySelector('.catalog-right-col');
    const scrollIndicator = document.getElementById('catalog-scroll-indicator');

    let maxTranslate = 0;
    function measureLayout() {
        if (rightCol) {
            const vh = window.innerHeight;
            maxTranslate = Math.max(0, rightCol.scrollHeight - vh + 300);
        }
    }
    measureLayout();
    window.addEventListener('resize', measureLayout, { passive: true });

    function update() {
        const rect = wrapper.getBoundingClientRect();
        const vh = window.innerHeight;
        const scrolled = -rect.top;

        // Cortina Sección 6: Inicia ÚNICAMENTE al estar Sección 5 (Imagen Transición) al 100% de visibilidad (6.5vh a 8.5vh)
        const progressSec6 = Math.min(1, Math.max(0, (scrolled - 6.5 * vh) / (2.0 * vh)));

        let clipPathValue = '';

        if (progressSec6 <= 0.5) {
            // Fase 1: Revela la mitad izquierda (0% a 50%), de abajo hacia arriba (100% a 0%)
            const phase1 = progressSec6 / 0.5;
            const yTop = 100 - (phase1 * 100);
            clipPathValue = `polygon(0% ${yTop}%, 50% ${yTop}%, 50% 100%, 0% 100%)`;
        } else {
            // Fase 2: Mitad izquierda 100% visible, abre la mitad derecha del centro (50%) a la derecha (100%)
            const phase2 = (progressSec6 - 0.5) / 0.5;
            const xRight = 50 + (phase2 * 50);
            clipPathValue = `polygon(0% 0%, ${xRight}% 0%, ${xRight}% 100%, 0% 100%)`;
        }

        sec.style.clipPath = clipPathValue;
        sec.style.webkitClipPath = clipPathValue;

        // Desfile flotante en la columna derecha
        if (rightCol) {
            const flowScrolled = Math.max(0, scrolled - 8.5 * vh);
            const totalTravel = 5.0 * vh;
            const flowProgress = Math.min(1, flowScrolled / totalTravel);

            const translateYValue = -flowProgress * maxTranslate;

            rightCol.style.transform = `translate3d(0, ${translateYValue}px, 0)`;

            if (scrollIndicator) {
                const isFadedOut = flowScrolled > 120 || progressSec6 < 0.2;
                scrollIndicator.classList.toggle('hidden', isFadedOut);
            }
        }
    }

    const lenis = window.lenis;
    if (lenis) {
        lenis.on('scroll', update);
    } else {
        window.addEventListener('scroll', update, { passive: true });
    }
    update();
}

// 0c1. Hero Video Observer (Pausa el video cuando no es visible en pantalla)
function initHeroVideoObserver() {
    const heroVideo = document.getElementById('hero-video');
    const heroSection = document.getElementById('inicio');
    if (!heroVideo || !heroSection) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                if (heroVideo.paused) {
                    heroVideo.play().catch(() => {});
                }
            } else {
                if (!heroVideo.paused) {
                    heroVideo.pause();
                }
            }
        });
    }, { threshold: 0.05 });

    observer.observe(heroSection);
}

// 0d. Fondo Silk Canvas Shader (Sección 2 - El Diferenciador Absoluto)
function initSilkBackground() {
    const canvas = document.getElementById('silk-canvas');
    const container = document.getElementById('esencia');
    if (!canvas || !container || typeof THREE === 'undefined') return;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const hexToRGB = (hex) => {
        hex = hex.replace('#', '');
        return new THREE.Vector3(
            parseInt(hex.slice(0, 2), 16) / 255,
            parseInt(hex.slice(2, 4), 16) / 255,
            parseInt(hex.slice(4, 6), 16) / 255
        );
    };

    const uniforms = {
        uTime: { value: 0 },
        uSpeed: { value: 5.0 },
        uScale: { value: 1.0 },
        uNoiseIntensity: { value: 0.1 },
        uColor: { value: hexToRGB('#C79C47') },
        uRotation: { value: 0.84 }
    };

    const vertexShader = `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = vec4(position, 1.0);
        }
    `;

    const fragmentShader = `
        varying vec2 vUv;
        uniform float uTime;
        uniform vec3  uColor;
        uniform float uSpeed;
        uniform float uScale;
        uniform float uRotation;
        uniform float uNoiseIntensity;

        const float e = 2.71828182845904523536;

        float noise(vec2 texCoord) {
            float G = e;
            vec2 r = (G * sin(G * texCoord));
            return fract(r.x * r.y * (1.0 + texCoord.x));
        }

        vec2 rotateUvs(vec2 uv, float angle) {
            float c = cos(angle);
            float s = sin(angle);
            mat2 rot = mat2(c, -s, s, c);
            return rot * uv;
        }

        void main() {
            float rnd = noise(gl_FragCoord.xy);
            vec2 uv = rotateUvs(vUv * uScale, uRotation);
            vec2 tex = uv * uScale;
            float tOffset = uSpeed * uTime;

            tex.y += 0.03 * sin(8.0 * tex.x - tOffset);

            float pattern = 0.5 +
                            0.5 * sin(5.0 * (tex.x + tex.y +
                                             cos(3.0 * tex.x + 5.0 * tex.y) +
                                             0.02 * tOffset) +
                                     sin(20.0 * (tex.x + tex.y - 0.1 * tOffset)));

            vec3 goldColor = uColor * pattern - (rnd / 25.0 * uNoiseIntensity);
            gl_FragColor = vec4(goldColor, 0.85);
        }
    `;

    const material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms,
        transparent: true
    });

    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    function resize() {
        const w = container.clientWidth;
        const h = container.clientHeight;
        renderer.setSize(w, h, false);
    }
    resize();
    window.addEventListener('resize', resize, { passive: true });

    let clock = new THREE.Clock();
    let animId = null;
    let isSilkAnimating = false;

    function animate() {
        if (!isSilkAnimating) return;
        animId = requestAnimationFrame(animate);
        uniforms.uTime.value += clock.getDelta() * 0.1;
        renderer.render(scene, camera);
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                if (!isSilkAnimating) {
                    isSilkAnimating = true;
                    clock.start();
                    animate();
                }
            } else {
                isSilkAnimating = false;
                if (animId) cancelAnimationFrame(animId);
            }
        });
    }, { threshold: 0.01 });

    observer.observe(container);
}

// 0c. Curtain Reveal Horizontal y Secuencia Sticky Timeline (Sección 3)
function initHorizontalCurtainReveals() {
    const leftCurtains = document.querySelectorAll('.section-curtain-left');
    if (!leftCurtains.length) return;

    const blurTextP = document.querySelector('.blur-text-element');
    const cards = document.querySelectorAll('.project-card-stagger');

    function update() {
        const wrapper = document.querySelector('.curtain-wrapper');
        if (!wrapper) return;
        const rect = wrapper.getBoundingClientRect();
        const vh = window.innerHeight;
        const scrolled = -rect.top;

        // 1. Revelación horizontal de cortina (scrolled de 1.0vh a 2.0vh)
        const progress = Math.min(1, Math.max(0, (scrolled - vh) / vh));
        const clipRight = Math.max(0, Math.min(100, 100 - progress * 100));

        leftCurtains.forEach(section => {
            section.style.setProperty('--curtain-right', `${clipRight}%`);
        });

        // 2. Secuencia Timeline en vh acumulado
        const progressTotal = scrolled / vh;

        // Al comenzar la revelación total (>= 1.6vh), activa blur-text
        if (blurTextP) {
            blurTextP.classList.toggle('active', progressTotal >= 1.6);
        }

        // Al continuar scrolleando, las 4 tarjetas entran secuencialmente
        // 1. Enigma Room (>= 2.0vh)
        // 2. Vinaterías La Dueña (>= 2.4vh)
        // 3. B Clinic (>= 2.8vh)
        // 4. Cafetería Mom (>= 3.2vh)
        const cardThresholds = [2.0, 2.4, 2.8, 3.2];
        cards.forEach((card, index) => {
            const threshold = cardThresholds[index] !== undefined ? cardThresholds[index] : (2.0 + index * 0.4);
            card.classList.toggle('active', progressTotal >= threshold);
        });
    }

    const lenis = window.lenis;
    if (lenis) {
        lenis.on('scroll', update);
    } else {
        window.addEventListener('scroll', update, { passive: true });
    }
    update();
}

// 1. Scroll Navbar
function initScrollNavbar() {
    const navbar = document.getElementById('navbar');
    if (!navbar) return;
    window.addEventListener('scroll', () => {
        navbar.classList.toggle('scrolled', window.scrollY > 40);
    }, { passive: true });
}

// 2. Transición Blur del Logo al alcanzar 95% de la Sección 2 (El Diferenciador) y retorno a 5% del Hero
function initLogoSwap() {
    const wrapper = document.querySelector('.curtain-wrapper');
    const logo = document.querySelector('.logo-img');
    if (!logo || !wrapper) return;

    const origSrc = 'valorM01.svg';
    const altSrc = 'valorISO.svg';

    let currentSrc = origSrc;
    let isTransitioning = false;

    function setLogo(newSrc) {
        if (currentSrc === newSrc || isTransitioning) return;
        currentSrc = newSrc;
        isTransitioning = true;

        // 1. Aplicar desenfoque (blur) y desvanecido
        logo.classList.add('blur-swap');

        // 2. Cambiar src a mitad del desenfoque
        setTimeout(() => {
            logo.setAttribute('src', newSrc);
            // 3. Quitar la clase para enfocar de vuelta
            setTimeout(() => {
                logo.classList.remove('blur-swap');
                isTransitioning = false;
            }, 60);
        }, 280);
    }

    function update() {
        const rect = wrapper.getBoundingClientRect();
        const vh = window.innerHeight;
        const scrolled = -rect.top;
        const progress = scrolled / vh; // 0 = Hero 100%, 1.0 = Sección 2 100% visible

        // Al visualizar Sección 2 al 95% (progress >= 0.95), cambia a valorISO.svg con efecto blur.
        // Al regresar al 5% de visualización del Hero (progress < 0.95), regresa a valorM01.svg.
        if (progress >= 0.95) {
            setLogo(altSrc);
        } else {
            setLogo(origSrc);
        }
    }

    const lenis = window.lenis;
    if (lenis) {
        lenis.on('scroll', update);
    } else {
        window.addEventListener('scroll', update, { passive: true });
    }
    update();
}

// 3. Reveal Observer para Animaciones
function initRevealObserver() {
    const reveals = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                obs.unobserve(entry.target);
            }
        });
    }, { threshold: 0.05, rootMargin: '50px 0px 50px 0px' });

    reveals.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight + 100 && rect.bottom > -100) {
            el.classList.add('active');
        } else {
            observer.observe(el);
        }
    });
}

// 4. Modal / Drawer Get Qualified
function openMatchDrawer() {
    const drawer = document.getElementById('vm-drawer-overlay');
    if (!drawer) return;
    drawer.classList.add('active');
    document.body.style.overflow = 'hidden';
    if (window.startDrawerLinesAnimation) window.startDrawerLinesAnimation();
}

function closeMatchDrawer() {
    const drawer = document.getElementById('vm-drawer-overlay');
    if (!drawer) return;
    drawer.classList.remove('active');
    document.body.style.overflow = '';
    if (window.stopDrawerLinesAnimation) window.stopDrawerLinesAnimation();
}

function closeMatchDrawerOnBackdrop(event) {
    if (event.target.id === 'vm-drawer-overlay') closeMatchDrawer();
}

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeMatchDrawer();
});

function setDrawerMode(mode, btn) {
    document.querySelectorAll('.drawer-tab-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    const submitBtn = document.getElementById('drawer-submit-btn');
    if (submitBtn) submitBtn.textContent = mode === 'llamar' ? 'SOLICITAR LLAMADA' : 'DEJA UNA SOLICITUD';
}

function handleDrawerSubmit(event) {
    event.preventDefault();
    const btn = document.getElementById('drawer-submit-btn');
    const original = btn.textContent;
    btn.textContent = 'ENVIANDO SOLICITUD...';
    btn.disabled = true;
    setTimeout(() => {
        btn.textContent = '✓ SOLICITUD RECIBIDA';
        btn.style.background = '#2B6F9E';
        btn.style.color = '#FFFFFF';
        setTimeout(() => {
            closeMatchDrawer();
            btn.textContent = original;
            btn.disabled = false;
            btn.style.background = '#eae6d8';
            btn.style.color = '#102B46';
            document.getElementById('vm-drawer-form').reset();
        }, 1200);
    }, 800);
}

// Navegación inteligente suave y fluida entre secciones con el botón flotante global
function scrollToNextSection() {
    const vh = window.innerHeight;
    const scrollY = window.scrollY || window.pageYOffset;
    
    // Lista ordenada de los puntos clave de scroll en la línea de tiempo de cortinas
    const targets = [
        1.0 * vh, // Sección 2 (El Diferenciador Absoluto)
        3.5 * vh, // Sección 3 (Portafolio de Proyectos)
        4.5 * vh, // Sección 4 (Galería Comercial)
        6.5 * vh, // Sección 5 (Transición de Imagen)
        8.5 * vh, // Sección 6 (Catálogo — El Match)
        0         // Volver al Inicio (Hero)
    ];

    // Encontrar el siguiente hito de navegación con un margen de tolerancia de 30px
    let nextTarget = targets.find(t => t > scrollY + 30);
    if (nextTarget === undefined) {
        nextTarget = 0; // Si estamos en la última sección, vuelve al inicio
    }

    const lenis = window.lenis;
    if (lenis) {
        lenis.scrollTo(nextTarget, {
            duration: 2.2,
            easing: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
        });
    } else {
        window.scrollTo({
            top: nextTarget,
            behavior: 'smooth'
        });
    }
}

// 0e. Fondo FloatingLines WebGL Shader en el Panel Izquierdo del Formulario / Drawer Modal (Get Qualified)
function initDrawerFloatingLines() {
    const canvas = document.getElementById('drawer-floating-lines-canvas');
    const container = document.querySelector('.vm-drawer-left');
    if (!canvas || !container || typeof THREE === 'undefined') return;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const hexToVec3 = (hex) => {
        hex = hex.replace('#', '');
        return new THREE.Vector3(
            parseInt(hex.slice(0, 2), 16) / 255,
            parseInt(hex.slice(2, 4), 16) / 255,
            parseInt(hex.slice(4, 6), 16) / 255
        );
    };

    const vertexShader = `
        precision highp float;
        void main() {
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `;

    const fragmentShader = `
        precision highp float;
        uniform float iTime;
        uniform vec3 iResolution;
        uniform float animationSpeed;
        uniform bool enableTop;
        uniform bool enableMiddle;
        uniform bool enableBottom;
        uniform int topLineCount;
        uniform int middleLineCount;
        uniform int bottomLineCount;
        uniform float topLineDistance;
        uniform float middleLineDistance;
        uniform float bottomLineDistance;
        uniform vec3 topWavePosition;
        uniform vec3 middleWavePosition;
        uniform vec3 bottomWavePosition;
        uniform vec2 iMouse;
        uniform bool interactive;
        uniform float bendRadius;
        uniform float bendStrength;
        uniform float bendInfluence;
        uniform bool parallax;
        uniform float parallaxStrength;
        uniform vec2 parallaxOffset;
        uniform vec3 lineGradient[8];
        uniform int lineGradientCount;

        const vec3 BLACK = vec3(0.0);
        const vec3 PINK = vec3(233.0, 71.0, 245.0) / 255.0;
        const vec3 BLUE = vec3(47.0, 75.0, 162.0) / 255.0;

        mat2 rotate(float r) {
            return mat2(cos(r), sin(r), -sin(r), cos(r));
        }

        vec3 background_color(vec2 uv) {
            vec3 col = vec3(0.0);
            float y = sin(uv.x - 0.2) * 0.3 - 0.1;
            float m = uv.y - y;
            col += mix(BLUE, BLACK, smoothstep(0.0, 1.0, abs(m)));
            col += mix(PINK, BLACK, smoothstep(0.0, 1.0, abs(m - 0.8)));
            return col * 0.5;
        }

        vec3 getLineColor(float t, vec3 baseColor) {
            if (lineGradientCount <= 0) return baseColor;
            if (lineGradientCount == 1) return lineGradient[0] * 0.5;
            float clampedT = clamp(t, 0.0, 0.9999);
            float scaled = clampedT * float(lineGradientCount - 1);
            int idx = int(floor(scaled));
            float f = fract(scaled);
            int idx2 = min(idx + 1, lineGradientCount - 1);
            vec3 c1 = lineGradient[idx];
            vec3 c2 = lineGradient[idx2];
            return mix(c1, c2, f) * 0.85;
        }

        float wave(vec2 uv, float offset, vec2 screenUv, vec2 mouseUv, bool shouldBend) {
            float time = iTime * animationSpeed;
            float x_offset = offset;
            float x_movement = time * 0.1;
            float amp = sin(offset + time * 0.2) * 0.3;
            float y = sin(uv.x + x_offset + x_movement) * amp;
            if (shouldBend) {
                vec2 d = screenUv - mouseUv;
                float influence = exp(-dot(d, d) * bendRadius);
                float bendOffset = (mouseUv.y - screenUv.y) * influence * bendStrength * bendInfluence;
                y += bendOffset;
            }
            float m = uv.y - y;
            return 0.0175 / max(abs(m) + 0.01, 1e-3) + 0.01;
        }

        void mainImage(out vec4 fragColor, in vec2 fragCoord) {
            vec2 baseUv = (2.0 * fragCoord - iResolution.xy) / iResolution.y;
            baseUv.y *= -1.0;
            if (parallax) {
                baseUv += parallaxOffset;
            }
            vec3 col = vec3(0.0);
            vec3 b = lineGradientCount > 0 ? vec3(0.0) : background_color(baseUv);
            vec2 mouseUv = vec2(0.0);
            if (interactive) {
                mouseUv = (2.0 * iMouse - iResolution.xy) / iResolution.y;
                mouseUv.y *= -1.0;
            }
            if (enableBottom) {
                for (int i = 0; i < 10; ++i) {
                    if (i >= bottomLineCount) break;
                    float fi = float(i);
                    float t = fi / max(float(bottomLineCount - 1), 1.0);
                    vec3 lineCol = getLineColor(t, b);
                    float angle = bottomWavePosition.z * log(length(baseUv) + 1.0);
                    vec2 ruv = baseUv * rotate(angle);
                    col += lineCol * wave(ruv + vec2(bottomLineDistance * fi + bottomWavePosition.x, bottomWavePosition.y), 1.5 + 0.2 * fi, baseUv, mouseUv, interactive) * 0.4;
                }
            }
            if (enableMiddle) {
                for (int i = 0; i < 10; ++i) {
                    if (i >= middleLineCount) break;
                    float fi = float(i);
                    float t = fi / max(float(middleLineCount - 1), 1.0);
                    vec3 lineCol = getLineColor(t, b);
                    float angle = middleWavePosition.z * log(length(baseUv) + 1.0);
                    vec2 ruv = baseUv * rotate(angle);
                    col += lineCol * wave(ruv + vec2(middleLineDistance * fi + middleWavePosition.x, middleWavePosition.y), 2.0 + 0.15 * fi, baseUv, mouseUv, interactive);
                }
            }
            if (enableTop) {
                for (int i = 0; i < 10; ++i) {
                    if (i >= topLineCount) break;
                    float fi = float(i);
                    float t = fi / max(float(topLineCount - 1), 1.0);
                    vec3 lineCol = getLineColor(t, b);
                    float angle = topWavePosition.z * log(length(baseUv) + 1.0);
                    vec2 ruv = baseUv * rotate(angle);
                    ruv.x *= -1.0;
                    col += lineCol * wave(ruv + vec2(topLineDistance * fi + topWavePosition.x, topWavePosition.y), 1.0 + 0.2 * fi, baseUv, mouseUv, interactive) * 0.3;
                }
            }
            fragColor = vec4(col, 1.0);
        }

        void main() {
            vec4 color = vec4(0.0);
            mainImage(color, gl_FragCoord.xy);
            gl_FragColor = color;
        }
    `;

    const stops = [hexToVec3('#3d71e4'), hexToVec3('#6d6e68'), hexToVec3('#6a6a6a')];
    const lineGradientArr = Array.from({ length: 8 }, () => new THREE.Vector3(1, 1, 1));
    stops.forEach((v, i) => lineGradientArr[i].copy(v));

    const uniforms = {
        iTime: { value: 0 },
        iResolution: { value: new THREE.Vector3(1, 1, 1) },
        animationSpeed: { value: 1.0 },
        enableTop: { value: true },
        enableMiddle: { value: true },
        enableBottom: { value: true },
        topLineCount: { value: 10 },
        middleLineCount: { value: 10 },
        bottomLineCount: { value: 10 },
        topLineDistance: { value: 0.575 },
        middleLineDistance: { value: 0.575 },
        bottomLineDistance: { value: 0.575 },
        topWavePosition: { value: new THREE.Vector3(10.0, 0.5, -0.4) },
        middleWavePosition: { value: new THREE.Vector3(5.0, 0.0, 0.2) },
        bottomWavePosition: { value: new THREE.Vector3(2.0, -0.7, 0.4) },
        iMouse: { value: new THREE.Vector2(-1000, -1000) },
        interactive: { value: true },
        bendRadius: { value: 8.0 },
        bendStrength: { value: -2.0 },
        bendInfluence: { value: 0 },
        parallax: { value: true },
        parallaxStrength: { value: 0.2 },
        parallaxOffset: { value: new THREE.Vector2(0, 0) },
        lineGradient: { value: lineGradientArr },
        lineGradientCount: { value: 3 }
    };

    const material = new THREE.ShaderMaterial({
        uniforms,
        vertexShader,
        fragmentShader,
        transparent: true
    });

    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const clock = new THREE.Clock();

    function resize() {
        const width = container.clientWidth || window.innerWidth / 2;
        const height = container.clientHeight || window.innerHeight;
        renderer.setSize(width, height, false);
        uniforms.iResolution.value.set(renderer.domElement.width, renderer.domElement.height, 1);
    }
    resize();
    window.addEventListener('resize', resize, { passive: true });

    container.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left) * renderer.getPixelRatio();
        const mouseY = (rect.height - (e.clientY - rect.top)) * renderer.getPixelRatio();
        uniforms.iMouse.value.set(mouseX, mouseY);
        uniforms.bendInfluence.value = 1.0;
    });

    let isDrawerLinesAnimating = false;
    let drawerAnimId = null;

    function animate() {
        if (!isDrawerLinesAnimating) return;
        drawerAnimId = requestAnimationFrame(animate);
        uniforms.iTime.value = clock.getElapsedTime();
        renderer.render(scene, camera);
    }

    window.startDrawerLinesAnimation = function() {
        if (!isDrawerLinesAnimating) {
            isDrawerLinesAnimating = true;
            clock.start();
            animate();
        }
    };

    window.stopDrawerLinesAnimation = function() {
        isDrawerLinesAnimating = false;
        if (drawerAnimId) cancelAnimationFrame(drawerAnimId);
    };
}
