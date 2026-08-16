document.addEventListener('DOMContentLoaded', () => {
    initLenis();
    initHeroMagneticSnap();
    initSection2MagneticSnap();
    initGaleriaMagneticSnap();
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
    initIntegrityCurtain();
    initIntegrityMagneticSnap();
    initIdeaLabCurtain();
    initVmartCurtain();
    initVmartMagneticSnap();
    initPortfolioVideoObserver();
    initGaleriaVideoObserver();
    initImageTrail();
    initDrawerFloatingLines();
    initIdeaLabGalleryScroll();
    initPropuestasModal();
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
    if (window.innerWidth <= 768) return;
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
            points.push(wrapperTop + 5.5 * vh);   // 04. Sección 3 (Tarjetas completas)
            points.push(wrapperTop + 10.2 * vh);  // 05. Sección 4 (#galeria-comercial)
            points.push(wrapperTop + 10.7 * vh);  // 06. Sección 5 (#transicion-imagen)
            points.push(wrapperTop + 12.2 * vh);  // 07. Sección 6 (#el-match - Revelación)
            points.push(wrapperTop + 13.5 * vh);  // 08. Sección 6 (Desfile completo)
            points.push(wrapperTop + 14.5 * vh);  // 09. Sección 7 (Pilar de Integridad)
            points.push(wrapperTop + 17.5 * vh);  // 10. Sección 8 (Idea Lab - Final)
            points.push(wrapperTop + 19.5 * vh);  // 11. Sección 9 (ValorMáximoART + Footer)
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

// 0a2. Snap Magnético Suave Genérico (por porcentaje de visibilidad)
// Se activa cuando la sección tiene el mayor porcentaje de visibilidad durante la
// navegación, influyendo tanto en la sección anterior (revelado sobre ella) como en
// la siguiente (que empieza a cubrirla). La centra con un movimiento sutil y fluido,
// con énfasis: dispara en todo momento de forma automática.
function createMagneticSnap(config) {
    if (window.innerWidth <= 768) return;
    const wrapper = document.querySelector('.curtain-wrapper');
    const lenis = window.lenis;
    if (!wrapper) return;

    const { revealStartVh, revealEndVh, coverStartVh, coverEndVh, snapTargetVh, threshold = 0.5 } = config;

    let isSnapping = false;
    let snapTimer = null;
    let releaseTimer = null;

    function isDrawerActive() {
        const drawer = document.getElementById('vm-drawer-overlay');
        return drawer && drawer.classList.contains('active');
    }

    // Proporción de visibilidad real de la sección en el viewport:
    // fracción de cortina revelada × (1 - fracción con la que la siguiente sección la cubre)
    function getShare() {
        const vh = window.innerHeight;
        const rect = wrapper.getBoundingClientRect();
        const scrolled = -rect.top;

        const reveal = Math.min(1, Math.max(0, (scrolled - revealStartVh * vh) / ((revealEndVh - revealStartVh) * vh)));
        const cover = Math.min(1, Math.max(0, (scrolled - coverStartVh * vh) / ((coverEndVh - coverStartVh) * vh)));

        return reveal * (1 - cover);
    }

    function maybeSnap() {
        if (window.innerWidth <= 768 || isSnapping || isDrawerActive()) return;
        // Durante la navegación por clic (flecha/menú) se suprime el snap para
        // no bloquear el avance hacia la siguiente sección.
        if (window.__suppressSnapUntil && Date.now() < window.__suppressSnapUntil) return;

        const share = getShare();
        // Solo cuando la sección tiene el mayor porcentaje de visibilidad
        if (share < threshold) return;

        const vh = window.innerHeight;
        const target = snapTargetVh * vh; // posición donde la sección cubre el 100% del viewport (centrada)
        if (Math.abs(window.scrollY - target) <= 10) return;

        isSnapping = true;
        // Liberar el bloqueo SIEMPRE tras la duración máxima de la animación lenta (3.6s)
        clearTimeout(releaseTimer);
        releaseTimer = setTimeout(() => { isSnapping = false; }, 3600);

        if (lenis) {
            lenis.scrollTo(target, {
                duration: 2.2, // Duración a mitad de velocidad (2.2s) para un desplegado pausado y majestuoso
                easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
                onComplete: () => { isSnapping = false; }
            });
        } else {
            window.scrollTo({ top: target, behavior: 'smooth' });
            setTimeout(() => { isSnapping = false; }, 2600);
        }
    }

    function scheduleSnap() {
        if (window.innerWidth <= 768 || isSnapping || isDrawerActive()) return;

        // Disparo inmediato cuando el scroll está casi detenido (velocidad baja),
        // garantizando que el snap se active siempre de forma automática.
        if (lenis && !isNaN(lenis.velocity) && Math.abs(lenis.velocity) < 3) {
            maybeSnap();
            return;
        }

        // Respaldo: debounce corto tras el último evento de scroll
        clearTimeout(snapTimer);
        snapTimer = setTimeout(maybeSnap, 120);
    }

    if (lenis) {
        lenis.on('scroll', scheduleSnap);
    }
    window.addEventListener('scroll', scheduleSnap, { passive: true });

    setTimeout(maybeSnap, 400);
}

// Snap Magnético de la Sección 1 (Hero) — centra en 0.0vh
function initHeroMagneticSnap() {
    if (window.innerWidth <= 768) return;
    createMagneticSnap({
        revealStartVh: 0,
        revealEndVh: 0.5,
        coverStartVh: 0.5,
        coverEndVh: 1.0,
        snapTargetVh: 0.0,
        threshold: 0.38
    });
}

// Snap Magnético de la Sección 2 (El Diferenciador Absoluto) — centra en 1.0vh
// Umbral 0.33: énfasis, incluye el tramo donde la Sección 3 se asoma parcialmente.
function initSection2MagneticSnap() {
    if (window.innerWidth <= 768) return;
    createMagneticSnap({
        revealStartVh: 0,
        revealEndVh: 1,
        coverStartVh: 1,
        coverEndVh: 2,
        snapTargetVh: 1.0,
        threshold: 0.33
    });
}

// Snap Magnético de la Sección 4 (Galería Comercial) — centra en 10.2vh
function initGaleriaMagneticSnap() {
    if (window.innerWidth <= 768) return;
    createMagneticSnap({
        revealStartVh: 9.0,
        revealEndVh: 10.2,
        coverStartVh: 10.2,
        coverEndVh: 10.7,
        snapTargetVh: 10.2
    });
}

// Snap Magnético de la Sección 7 (Pilar de Integridad) — por mayor visibilidad
// Se activa cuando Integridad tiene el mayor porcentaje de visibilidad respecto
// a la sección anterior (Catálogo, que termina de revelarse en 13.5vh) y a la
// siguiente (Idea Lab, que empieza a cubrirla en 14.5vh). Centra en 14.5vh.
function initIntegrityMagneticSnap() {
    if (window.innerWidth <= 768) return;
    createMagneticSnap({
        revealStartVh: 13.5,
        revealEndVh: 14.5,
        coverStartVh: 14.5,
        coverEndVh: 16.5,
        snapTargetVh: 14.5,
        threshold: 0.42
    });
}

// Snap Magnético de la Última Sección (Valor MáximoART + Footer) — centra en 19.5vh
// Se activa automáticamente cuando la sección alcanza la visibilidad requerida en el viewport.
function initVmartMagneticSnap() {
    if (window.innerWidth <= 768) return;
    createMagneticSnap({
        revealStartVh: 17.5,
        revealEndVh: 19.5,
        coverStartVh: 19.5,
        coverEndVh: 21.0,
        snapTargetVh: 19.5,
        threshold: 0.38
    });
}

// 0b. Curtain Reveal Vertical (Sección 2 sobre Hero)
function initCurtainReveals() {
    const wrapper = document.querySelector('.curtain-wrapper');
    const esencia = document.getElementById('esencia');
    if (!wrapper || !esencia) return;
    const container = esencia.querySelector('.container');

    function update() {
        const rect = wrapper.getBoundingClientRect();
        const vh = window.innerHeight;
        const scrolled = -rect.top;
        // Cortina Sección 2 despliega de 0.15vh a 1.0vh
        const progress = Math.min(1, Math.max(0, (scrolled - 0.15 * vh) / (0.85 * vh)));
        const clipPercent = (1 - progress) * 100;

        esencia.style.setProperty('--curtain', `${clipPercent}%`);

        if (container) {
            if (progress < 1.0) {
                if (window.innerWidth > 768) {
                    const translateY = (1 - progress) * 60;
                    container.style.transform = `translate3d(0, ${translateY}px, 0)`;
                    container.style.opacity = progress;
                } else {
                    container.style.transform = `translate3d(0, 0px, 0)`;
                    container.style.opacity = 1;
                }
            } else {
                // Scroll interno activo de 1.0vh a 3.6vh (mientras la cortina de la sig. sección está 100% DESACTIVADA).
                // A 3.6vh el recuadro 'Acondicionamiento y Construcción' ya está 100% visible. Se da una pausa hasta 4.3vh.
                const activeScrolled = Math.max(0, scrolled - 1.0 * vh);
                const totalActiveTravel = 2.6 * vh;
                const flowProgress = Math.min(1, activeScrolled / totalActiveTravel);
                const maxScroll = Math.max(0, container.scrollHeight - vh + 80);

                const translateYValue = -flowProgress * maxScroll;
                container.style.transform = `translate3d(0, ${translateYValue}px, 0)`;
                container.style.opacity = 1;
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

// 0b2. Curtain Reveal Vertical (Sección 4: Galería Comercial)
function initGaleriaCurtain() {
    const galeria = document.getElementById('galeria-comercial');
    const wrapper = document.querySelector('.curtain-wrapper');
    if (!galeria || !wrapper) return;
    const container = galeria.querySelector('.container');

    function update() {
        const rect = wrapper.getBoundingClientRect();
        const vh = window.innerHeight;
        const scrolled = -rect.top;

        // La cortina SÓLO se activa a partir de 9.5vh (tras completar la Sección 3)
        const progress = Math.min(1, Math.max(0, (scrolled - 9.5 * vh) / (0.7 * vh)));
        const clipPercent = (1 - progress) * 100;

        galeria.style.setProperty('--curtain-galeria', `${clipPercent}%`);

        if (container) {
            if (progress < 1.0) {
                container.style.transform = `translate3d(0, 0px, 0)`;
            } else {
                // Scroll interno compacto de Galería Comercial activo de 10.2vh a 10.7vh
                const activeScrolled = Math.max(0, scrolled - 10.2 * vh);
                const totalActiveTravel = 0.5 * vh;
                const flowProgress = Math.min(1, activeScrolled / totalActiveTravel);
                const maxScroll = Math.max(0, container.scrollHeight - vh + 50);

                const translateYValue = -flowProgress * maxScroll;
                container.style.transform = `translate3d(0, ${translateYValue}px, 0)`;
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

// 0b3. Curtain Reveal 2 Fases (Sección 5: Transición de Imagen)
function initTransitionCurtain() {
    const sec = document.getElementById('transicion-imagen');
    const wrapper = document.querySelector('.curtain-wrapper');
    if (!sec || !wrapper) return;

    function update() {
        const rect = wrapper.getBoundingClientRect();
        const vh = window.innerHeight;
        const scrolled = -rect.top;

        // Cortina de Sección 5 SÓLO se activa a partir de 10.7vh (transición rápida e inmediata tras Galería Comercial)
        const progress = Math.min(1, Math.max(0, (scrolled - 10.7 * vh) / (1.0 * vh)));

        let clipPathValue = '';

        if (progress <= 0.5) {
            const phase1 = progress / 0.5;
            const yPercent = phase1 * 100;
            clipPathValue = `polygon(50% 0%, 100% 0%, 100% ${yPercent}%, 50% ${yPercent}%)`;
        } else {
            const phase2 = (progress - 0.5) / 0.5;
            const xLeft = 50 - phase2 * 50;
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
    const container = sec.querySelector('.catalog-grid-container');
    const scrollIndicator = document.getElementById('catalog-scroll-indicator');

    let maxTranslate = 0;
    function measureLayout() {
        if (rightCol && window.innerWidth > 768) {
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

        // Cortina de Catálogo se activa a partir de 12.2vh hasta 13.4vh
        const progressSec6 = Math.min(1, Math.max(0, (scrolled - 12.2 * vh) / (1.2 * vh)));

        let clipPathValue = '';

        if (progressSec6 <= 0.5) {
            const phase1 = progressSec6 / 0.5;
            const yTop = 100 - (phase1 * 100);
            clipPathValue = `polygon(0% ${yTop}%, 50% ${yTop}%, 50% 100%, 0% 100%)`;
        } else {
            const phase2 = (progressSec6 - 0.5) / 0.5;
            const xRight = 50 + (phase2 * 50);
            clipPathValue = `polygon(0% 0%, ${xRight}% 0%, ${xRight}% 100%, 0% 100%)`;
        }

        sec.style.clipPath = clipPathValue;
        sec.style.webkitClipPath = clipPathValue;

        if (window.innerWidth > 768) {
            if (rightCol) {
                const flowScrolled = Math.max(0, scrolled - 13.4 * vh);
                const totalTravel = 3.9 * vh;
                const flowProgress = Math.min(1, flowScrolled / totalTravel);

                const translateYValue = -flowProgress * maxTranslate;

                rightCol.style.transform = `translate3d(0, ${translateYValue}px, 0)`;

                if (scrollIndicator) {
                    const isFadedOut = flowScrolled > 120 || progressSec6 < 0.2;
                    scrollIndicator.classList.toggle('hidden', isFadedOut);
                }
            }
            if (container) container.style.transform = `translate3d(0, 0px, 0)`;
        } else {
            // Modo responsive: traslación fluida del contenedor completo sin textos ni elementos fijos o pegajosos
            if (rightCol) rightCol.style.transform = `none`;
            if (container) {
                if (progressSec6 < 1.0) {
                    container.style.transform = `translate3d(0, 0px, 0)`;
                } else {
                    const flowScrolled = Math.max(0, scrolled - 13.4 * vh);
                    const totalTravel = 3.9 * vh;
                    const flowProgress = Math.min(1, flowScrolled / totalTravel);
                    const maxScroll = Math.max(0, container.scrollHeight - vh + 100);

                    const translateYValue = -flowProgress * maxScroll;
                    container.style.transform = `translate3d(0, ${translateYValue}px, 0)`;
                }
            }
        }

        const globalScrollBtn = document.getElementById('global-scroll-btn');
        if (globalScrollBtn) {
            const isCurtainFlow = scrolled >= 12.2 * vh;
            globalScrollBtn.classList.toggle('hidden', isCurtainFlow);
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

// 0b5. Curtain Reveal Vertical (Sección 7: Pilar de Integridad)
function initIntegrityCurtain() {
    const sec = document.getElementById('pilar-integridad');
    const wrapper = document.querySelector('.curtain-wrapper');
    if (!sec || !wrapper) return;

    const leftCol = sec.querySelector('.integridad-left-col');
    const container = sec.querySelector('.container');
    const staggerEls = sec.querySelectorAll('.integridad-card-stagger');
    const cardThresholds = [18.3, 18.8, 19.3, 19.8, 20.3];

    function update() {
        const rect = wrapper.getBoundingClientRect();
        const vh = window.innerHeight;
        const scrolled = -rect.top;

        // Cortina SÓLO se activa a partir de 17.3vh hasta 18.15vh
        const progress = Math.min(1, Math.max(0, (scrolled - 17.3 * vh) / (0.85 * vh)));
        const clipPercent = (1 - progress) * 100;
        sec.style.setProperty('--curtain-integrity', `${clipPercent}%`);

        if (progress < 1.0) {
            if (leftCol && window.innerWidth > 768) {
                const translateY = (1 - progress) * 60;
                leftCol.style.transform = `translateY(${translateY}px)`;
                leftCol.style.opacity = progress;
            } else if (container) {
                container.style.transform = `translate3d(0, 0px, 0)`;
            }
        } else {
            // Scroll interno activo de 18.15vh a 20.5vh
            if (container) {
                const activeScrolled = Math.max(0, scrolled - 18.15 * vh);
                const totalActiveTravel = 2.35 * vh;
                const flowProgress = Math.min(1, activeScrolled / totalActiveTravel);
                const maxScroll = Math.max(0, container.scrollHeight - vh + 80);

                const translateYValue = -flowProgress * maxScroll;
                container.style.transform = `translate3d(0, ${translateYValue}px, 0)`;
            }
        }

        // Entrada escalonada de las tarjetas de pilares
        const progressTotal = scrolled / vh;
        staggerEls.forEach((card, index) => {
            const threshold = cardThresholds[index] !== undefined ? cardThresholds[index] : (18.3 + index * 0.5);
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

// 0b5. Curtain Reveal Vertical (Sección 8: Idea Lab)
function initIdeaLabCurtain() {
    const sec = document.getElementById('idea-lab');
    const wrapper = document.querySelector('.curtain-wrapper');
    if (!sec || !wrapper) return;

    const leftCol = sec.querySelector('.idealab-left-col');
    const container = sec.querySelector('.container');
    const staggerEls = sec.querySelectorAll('.idealab-card-stagger');
    const cardThresholds = [20.8, 21.2, 21.6, 22.0];

    function update() {
        const rect = wrapper.getBoundingClientRect();
        const vh = window.innerHeight;
        const scrolled = -rect.top;

        // Cortina SÓLO se activa a partir de 20.5vh hasta 21.5vh
        const progress = Math.min(1, Math.max(0, (scrolled - 20.5 * vh) / (1.0 * vh)));
        const clipPercent = (1 - progress) * 100;
        sec.style.setProperty('--curtain-idealab', `${clipPercent}%`);

        if (progress < 1.0) {
            if (leftCol && window.innerWidth > 768) {
                const translateY = (1 - progress) * 60;
                leftCol.style.transform = `translateY(${translateY}px)`;
                leftCol.style.opacity = progress;
            } else if (container) {
                container.style.transform = `translate3d(0, 0px, 0)`;
            }
        } else {
            // Scroll interno activo de 21.5vh a 25.5vh (recorriendo los 4 procesos completos sobre fondo 100% inmóvil)
            if (container) {
                const activeScrolled = Math.max(0, scrolled - 21.5 * vh);
                const totalActiveTravel = 4.0 * vh;
                const flowProgress = Math.min(1, activeScrolled / totalActiveTravel);
                const maxScroll = Math.max(0, container.scrollHeight - vh + 180);

                const translateYValue = -flowProgress * maxScroll;
                container.style.transform = `translate3d(0, ${translateYValue}px, 0)`;
            }
        }

        // Entrada de las tarjetas de procesos
        const progressTotal = scrolled / vh;
        staggerEls.forEach((card, index) => {
            if (window.innerWidth <= 768) {
                card.classList.add('active');
            } else {
                const threshold = cardThresholds[index] !== undefined ? cardThresholds[index] : (20.8 + index * 0.4);
                card.classList.toggle('active', progressTotal >= threshold);
            }
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

// 0b6. Curtain Reveal Vertical (Sección 9: Valor MáximoART + Footer)
function initVmartCurtain() {
    const sec = document.getElementById('valormaximoart');
    const wrapper = document.querySelector('.curtain-wrapper');
    if (!sec || !wrapper) return;
    const container = sec.querySelector('.container');

    function update() {
        const rect = wrapper.getBoundingClientRect();
        const vh = window.innerHeight;
        const scrolled = -rect.top;

        // Cortina SÓLO se activa a partir de 25.5vh hasta 26.8vh
        const progress = Math.min(1, Math.max(0, (scrolled - 25.5 * vh) / (1.3 * vh)));
        const clipPercent = (1 - progress) * 100;
        sec.style.setProperty('--curtain-vmart', `${clipPercent}%`);

        if (container) {
            if (progress < 1.0) {
                container.style.transform = `translate3d(0, 0px, 0)`;
            } else {
                const activeScrolled = Math.max(0, scrolled - 26.8 * vh);
                const totalActiveTravel = 2.5 * vh;
                const flowProgress = Math.min(1, activeScrolled / totalActiveTravel);
                const maxScroll = Math.max(0, container.scrollHeight - vh + 80);

                const translateYValue = -flowProgress * maxScroll;
                container.style.transform = `translate3d(0, ${translateYValue}px, 0)`;
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
                    heroVideo.play().catch(() => { });
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

// 0c1b. Video Observer del Portafolio (Sección 3 - Pausa el video fuera de pantalla)
function initPortfolioVideoObserver() {
    const portfolioVideo = document.querySelector('.portfolio-video-bg video');
    const section = document.getElementById('casos-exito');
    if (!portfolioVideo || !section) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                if (portfolioVideo.paused) {
                    portfolioVideo.play().catch(() => { });
                }
            } else {
                if (!portfolioVideo.paused) {
                    portfolioVideo.pause();
                }
            }
        });
    }, { threshold: 0.05 });

    observer.observe(section);
}

// 0c1c. Video Observer de la Galería Comercial (Sección 4 - Pausa el video fuera de pantalla)
function initGaleriaVideoObserver() {
    const galeriaVideo = document.querySelector('.galeria-video-bg video');
    const section = document.getElementById('galeria-comercial');
    if (!galeriaVideo || !section) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                if (galeriaVideo.paused) {
                    galeriaVideo.play().catch(() => { });
                }
            } else {
                if (!galeriaVideo.paused) {
                    galeriaVideo.pause();
                }
            }
        });
    }, { threshold: 0.05 });

    observer.observe(section);
}

// 0g. Estela de Imágenes Pixelada (Pixelated Image Trail) — Sección 4: Galería Comercial
// Port fiel del componente React a JavaScript vanilla (mismo comportamiento: slices con
// clip-path escalonado, interpolación del puntero, deslizamiento y colapso pixelado).
function initImageTrail() {
    const container = document.getElementById('galeria-trail');
    if (!container) return;

    // Imágenes de la carpeta /galeria (pega aquí tus imágenes y actualiza la lista)
    const images = [
        'galeria/villanueva.jpg',
        'galeria/hidalgo.jpg',
        'galeria/paseo central.jpg',
        'galeria/pinosuarez.jpg',
        'galeria/rivapalacio.jpg',
        'galeria/unniplaza.jpg',
        'galeria/villada.jpg',
    ];

    const config = {
        imageLifespan: 1500,
        inDuration: 280,
        outDuration: 620,
        staggerIn: 12,
        staggerOut: 9,
        slideDuration: 1300,
        slideEasing: 'cubic-bezier(0.16, 1, 0.3, 1)',
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
    };
    const slices = 5;
    const spawnThreshold = 32;
    const smoothing = 0.32;
    const imageSize = 220;
    const MAX_ACTIVE_IMAGES = 14;

    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

    const safeSlices = Math.max(1, Math.floor(slices));
    const safeSmoothing = clamp(smoothing, 0.01, 1);
    const safeSpawnThreshold = Math.max(1, spawnThreshold);
    const safeImageSize = Math.max(40, imageSize);
    const getSliceDelay = (index, stagger) => Math.abs(index - (safeSlices - 1) / 2) * stagger;
    const getMaxSliceDelay = (stagger) => ((safeSlices - 1) / 2) * stagger;

    // Precarga de imágenes: solo se usan las que cargan correctamente
    const validImages = [];
    images.forEach((src) => {
        const image = new Image();
        image.onload = () => {
            if (!validImages.includes(src)) validImages.push(src);
        };
        image.src = src;
    });

    let currentImageIndex = 0;
    let timeouts = [];
    let activeImages = [];
    let pointerActive = false;
    let animFrame = null;
    const pointerPos = { x: 0, y: 0 };
    const lastSpawnPos = { x: 0, y: 0 };
    const interpolatedPos = { x: 0, y: 0 };

    const schedule = (callback, delay) => {
        const timeout = window.setTimeout(() => {
            timeouts = timeouts.filter((id) => id !== timeout);
            callback();
        }, delay);
        timeouts.push(timeout);
        return timeout;
    };

    const updatePointer = (event) => {
        const rect = container.getBoundingClientRect();
        const nextPosition = {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
        };

        pointerPos.x = nextPosition.x;
        pointerPos.y = nextPosition.y;

        if (!pointerActive) {
            pointerActive = true;
            interpolatedPos.x = nextPosition.x;
            interpolatedPos.y = nextPosition.y;
            lastSpawnPos.x = nextPosition.x;
            lastSpawnPos.y = nextPosition.y;
        }
    };

    const handlePointerLeave = () => {
        pointerActive = false;
    };

    const distanceFromLastSpawn = () => Math.hypot(
        interpolatedPos.x - lastSpawnPos.x,
        interpolatedPos.y - lastSpawnPos.y
    );

    const createTrailImage = () => {
        if (!validImages.length) return;

        const imageSource = validImages[currentImageIndex % validImages.length];
        currentImageIndex = (currentImageIndex + 1) % validImages.length;

        const startX = interpolatedPos.x - safeImageSize / 2;
        const startY = interpolatedPos.y - safeImageSize / 2;
        const targetX = startX + (pointerPos.x - interpolatedPos.x) * 0.45;
        const targetY = startY + (pointerPos.y - interpolatedPos.y) * 0.45;

        const imageElement = document.createElement('div');
        const layerFragment = document.createDocumentFragment();

        Object.assign(imageElement.style, {
            position: 'absolute',
            left: `${startX}px`,
            top: `${startY}px`,
            width: `${safeImageSize}px`,
            height: `${safeImageSize}px`,
            pointerEvents: 'none',
            overflow: 'hidden',
            borderRadius: '12px',
            opacity: '1',
            transform: 'translate3d(0, 0, 0) scale(1)',
            transition: [
                `left ${config.slideDuration}ms ${config.slideEasing}`,
                `top ${config.slideDuration}ms ${config.slideEasing}`,
                `opacity ${config.outDuration}ms ${config.easing}`,
                `transform ${config.outDuration}ms ${config.easing}`,
            ].join(', '),
            willChange: 'left, top, opacity, transform',
            zIndex: '1',
            filter: 'drop-shadow(0 16px 24px rgb(0 0 0 / 0.22))',
            contain: 'layout style paint',
            backfaceVisibility: 'hidden',
        });

        const layers = [];

        for (let index = 0; index < safeSlices; index += 1) {
            const sliceSize = 100 / safeSlices;
            const startClipY = index * sliceSize;
            const endClipY = (index + 1) * sliceSize;
            const layer = document.createElement('div');
            const imageLayer = document.createElement('div');

            Object.assign(layer.style, {
                position: 'absolute',
                inset: '0',
                overflow: 'hidden',
                clipPath: `polygon(50% ${startClipY}%, 50% ${startClipY}%, 50% ${endClipY}%, 50% ${endClipY}%)`,
                transition: `clip-path ${config.inDuration}ms ${config.easing}`,
                transitionDelay: `${getSliceDelay(index, config.staggerIn)}ms`,
                transform: 'translateZ(0)',
                backfaceVisibility: 'hidden',
                willChange: 'clip-path',
                contain: 'layout style',
            });

            Object.assign(imageLayer.style, {
                position: 'absolute',
                inset: '0',
                backgroundImage: `url("${imageSource}")`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                borderRadius: '12px',
                transform: 'translateZ(0)',
                backfaceVisibility: 'hidden',
                boxShadow: 'inset 0 0 0 1px rgb(255 255 255 / 0.08)',
            });

            layer.appendChild(imageLayer);
            layerFragment.appendChild(layer);
            layers.push(layer);
        }

        imageElement.appendChild(layerFragment);
        container.appendChild(imageElement);
        activeImages.push(imageElement);

        while (activeImages.length > MAX_ACTIVE_IMAGES) {
            activeImages.shift()?.remove();
        }

        requestAnimationFrame(() => {
            if (imageElement.parentElement !== container) return;

            imageElement.style.left = `${targetX}px`;
            imageElement.style.top = `${targetY}px`;

            layers.forEach((layer, index) => {
                const sliceSize = 100 / safeSlices;
                const startClipY = index * sliceSize;
                const endClipY = (index + 1) * sliceSize;
                layer.style.clipPath = `polygon(0% ${startClipY}%, 100% ${startClipY}%, 100% ${endClipY}%, 0% ${endClipY}%)`;
            });
        });

        schedule(() => {
            imageElement.style.opacity = '0';
            imageElement.style.transform = 'translate3d(0, 0, 0) scale(0.24)';

            layers.forEach((layer, index) => {
                const sliceSize = 100 / safeSlices;
                const startClipY = index * sliceSize;
                const endClipY = (index + 1) * sliceSize;
                layer.style.transition = `clip-path ${config.outDuration}ms ${config.easing}`;
                layer.style.transitionDelay = `${getSliceDelay(index, config.staggerOut)}ms`;
                layer.style.clipPath = `polygon(50% ${startClipY}%, 50% ${startClipY}%, 50% ${endClipY}%, 50% ${endClipY}%)`;
            });

            schedule(() => {
                activeImages = activeImages.filter((element) => element !== imageElement);
                imageElement.remove();
            }, config.outDuration + getMaxSliceDelay(config.staggerOut));
        }, config.imageLifespan);
    };

    const render = () => {
        if (pointerActive) {
            interpolatedPos.x = interpolatedPos.x + (pointerPos.x - interpolatedPos.x) * safeSmoothing;
            interpolatedPos.y = interpolatedPos.y + (pointerPos.y - interpolatedPos.y) * safeSmoothing;

            if (distanceFromLastSpawn() > safeSpawnThreshold) {
                lastSpawnPos.x = interpolatedPos.x;
                lastSpawnPos.y = interpolatedPos.y;
                createTrailImage();
            }
        }

        animFrame = requestAnimationFrame(render);
    };

    container.addEventListener('pointerenter', updatePointer);
    container.addEventListener('pointermove', updatePointer);
    container.addEventListener('pointerleave', handlePointerLeave);
    animFrame = requestAnimationFrame(render);
}

// 0d. Fondo Silk Shader (Sección 2 - El Diferenciador Absoluto)
function initSilkBackground() {
    const canvas = document.getElementById('silk-canvas');
    const container = document.getElementById('esencia');
    if (!canvas || !container || typeof THREE === 'undefined') return;

    // Renderer transparente para que el fondo oscuro de #esencia se vea a través del patrón
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const vertexShader = `
        varying vec2 vUv;
        varying vec3 vPosition;

        void main() {
            vPosition = position;
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `;

    const fragmentShader = `
        varying vec2 vUv;
        varying vec3 vPosition;

        uniform float uTime;
        uniform vec3  uColor;
        uniform float uSpeed;
        uniform float uScale;
        uniform float uRotation;
        uniform float uNoiseIntensity;

        const float e = 2.71828182845904523536;

        float noise(vec2 texCoord) {
            float G = e;
            vec2  r = (G * sin(G * texCoord));
            return fract(r.x * r.y * (1.0 + texCoord.x));
        }

        vec2 rotateUvs(vec2 uv, float angle) {
            float c = cos(angle);
            float s = sin(angle);
            mat2  rot = mat2(c, -s, s, c);
            return rot * uv;
        }

        void main() {
            float rnd        = noise(gl_FragCoord.xy);
            vec2  uv         = rotateUvs(vUv * uScale, uRotation);
            vec2  tex        = uv * uScale;
            float tOffset    = uSpeed * uTime;

            tex.y += 0.03 * sin(8.0 * tex.x - tOffset);

            float pattern = 0.6 +
                            0.4 * sin(5.0 * (tex.x + tex.y +
                                             cos(3.0 * tex.x + 5.0 * tex.y) +
                                             0.02 * tOffset) +
                                     sin(20.0 * (tex.x + tex.y - 0.1 * tOffset)));

            vec4 col = vec4(uColor, 1.0) * vec4(pattern) - rnd / 15.0 * uNoiseIntensity;
            col.a = 0.75;
            gl_FragColor = col;
        }
    `;

    const hexToNormalizedRGB = (hex) => {
        hex = hex.replace('#', '');
        return [
            parseInt(hex.slice(0, 2), 16) / 255,
            parseInt(hex.slice(2, 4), 16) / 255,
            parseInt(hex.slice(4, 6), 16) / 255
        ];
    };

    const uniforms = {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(...hexToNormalizedRGB('#EEBF6F')) },
        uSpeed: { value: 5 },
        uScale: { value: 1 },
        uRotation: { value: 0 },
        uNoiseIntensity: { value: 1.5 }
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
        uniforms.uTime.value += 0.1 * clock.getDelta();
        renderer.render(scene, camera);
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                if (!isSilkAnimating) {
                    isSilkAnimating = true;
                    clock.getDelta();
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

// 0c. Curtain Reveal Horizontal y Secuencia Sticky Timeline (Sección 3: Portafolio — Casos de Éxito)
function initHorizontalCurtainReveals() {
    const leftCurtains = document.querySelectorAll('.section-curtain-left');
    if (!leftCurtains.length) return;

    const blurTextP = document.querySelector('.blur-text-element');
    const cards = document.querySelectorAll('.project-card-stagger');
    const sec = document.getElementById('casos-exito');
    const container = sec ? sec.querySelector('.portfolio-container') : null;

    function update() {
        const wrapper = document.querySelector('.curtain-wrapper');
        if (!wrapper) return;
        const rect = wrapper.getBoundingClientRect();
        const vh = window.innerHeight;
        const scrolled = -rect.top;

        // La cortina SÓLO se activa tras visualizar al 100% 'Acondicionamiento y Construcción' (Sección 2) + 300px de margen
        const delayPx = 300;
        const startPx = 4.3 * vh + delayPx;

        // Mientras scrolled < startPx, progress = 0 y clipRight = 100% (Cortina 100% DESACTIVADA / Oculta)
        const progress = Math.min(1, Math.max(0, (scrolled - startPx) / (0.9 * vh)));
        const clipRight = Math.max(0, Math.min(100, 100 - progress * 100));

        leftCurtains.forEach(section => {
            section.style.setProperty('--curtain-right', `${clipRight}%`);
        });

        // Scroll interno fluido para el contenedor de la Sección 3
        if (container) {
            if (progress < 1.0) {
                container.style.transform = `translate3d(0, 0px, 0)`;
            } else {
                const activeStartPx = startPx + 0.9 * vh;
                const activeScrolled = Math.max(0, scrolled - activeStartPx);
                const totalActiveTravel = 3.3 * vh;
                const flowProgress = Math.min(1, activeScrolled / totalActiveTravel);
                const maxScroll = Math.max(0, container.scrollHeight - vh + 100);

                const translateYValue = -flowProgress * maxScroll;
                container.style.transform = `translate3d(0, ${translateYValue}px, 0)`;
            }
        }

        // Secuencia Timeline en vh acumulado (SÓLO para escritorio)
        if (window.innerWidth > 768) {
            const progressTotal = scrolled / vh;
            const baseVh = (startPx / vh) + 0.9; // ~5.7vh

            if (blurTextP) {
                blurTextP.classList.toggle('active', progressTotal >= (baseVh - 0.2));
            }

            const cardThresholds = [baseVh + 0.3, baseVh + 1.0, baseVh + 1.7, baseVh + 2.4];
            cards.forEach((card, index) => {
                const threshold = cardThresholds[index] !== undefined ? cardThresholds[index] : (baseVh + 0.3 + index * 0.7);
                card.classList.toggle('active', progressTotal >= threshold);
            });
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

        // Durante Casos de Éxito y Galería Comercial (Sección 3 y 4: 1.8vh - 6.5vh) y desde Pilar de Integridad (Sección 7: >= 14.4vh):
        // el logo y los enlaces del header (Catálogo, Idea Lab) se muestran en blanco en su estado normal (sin cursor)
        const inDarkSection = (scrolled >= 1.8 * vh && scrolled < 6.5 * vh) || (scrolled >= 14.4 * vh);
        logo.classList.toggle('logo-white', inDarkSection);
        const navLinksEl = document.querySelector('.nav-links');
        if (navLinksEl) {
            navLinksEl.classList.toggle('nav-white', inDarkSection);
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

// Ventana Desplegable Filosofía (Sección 2)
function openPhilosophyDrawer() {
    const drawer = document.getElementById('philosophy-drawer-overlay');
    if (!drawer) return;
    drawer.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closePhilosophyDrawer() {
    const drawer = document.getElementById('philosophy-drawer-overlay');
    if (!drawer) return;
    drawer.classList.remove('active');
    document.body.style.overflow = '';
}

function closePhilosophyDrawerOnBackdrop(event) {
    if (event.target.id === 'philosophy-drawer-overlay') closePhilosophyDrawer();
}

// Ventana Desplegable Nuestro Compromiso (Pilar de Integridad)
let compromisoWheelBound = false;
let compromisoTouchStartY = 0;

function handleCompromisoTouchStart(e) {
    if (e.touches && e.touches.length > 0) {
        compromisoTouchStartY = e.touches[0].clientY;
    }
}

function handleCompromisoTouchMove(e) {
    const drawer = document.getElementById('compromiso-drawer-overlay');
    if (!drawer || !drawer.classList.contains('active')) return;

    const panel = document.getElementById('compromiso-drawer-panel');
    if (!panel || !e.touches || e.touches.length === 0) return;

    const currentY = e.touches[0].clientY;
    const deltaY = compromisoTouchStartY - currentY;
    compromisoTouchStartY = currentY;

    if (panel.scrollHeight > panel.clientHeight) {
        panel.scrollTop += deltaY;
    }
}

function bindCompromisoWheel() {
    if (compromisoWheelBound) return;
    compromisoWheelBound = true;
    document.addEventListener('wheel', handleCompromisoWheel, { passive: false });
    document.addEventListener('touchstart', handleCompromisoTouchStart, { passive: true });
    document.addEventListener('touchmove', handleCompromisoTouchMove, { passive: true });
}

function unbindCompromisoWheel() {
    if (!compromisoWheelBound) return;
    compromisoWheelBound = false;
    document.removeEventListener('wheel', handleCompromisoWheel);
    document.removeEventListener('touchstart', handleCompromisoTouchStart);
    document.removeEventListener('touchmove', handleCompromisoTouchMove);
}

function handleCompromisoWheel(event) {
    const drawer = document.getElementById('compromiso-drawer-overlay');
    if (!drawer || !drawer.classList.contains('active')) return;

    const panel = document.getElementById('compromiso-drawer-panel');
    if (!panel) return;

    const delta = event.deltaY;
    if (panel.scrollHeight > panel.clientHeight) {
        panel.scrollTop += delta;
        event.preventDefault();
    }
}

function openCompromisoDrawer() {
    const drawer = document.getElementById('compromiso-drawer-overlay');
    if (!drawer) return;
    drawer.classList.add('active');
    document.body.style.overflow = 'hidden';
    if (window.lenis) window.lenis.stop();

    const panel = document.getElementById('compromiso-drawer-panel');
    if (panel) panel.scrollTop = 0;
    bindCompromisoWheel();
}

function closeCompromisoDrawer() {
    const drawer = document.getElementById('compromiso-drawer-overlay');
    if (!drawer) return;
    drawer.classList.remove('active');
    document.body.style.overflow = '';
    if (window.lenis) window.lenis.start();
    unbindCompromisoWheel();
}

function closeCompromisoDrawerOnBackdrop(event) {
    if (event.target.id === 'compromiso-drawer-overlay') closeCompromisoDrawer();
}

// Modal Propuestas de Uso (Idea Lab — Galería 3)
const propuestasUbicaciones = {
    'FELIPE VILLANUEVA': ['Gemini_Generated_Image_p5qgngp5qgngp5qg.png', 'Gemini_Generated_Image_xb5426xb5426xb54.png'],
    'HIDALGO': ['portada.jpeg', 'Place_office_furniture_in_room_202608140136.jpeg', 'Place_office_furniture_in_room_202608140136 (1).jpeg', 'Place_small_nail_salon_202608140137.jpeg', 'Gemini_Generated_Image_2xmr5x2xmr5x2xmr.png', 'Gemini_Generated_Image_8hffm68hffm68hff.png', 'Gemini_Generated_Image_j54df0j54df0j54d.png'],
    'PASEO CENTRAL': ['Gemini_Generated_Image_3lnq523lnq523lnq.png', 'Gemini_Generated_Image_vc968vc968vc968v.png'],
    'PINO SUAREZ': ['Gemini_Generated_Image_cvnvsxcvnvsxcvnv.jpeg', 'Gemini_Generated_Image_93s1o893s1o893s1.jpeg', 'Gemini_Generated_Image_diqfiddiqfiddiqf.jpeg', 'Gemini_Generated_Image_q2iqipq2iqipq2iq.jpeg', 'Gemini_Generated_Image_8tjv708tjv708tjv.png'],
    'VILLADA': ['Gemini_Generated_Image_4kfmf04kfmf04kfm.png', 'Gemini_Generated_Image_3qjd683qjd683qjd.png', 'Gemini_Generated_Image_852hny852hny852h.png', 'Gemini_Generated_Image_civu6ncivu6ncivu.png', 'Gemini_Generated_Image_g65ulyg65ulyg65u.png', 'Gemini_Generated_Image_nbrtn2nbrtn2nbrt.png', 'Gemini_Generated_Image_oa2gtooa2gtooa2g.png'],
    'riva palacio': ['PHOTO-2026-05-16-16-46-53.jpg', 'PHOTO-2026-05-16-16-46-53 2.jpg', 'PHOTO-2026-05-16-16-46-53 4.jpg', 'PHOTO-2026-05-16-16-46-53 7.jpg', 'PHOTO-2026-05-16-16-46-53 8.jpg']
};

const propuestasNombresDisplay = {
    'FELIPE VILLANUEVA': 'Felipe Villanueva',
    'HIDALGO': 'Edificio Hidalgo',
    'PASEO CENTRAL': 'Paseo Central',
    'PINO SUAREZ': 'Pino Suárez',
    'VILLADA': 'Villada',
    'riva palacio': 'Riva Palacio'
};

function toTitleCase(str) {
    if (!str) return '';
    return str.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

const propuestasAlias = {
    'villanueva': 'FELIPE VILLANUEVA',
    'hidalgo': 'HIDALGO',
    'paseo central': 'PASEO CENTRAL',
    'pinosuarez': 'PINO SUAREZ',
    'villada': 'VILLADA',
    'riva palacio': 'riva palacio'
};

const ideaLabSlidesData = [
    { key: 'villanueva', title: 'Felipe Villanueva', image: 'galeria 3/villanueva.png' },
    { key: 'hidalgo', title: 'Edificio Hidalgo', image: 'galeria 3/hidalgo.jpeg' },
    { key: 'paseo central', title: 'Paseo Central', image: 'galeria 3/paseo central.jpg' },
    { key: 'pinosuarez', title: 'Pino Suárez', image: 'galeria 3/pinosuarez.jpeg' },
    { key: 'villada', title: 'Villada', image: 'galeria 3/villada.png' },
    { key: 'riva palacio', title: 'Riva Palacio', image: 'galeria 3/riva palacio.jpg' }
];

let currentIdeaLabIndex = 0;

function initIdeaLabGalleryScroll() {
    renderIdeaLabCurrentSlide();
}

function moveIdeaLabSlide(direction) {
    const total = ideaLabSlidesData.length;
    currentIdeaLabIndex = (currentIdeaLabIndex + direction + total) % total;
    renderIdeaLabCurrentSlide();
}

function renderIdeaLabCurrentSlide() {
    const imgEl = document.getElementById('idealab-main-img');
    const captionEl = document.getElementById('idealab-main-caption');
    const counterEl = document.getElementById('idealab-slide-counter');

    const data = ideaLabSlidesData[currentIdeaLabIndex];
    if (!data) return;

    if (imgEl) {
        imgEl.src = data.image;
        imgEl.alt = data.title;
    }
    if (captionEl) {
        captionEl.textContent = data.title;
    }
    if (counterEl) {
        counterEl.textContent = `${currentIdeaLabIndex + 1} / ${ideaLabSlidesData.length}`;
    }
}

function openPropuestasModalFromIdeaLab() {
    const data = ideaLabSlidesData[currentIdeaLabIndex];
    if (data) {
        openPropuestasModal(data.key);
    }
}

// Componente 3D TiltedCard (Inspirado en ReactBits TiltedCard)
// Parámetros: rotateAmplitude = 12 (12deg), scaleOnHover = 1.05, glare reflect, overlay text
function initTiltedCards() {
    const cards = document.querySelectorAll('.tilted-card');
    const rotateAmplitude = 12; // 12 grados de inclinación máxima
    const scaleOnHover = 1.05;   // Escala del 105% al posar el cursor

    cards.forEach(card => {
        const glare = card.querySelector('.tilted-card-glare');
        let isHovered = false;

        card.addEventListener('mouseenter', () => {
            isHovered = true;
            if (glare) glare.style.opacity = '1';
        });

        card.addEventListener('mousemove', (e) => {
            if (!isHovered) return;
            const rect = card.getBoundingClientRect();
            if (!rect.width || !rect.height) return;

            const x = (e.clientX - rect.left) / rect.width;   // 0.0 a 1.0
            const y = (e.clientY - rect.top) / rect.height;  // 0.0 a 1.0

            const rotateX = (0.5 - y) * rotateAmplitude * 2;
            const rotateY = (x - 0.5) * rotateAmplitude * 2;

            card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(${scaleOnHover}, ${scaleOnHover}, ${scaleOnHover})`;

            if (glare) {
                glare.style.background = `radial-gradient(circle at ${x * 100}% ${y * 100}%, rgba(255, 255, 255, 0.45) 0%, transparent 75%)`;
            }
        });

        card.addEventListener('mouseleave', () => {
            isHovered = false;
            card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
            if (glare) glare.style.opacity = '0';
        });

        // Al hacer clic abre las propuestas de uso del espacio
        card.addEventListener('click', () => {
            const img = card.querySelector('img');
            if (img) {
                const fileName = (img.getAttribute('src') || '').split('/').pop().replace(/\.(jpg|jpeg|png|webp)$/i, '');
                openPropuestasModal(fileName);
            }
        });
    });
}

// ============================================================================
// COMPONENTE 3D PHOTO STACK (Inspirado en ReactBits Stack Component)
// Parámetros: randomRotation = false, sensitivity = 200, sendToBackOnClick = true
// ============================================================================
class PhotoStack {
    constructor(containerEl, images, options = {}) {
        this.container = containerEl;
        this.images = images || [];
        this.options = Object.assign({
            sendToBackOnClick: true,
            sensitivity: 200,
            randomRotation: false
        }, options);
        this.currentIndex = 0;
        this.isAnimating = false;
        this.init();
    }

    init() {
        this.container.innerHTML = '';
        if (!this.images.length) return;

        this.cards = [];
        // Renderizar tarjetas en orden inverso para que el índice 0 quede al frente
        for (let i = this.images.length - 1; i >= 0; i--) {
            const card = document.createElement('div');
            card.className = 'stack-card';
            card.dataset.index = i;

            const img = document.createElement('img');
            img.src = this.images[i].src;
            img.alt = this.images[i].alt || `Foto ${i + 1}`;
            img.loading = 'eager';
            card.appendChild(img);

            this.container.appendChild(card);
            this.cards.unshift(card);
        }

        this.updateCardPositions();
        this.bindEvents();
    }

    updateCardPositions() {
        const total = this.cards.length;
        if (!total) return;

        this.cards.forEach((card, i) => {
            const pos = (i - this.currentIndex + total) % total;

            if (pos === 0) {
                // Tarjeta Principal (Frontal)
                card.style.zIndex = total + 10;
                card.style.opacity = '1';
                card.style.transform = 'translate3d(0, 0, 0) scale(1) rotate(0deg)';
                card.style.filter = 'brightness(1)';
                card.style.pointerEvents = 'auto';
            } else if (pos === 1) {
                // Segunda Tarjeta (Detrás 1)
                card.style.zIndex = total + 5;
                card.style.opacity = '0.92';
                card.style.transform = 'translate3d(0, 14px, -30px) scale(0.95) rotate(-1.5deg)';
                card.style.filter = 'brightness(0.92)';
                card.style.pointerEvents = 'none';
            } else if (pos === 2) {
                // Tercera Tarjeta (Detrás 2)
                card.style.zIndex = total + 1;
                card.style.opacity = '0.80';
                card.style.transform = 'translate3d(0, 28px, -60px) scale(0.90) rotate(1.5deg)';
                card.style.filter = 'brightness(0.82)';
                card.style.pointerEvents = 'none';
            } else {
                // Tarjetas al fondo del mazo
                card.style.zIndex = total - pos;
                card.style.opacity = '0';
                card.style.transform = 'translate3d(0, 38px, -90px) scale(0.85) rotate(0deg)';
                card.style.filter = 'brightness(0.7)';
                card.style.pointerEvents = 'none';
            }
        });

        // Actualizar contador
        const counterEl = document.getElementById('propuestas-stack-counter');
        if (counterEl) {
            counterEl.textContent = `${this.currentIndex + 1} / ${total}`;
        }
    }

    sendToBack() {
        if (this.isAnimating || this.cards.length <= 1) return;
        this.isAnimating = true;

        const topCard = this.cards[this.currentIndex];
        topCard.style.transition = 'transform 0.45s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.45s ease';
        topCard.style.transform = 'translate3d(115%, -25px, 40px) rotate(10deg)';
        topCard.style.opacity = '0';

        setTimeout(() => {
            this.currentIndex = (this.currentIndex + 1) % this.cards.length;
            topCard.style.transition = 'none';
            this.updateCardPositions();

            setTimeout(() => {
                this.isAnimating = false;
            }, 100);
        }, 320);
    }

    prevCard() {
        if (this.isAnimating || this.cards.length <= 1) return;
        this.isAnimating = true;

        this.currentIndex = (this.currentIndex - 1 + this.cards.length) % this.cards.length;
        const prevCard = this.cards[this.currentIndex];

        prevCard.style.transition = 'none';
        prevCard.style.transform = 'translate3d(-115%, -25px, 40px) rotate(-10deg)';
        prevCard.style.opacity = '0';
        prevCard.style.zIndex = this.cards.length + 20;

        void prevCard.offsetWidth;

        prevCard.style.transition = 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.45s ease';
        this.updateCardPositions();

        setTimeout(() => {
            this.isAnimating = false;
        }, 350);
    }

    bindEvents() {
        if (this.options.sendToBackOnClick) {
            this.cards.forEach(card => {
                card.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.sendToBack();
                });
            });
        }

        // Gesto Swipe (Touch / Mouse drag)
        let startX = 0;
        let isDragging = false;

        const onStart = (e) => {
            startX = e.touches ? e.touches[0].clientX : e.clientX;
            isDragging = true;
        };

        const onEnd = (e) => {
            if (!isDragging) return;
            isDragging = false;
            const endX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
            const diffX = endX - startX;

            if (Math.abs(diffX) > 40) {
                if (diffX < 0) {
                    this.sendToBack();
                } else {
                    this.prevCard();
                }
            }
        };

        this.container.addEventListener('touchstart', onStart, { passive: true });
        this.container.addEventListener('touchend', onEnd, { passive: true });
    }
}

let activePhotoStack = null;

function openPropuestasModal(locationKey) {
    const overlay = document.getElementById('propuestas-modal-overlay');
    if (!overlay) return;

    const aliasKey = propuestasAlias[String(locationKey || '').toLowerCase()];
    const folderKey = aliasKey || Object.keys(propuestasUbicaciones).find(k => k.toLowerCase() === String(locationKey || '').toLowerCase()) || 'Ubicación';
    const images = propuestasUbicaciones[folderKey] || [];

    const displayTitle = propuestasNombresDisplay[folderKey] || toTitleCase(folderKey);
    document.getElementById('propuestas-modal-title').textContent = displayTitle;

    const wrapper = document.getElementById('stack-wrapper');
    if (wrapper) {
        const imageList = images.map(src => ({
            src: `galeria 3.5/${folderKey}/${src}`,
            alt: `Propuesta de uso en ${displayTitle}`
        }));

        window.activePhotoStack = new PhotoStack(wrapper, imageList, {
            sendToBackOnClick: true,
            sensitivity: 200,
            randomRotation: false
        });
    }

    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    if (window.lenis) window.lenis.stop();
}

function closePropuestasModal() {
    const overlay = document.getElementById('propuestas-modal-overlay');
    if (!overlay) return;
    overlay.classList.remove('active');
    document.body.style.overflow = '';
    if (window.lenis) window.lenis.start();
}

function closePropuestasModalOnBackdrop(event) {
    if (event.target.id === 'propuestas-modal-overlay') closePropuestasModal();
}

function initPropuestasHoverPause() {
    const viewport = document.querySelector('.propuestas-track-viewport');
    if (!viewport) return;
    viewport.addEventListener('mouseenter', () => { propuestasPaused = true; });
    viewport.addEventListener('mouseleave', () => { propuestasPaused = false; });
}

// ============================================================================
// FICHA DETALLADA DEL INMUEBLE (Modal: Desfile de Fotos + Tabla Técnica)
// ============================================================================
// Cada clave corresponde al atributo data-ficha de las tarjetas del catálogo.
const fichasInmuebles = {
    'riva-palacio': {
        titulo: 'Riva Palacio',
        ubicacion: {
            embed: 'https://maps.google.com/maps?q=19.2928195,-99.6557402&z=17&ie=UTF8&iwloc=&output=embed',
            link: 'https://maps.app.goo.gl/VjfTWGnuPBXwjuLr8',
        },
        fotos: [
            'galeria comercial/Riva Palacio/portada tarjeta.png',
            'galeria comercial/Riva Palacio/PHOTO-2026-05-16-16-46-53.jpg',
            'galeria comercial/Riva Palacio/PHOTO-2026-05-16-16-46-53 2.jpg',
            'galeria comercial/Riva Palacio/PHOTO-2026-05-16-16-46-53 3.jpg',
            'galeria comercial/Riva Palacio/PHOTO-2026-05-16-16-46-53 4.jpg',
            'galeria comercial/Riva Palacio/PHOTO-2026-05-16-16-46-53 5.jpg',
            'galeria comercial/Riva Palacio/PHOTO-2026-05-16-16-46-53 6.jpg',
            'galeria comercial/Riva Palacio/PHOTO-2026-05-16-16-46-53 7.jpg',
            'galeria comercial/Riva Palacio/PHOTO-2026-05-16-16-46-53 9.jpg',
            'galeria comercial/Riva Palacio/PHOTO-2026-05-16-16-46-53 10.jpg',
            'galeria comercial/Riva Palacio/PHOTO-2026-05-16-16-46-53 11.jpg',
            'galeria comercial/Riva Palacio/PHOTO-2026-05-16-16-46-53 12.jpg',
        ],
        tabla: [
            { concepto: 'Metros cuadrados', valor: '1,230.12 m² total' },
            { concepto: 'Precio por m²', valor: '$380.00 – $542.00' },
            { concepto: 'Locales disponibles', valor: '11' },
            { concepto: 'Niveles', valor: 'PB y Planta Alta' },
            { concepto: 'Acceso', valor: '24h, discreto' },
        ],
        encabezadosLocales: ['NO. LOCAL', 'INQUILINO / GIRO COMERCIAL', 'SUPERFICIE (m²)', 'PRECIO POR m²', 'NOTAS / ESTATUS'],
        locales: [
            { no: '1 PB', giro: 'Churrería Porfirio', superficie: '82.60', precio: '$423.00', notas: 'Rentado' },
            { no: '2 PB', giro: "Busher's", superficie: '35.00', precio: '$453.85', notas: 'Rentado' },
            { no: '3 PB', giro: 'DISPONIBLE', superficie: '62.79', precio: '$450.00', notas: 'Excelente ubicación (Disponible)' },
            { no: '4 PB', giro: 'AT&T RP', superficie: '60.69', precio: '$542.00', notas: 'Rentado' },
            { no: '5 PB', giro: 'DISPONIBLE', superficie: '58.53', precio: '$450.00', notas: 'Excelente ubicación (Disponible)' },
            { no: '6 PB', giro: 'DISPONIBLE', superficie: '56.49', precio: '$450.00', notas: 'Excelente ubicación (Disponible)' },
            { no: '7 PB', giro: 'DISPONIBLE', superficie: '54.15', precio: '$450.00', notas: 'Excelente ubicación (Disponible)' },
            { no: '8 PB', giro: 'DISPONIBLE', superficie: '179.42', precio: '$450.00', notas: 'Amplio espacio PB (Disponible)' },
            { no: '9 PA', giro: 'DISPONIBLE', superficie: '76.68', precio: '$380.00', notas: 'Planta Alta (Disponible)' },
            { no: '10 PA', giro: 'DISPONIBLE', superficie: '59.64', precio: '$380.00', notas: 'Planta Alta (Disponible)' },
            { no: '11 PA', giro: 'Oficinas Poder legislativo', superficie: '57.90', precio: '$473.70', notas: 'Rentado' },
            { no: '12 PA', giro: 'DISPONIBLE', superficie: '56.34', precio: '$380.00', notas: 'Planta Alta (Disponible)' },
            { no: '13 PA', giro: 'DISPONIBLE', superficie: '54.90', precio: '$380.00', notas: 'Planta Alta (Disponible)' },
            { no: '14 PA', giro: 'DISPONIBLE', superficie: '53.34', precio: '$380.00', notas: 'Planta Alta (Disponible)' },
            { no: '15 PA', giro: 'DISPONIBLE', superficie: '269.85', precio: '$380.00', notas: 'Espacio más amplio PA (Disponible)' },
        ],
        datosGenerales: [
            { concepto: 'Porcentaje de Ocupación', valor: '27%' },
            { concepto: 'Total de Locales', valor: '15' },
            { concepto: 'Locales Disponibles', valor: '11' },
            { concepto: 'Cuota de Mantenimiento', valor: 'Mantenimiento del 15%' },
            { concepto: 'Servicios', valor: 'Servicios independientes' },
            { concepto: 'Marcas Ancla y Actuales', valor: "Churrería Porfirio, Busher's, AT&T RP, Oficinas Poder Legislativo" },
        ],
    },
    'avenida-central': {
        titulo: 'Plaza Independencia',
        fotos: [
            'galeria comercial/Plaza Independencia/portada.jpg',
            'galeria comercial/Plaza Independencia/480666748_1015507253929811_5668436843392464801_n.jpg',
            'galeria comercial/Plaza Independencia/481218425_1015507310596472_3066958348184234791_n.jpg',
            'galeria comercial/Plaza Independencia/whATS.jpeg',
            'galeria comercial/Plaza Independencia/WhatsApp Image 2026-08-12 at 4.04.36 PM.jpeg',
            'galeria comercial/Plaza Independencia/WhatsApp Image 2026-08-12 at 4.04.36 PM (1).jpeg',
            'galeria comercial/Plaza Independencia/WhatsApp Image 2026-08-12 at 4.04.36 PM (2).jpeg',
            'galeria comercial/Plaza Independencia/WhatsApp Image 2026-08-12 at 4.04.37 PM.jpeg',
            'galeria comercial/Plaza Independencia/WhatsApp Image 2026-08-12 at 4.04.37 PM (1).jpeg',
            'galeria comercial/Plaza Independencia/WhatsApp Image 2026-08-12 at 4.04.37 PM (2).jpeg',
            'galeria comercial/Plaza Independencia/WhatsApp Image 2026-08-12 at 4.04.37 PM (3).jpeg',
        ],
        tabla: [
            { concepto: 'Metros cuadrados', valor: '1,017.76 m² total' },
            { concepto: 'Precio por m²', valor: '$78.12 – $340.70' },
            { concepto: 'Locales disponibles', valor: '5' },
        ],
        encabezadosLocales: ['NO. LOCAL', 'INQUILINO / GIRO COMERCIAL', 'SUPERFICIE (m²)', 'PRECIO POR m²', 'ESTATUS'],
        locales: [
            { no: '1, 2', giro: 'La Dueña Vinos y Licores', superficie: '119.34', precio: '$340.70', estatus: 'Rentado' },
            { no: '3', giro: 'La Chillaquileria', superficie: '65.02', precio: '$253.06', estatus: 'Rentado' },
            { no: '4', giro: 'INTERCON', superficie: '65.02', precio: '$324.61', estatus: 'Rentado' },
            { no: '5', giro: 'DISPONIBLE', superficie: '40', precio: '$300.00', estatus: 'Disponible' },
            { no: '6, 7 P.A.', giro: 'Autofinanciamiento Continental', superficie: '119.34', precio: '$254.03', estatus: 'Rentado' },
            { no: '8', giro: 'DISPONIBLE', superficie: '65.02', precio: '$230.76', estatus: 'Disponible' },
            { no: '9', giro: 'DISPONIBLE', superficie: '65.02', precio: '$230.76', estatus: 'Disponible' },
            { no: '10', giro: 'DISPONIBLE', superficie: '64', precio: '$230.76', estatus: 'Disponible' },
            { no: 'OFICINA 1', giro: 'Desarrollar-t', superficie: '160', precio: '$79.93', estatus: 'Rentado' },
            { no: 'OFICINA 2', giro: 'Securitas', superficie: '160', precio: '$87.03', estatus: 'Rentado' },
            { no: 'OFICINA 3', giro: 'DISPONIBLE', superficie: '160', precio: '$78.12', estatus: 'Disponible' },
        ],
        datosGenerales: [
            { concepto: 'Porcentaje de Ocupación', valor: '55%' },
            { concepto: 'Total de Locales', valor: '11' },
            { concepto: 'Locales Disponibles', valor: '5' },
            { concepto: 'Cuota de Mantenimiento', valor: 'Mantenimiento del 10%' },
            { concepto: 'Servicios', valor: 'Servicios independientes.' },
        ],
        ubicacion: {
            embed: 'https://maps.google.com/maps?q=19.2924242,-99.6461373&z=17&ie=UTF8&iwloc=&output=embed',
            link: 'https://maps.app.goo.gl/pKZ3M5AkfUqT7GuP7',
        },
    },
    'sub-level': {
        titulo: 'Paseo Central',
        fotos: [
            'galeria comercial/Paseo Central/Portada.jpg',
            'galeria comercial/Paseo Central/PHOTO-2026-06-02-13-07-29.jpg',
            'galeria comercial/Paseo Central/PHOTO-2026-06-02-13-07-29 2.jpg',
            'galeria comercial/Paseo Central/PHOTO-2026-06-02-13-07-29 3.jpg',
            'galeria comercial/Paseo Central/PHOTO-2026-06-02-13-07-29 4.jpg',
            'galeria comercial/Paseo Central/PHOTO-2026-06-02-14-12-38.jpg',
        ],
        tabla: [
            { concepto: 'Metros cuadrados', valor: '2,324.96 m² total' },
            { concepto: 'Precio por m²', valor: '$380.00 – $450.00' },
            { concepto: 'Locales disponibles', valor: '12' },
        ],
        encabezadosLocales: ['NO. LOCAL', 'INQUILINO / GIRO COMERCIAL', 'SUPERFICIE (m²)', 'PRECIO POR m²', 'NOTAS / ESTATUS'],
        locales: [
            { no: '1 PB', giro: 'House roll', superficie: '61.95', precio: '$450.00', notas: 'Rentado' },
            { no: '2 PB', giro: 'Dolphy helados', superficie: '61.48', precio: '$450.00', notas: 'Rentado' },
            { no: '3 PB', giro: 'Clinica dental By Feliber', superficie: '48.53', precio: '$450.00', notas: 'Rentado' },
            { no: '4 PB', giro: 'Centro cambiario', superficie: '48.72', precio: '$450.00', notas: 'Rentado' },
            { no: '5 PB', giro: 'Gotcha', superficie: '59.44', precio: '$450.00', notas: 'Rentado' },
            { no: '6 PB', giro: 'Eva studio', superficie: '65.24', precio: '$450.00', notas: 'Rentado' },
            { no: '7 PB', giro: 'Cafetería Amore', superficie: '63.18', precio: '$450.00', notas: 'Rentado' },
            { no: '8 PB', giro: 'Eggstasy/Barrel House', superficie: '60.52', precio: '$450.00', notas: 'Rentado' },
            { no: '9 PB', giro: 'Estudio Erre', superficie: '60.52', precio: '$450.00', notas: 'Rentado' },
            { no: '10 PB', giro: 'B clinic', superficie: '60.52', precio: '$450.00', notas: 'Rentado' },
            { no: '11 PB', giro: 'Zalinda', superficie: '60.52', precio: '$450.00', notas: 'Rentado' },
            { no: '12 PB', giro: 'Mieli Canela', superficie: '60.52', precio: '$450.00', notas: 'Rentado' },
            { no: '13 PB', giro: 'Ludoteca', superficie: '60.45', precio: '$450.00', notas: 'Rentado' },
            { no: '14 PB', giro: 'Ludoteca', superficie: '51.87', precio: '$450.00', notas: 'Rentado' },
            { no: '15 PB', giro: 'Tacos Tijuas', superficie: '80.98', precio: '$450.00', notas: 'Rentado' },
            { no: '16 PB', giro: 'D uñas', superficie: '61.72', precio: '$450.00', notas: 'Rentado' },
            { no: '17 PB', giro: 'Saran Beauty', superficie: '62.26', precio: '$450.00', notas: 'Rentado' },
            { no: '18 PB', giro: 'Base Burguer', superficie: '54.58', precio: '$450.00', notas: 'Rentado' },
            { no: '19 PB', giro: 'Galletea Bakery', superficie: '38.79', precio: '$450.00', notas: 'Rentado' },
            { no: '20 PB', giro: 'Oficina Amore', superficie: '40.88', precio: '$450.00', notas: 'Rentado' },
            { no: '21 PA', giro: 'Bar Vizzio', superficie: '61.95', precio: '$380.00', notas: 'Rentado' },
            { no: '22 PA', giro: 'Bar Vizzio', superficie: '61.48', precio: '$380.00', notas: 'Rentado' },
            { no: '23 PA', giro: 'Bar Vizzio', superficie: '48.53', precio: '$380.00', notas: 'Rentado' },
            { no: '24 PA', giro: 'DISPONIBLE', superficie: '48.72', precio: '$380.00', notas: 'Planta Alta (Disponible)' },
            { no: '25 PA', giro: 'Barre studio', superficie: '59.44', precio: '$380.00', notas: 'Rentado' },
            { no: '26 PA', giro: 'DISPONIBLE', superficie: '65.24', precio: '$380.00', notas: 'Planta Alta (Disponible)' },
            { no: '27 PA', giro: 'DISPONIBLE', superficie: '63.88', precio: '$380.00', notas: 'Planta Alta (Disponible)' },
            { no: '28 PA', giro: 'DISPONIBLE', superficie: '60.84', precio: '$380.00', notas: 'Planta Alta (Disponible)' },
            { no: '29 PA', giro: 'DISPONIBLE', superficie: '60.84', precio: '$380.00', notas: 'Planta Alta (Disponible)' },
            { no: '30 PA', giro: 'DISPONIBLE', superficie: '60.84', precio: '$380.00', notas: 'Planta Alta (Disponible)' },
            { no: '31 PA', giro: 'DISPONIBLE', superficie: '60.84', precio: '$380.00', notas: 'Planta Alta (Disponible)' },
            { no: '32 PA', giro: 'Pilates reformer', superficie: '60.84', precio: '$380.00', notas: 'Rentado' },
            { no: '33 PA', giro: 'Pilates reformer', superficie: '65.20', precio: '$380.00', notas: 'Rentado' },
            { no: '34 PA', giro: 'DISPONIBLE', superficie: '53.39', precio: '$380.00', notas: 'Planta Alta (Disponible)' },
            { no: '35 PA', giro: 'Cycling Indoor', superficie: '80.06', precio: '$380.00', notas: 'Rentado' },
            { no: '36 PA', giro: 'Closet Athelier', superficie: '70.87', precio: '$380.00', notas: 'Rentado' },
            { no: '37 PA', giro: 'DISPONIBLE', superficie: '62.26', precio: '$380.00', notas: 'Planta Alta (Disponible)' },
            { no: '38 PA', giro: 'DISPONIBLE', superficie: '54.58', precio: '$380.00', notas: 'Planta Alta (Disponible)' },
            { no: '39 PA', giro: 'DISPONIBLE', superficie: '38.79', precio: '$380.00', notas: 'Planta Alta (Disponible)' },
            { no: '40 PA', giro: 'DISPONIBLE', superficie: '40.88', precio: '$380.00', notas: 'Planta Alta (Disponible)' },
        ],
        datosGenerales: [
            { concepto: 'Porcentaje de Ocupación', valor: '69%' },
            { concepto: 'Total de Locales', valor: '39' },
            { concepto: 'Locales Disponibles', valor: '12' },
            { concepto: 'Cuota de Mantenimiento', valor: 'Mantenimiento del 10%' },
            { concepto: 'Servicios', valor: 'Servicios independientes.' },
        ],
        ubicacion: {
            embed: 'https://maps.google.com/maps?q=19.2604988,-99.5771917&z=17&ie=UTF8&iwloc=&output=embed',
            link: 'https://maps.app.goo.gl/PDCTTs4LSabGGwBL9',
        },
    },
    'distrito-financiero': {
        titulo: 'Pino Suárez',
        fotos: [
            'galeria comercial/Pino Suarez/portada.jpg',
            'galeria comercial/Pino Suarez/PHOTO-2026-06-20-13-43-47.jpg',
            'galeria comercial/Pino Suarez/PHOTO-2026-06-20-13-43-47 2.jpg',
            'galeria comercial/Pino Suarez/PHOTO-2026-06-20-13-43-47 3.jpg',
            'galeria comercial/Pino Suarez/PHOTO-2026-06-20-13-43-47 4.jpg',
            'galeria comercial/Pino Suarez/PHOTO-2026-06-20-13-43-47 5.jpg',
            'galeria comercial/Pino Suarez/PHOTO-2026-06-20-13-43-47 6.jpg',
            'galeria comercial/Pino Suarez/PHOTO-2026-06-20-13-43-47 7.jpg',
            'galeria comercial/Pino Suarez/PHOTO-2026-06-20-13-43-47 8.jpg',
            'galeria comercial/Pino Suarez/PHOTO-2026-06-20-13-43-47 10.jpg',
            'galeria comercial/Pino Suarez/PHOTO-2026-06-20-13-43-47 11.jpg',
        ],
        tabla: [
            { concepto: 'Metros cuadrados', valor: '819.74 m² total' },
            { concepto: 'Precio por m²', valor: '$380.00 – $450.00' },
            { concepto: 'Locales disponibles', valor: '5' },
        ],
        encabezadosLocales: ['NO. LOCAL', 'INQUILINO / GIRO COMERCIAL', 'SUPERFICIE (m²)', 'PRECIO POR m²', 'NOTAS / ESTATUS'],
        locales: [
            { no: '1', giro: 'OXXO PB', superficie: '235.76', precio: '$450.00', notas: 'Rentado' },
            { no: '2', giro: 'Su karne PB', superficie: '90.00', precio: '$450.00', notas: 'Rentado' },
            { no: '3', giro: 'Lumina Caf PB', superficie: '80.00', precio: '$450.00', notas: 'Rentado' },
            { no: '4 PA', giro: 'Dentistas PA', superficie: '60.00', precio: '$380.00', notas: 'Rentado' },
            { no: '5 PA', giro: 'DISPONIBLE', superficie: '65.10', precio: '$400.00', notas: 'Planta Alta (Disponible)' },
            { no: '6 PA', giro: 'DISPONIBLE', superficie: '53.12', precio: '$400.00', notas: 'Planta Alta (Disponible)' },
            { no: '7 PA', giro: 'DISPONIBLE', superficie: '74.66', precio: '$400.00', notas: 'Planta Alta (Disponible)' },
            { no: '8 PA', giro: 'DISPONIBLE', superficie: '79.50', precio: '$400.00', notas: 'Planta Alta (Disponible)' },
            { no: '9 PA', giro: 'DISPONIBLE', superficie: '81.60', precio: '$400.00', notas: 'Planta Alta (Disponible)' },
        ],
        datosGenerales: [
            { concepto: 'Porcentaje de Ocupación', valor: '44%' },
            { concepto: 'Total de Locales', valor: '9' },
            { concepto: 'Locales Disponibles', valor: '5' },
            { concepto: 'Cuota de Mantenimiento', valor: 'Mantenimiento del 10%' },
            { concepto: 'Servicios', valor: 'Servicios independientes.' },
        ],
        ubicacion: {
            embed: 'https://maps.google.com/maps?q=Blvd.%20Pino%20Su%C3%A1rez%20191%2C%20La%20Purisima%2C%2052169%20San%20Jorge%20Pueblo%20Nuevo%2C%20M%C3%A9x.&z=16&ie=UTF8&iwloc=&output=embed',
            link: 'https://share.google/p0vjn7LI2WKcU1CHl',
        },
    },

    'paseo-artes': {
        titulo: 'Edificio Hidalgo',
        fotos: [
            'galeria comercial/Hidalgo/Portada.jpg',
            'galeria comercial/Hidalgo/PHOTO-2022-02-17-15-35-52.jpg',
            'galeria comercial/Hidalgo/PHOTO-2022-02-17-15-35-54.jpg',
            'galeria comercial/Hidalgo/PHOTO-2022-02-17-15-37-02.jpg',
            'galeria comercial/Hidalgo/PHOTO-2025-05-02-16-55-07.jpg',
            'galeria comercial/Hidalgo/PHOTO-2025-05-02-16-55-07 2.jpg',
            'galeria comercial/Hidalgo/PHOTO-2025-05-02-16-55-07 3.jpg',
            'galeria comercial/Hidalgo/PHOTO-2025-05-02-16-55-07 5.jpg',
            'galeria comercial/Hidalgo/PHOTO-2025-05-02-16-55-07 6.jpg',
            'galeria comercial/Hidalgo/PHOTO-2025-05-02-16-55-07 7.jpg',
            'galeria comercial/Hidalgo/PHOTO-2025-05-02-16-55-07 8.jpg',
            'galeria comercial/Hidalgo/PHOTO-2025-05-02-16-55-07 9.jpg',
        ],
        tabla: [
            { concepto: 'Metros cuadrados', valor: '734.76 m² total' },
            { concepto: 'Precio por m²', valor: '$83.07 – $150.90' },
            { concepto: 'Locales disponibles', valor: '2' },
        ],
        encabezadosLocales: ['NO. LOCAL', 'INQUILINO / GIRO COMERCIAL', 'SUPERFICIE (m²)', 'PRECIO POR m²', 'ESTATUS'],
        locales: [
            { no: '1 PB', giro: 'Crudalia los Primos', superficie: '120', precio: '$150.90', estatus: 'Rentado' },
            { no: '2 PB', giro: 'Disponible', superficie: '130', precio: '$130.76', estatus: 'Disponible' },
            { no: '3 PA', giro: 'IMSS Bienestar', superficie: '242.38', precio: '$83.07', estatus: 'Rentado' },
            { no: '4 2do Nivel', giro: 'Disponible', superficie: '242.38', precio: '$83.07', estatus: 'Disponible' },
        ],
        datosGenerales: [
            { concepto: 'Porcentaje de Ocupación', valor: '50%' },
            { concepto: 'Total de Locales', valor: '4' },
            { concepto: 'Locales Disponibles', valor: '2' },
            { concepto: 'Cuota de Mantenimiento', valor: 'No aplica en estos locales.' },
            { concepto: 'Servicios', valor: 'Servicios independientes.' },
            { concepto: 'Agua', valor: 'Cuota fija.' },
        ],
        ubicacion: {
            embed: 'https://maps.google.com/maps?q=19.2901326,-99.648684&z=17&ie=UTF8&iwloc=&output=embed',
            link: 'https://maps.app.goo.gl/Kf5PNUQyApBnmFWH8',
        },
    },
    'felipe-villanueva': {
        titulo: 'Felipe Villanueva',
        fotos: [
            'galeria comercial/Felipe Villanueva/portada.jpg',
            'galeria comercial/Felipe Villanueva/PHOTO-2022-02-17-15-00-08.jpg',
            'galeria comercial/Felipe Villanueva/PHOTO-2022-02-17-15-00-09.jpg',
        ],
        tabla: [
            { concepto: 'Metros cuadrados', valor: '890 m² total' },
            { concepto: 'Precio por m²', valor: '$64.10 – $224.00' },
            { concepto: 'Locales disponibles', valor: '2' },
        ],
        encabezadosLocales: ['NO. LOCAL', 'INQUILINO / GIRO COMERCIAL', 'SUPERFICIE (m²)', 'PRECIO POR m²', 'ESTATUS'],
        locales: [
            { no: '1', giro: 'DISPONIBLE', superficie: '50', precio: '$224.00', estatus: 'Disponible' },
            { no: '2', giro: 'Estética Erick', superficie: '50', precio: '$224.00', estatus: 'Rentado' },
            { no: 'EDIFICIO', giro: 'ON Nutrición', superficie: '390', precio: '$64.10', estatus: 'Rentado' },
            { no: '3', giro: 'DISPONIBLE', superficie: '200', precio: '$150.00', estatus: 'Disponible' },
            { no: '4', giro: 'VLM CONSULTING', superficie: '200', precio: '$69.58', estatus: 'Rentado' },
        ],
        datosGenerales: [
            { concepto: 'Porcentaje de Ocupación', valor: '60%' },
            { concepto: 'Total de Locales', valor: '5' },
            { concepto: 'Locales Disponibles', valor: '2' },
            { concepto: 'Cuota de Mantenimiento', valor: 'No aplica en estos locales.' },
            { concepto: 'Servicios', valor: 'Servicios independientes.' },
            { concepto: 'Agua', valor: 'Cuota proporcional a los metros cuadrados arrendados.' },
        ],
        ubicacion: {
            embed: 'https://maps.google.com/maps?q=19.2741794,-99.6669384&z=17&ie=UTF8&iwloc=&output=embed',
            link: 'https://maps.app.goo.gl/V5sN6x8PoFgWP7yaA',
        },
    },
    'villada': {
        titulo: 'Villada',
        fotos: [
            'galeria comercial/Villada/Portada.jpg',
            'galeria comercial/Villada/PHOTO-2025-03-21-17-56-31 4.jpg',
            'galeria comercial/Villada/PHOTO-2025-03-21-17-56-31 6.jpg',
            'galeria comercial/Villada/PHOTO-2025-03-21-17-56-31 8.jpg',
            'galeria comercial/Villada/PHOTO-2025-03-21-17-56-31 11.jpg',
            'galeria comercial/Villada/PHOTO-2025-03-21-17-56-31 12.jpg',
            'galeria comercial/Villada/PHOTO-2025-03-21-17-56-31 13.jpg',
            'galeria comercial/Villada/PHOTO-2025-03-21-17-56-31 14.jpg',
            'galeria comercial/Villada/PHOTO-2025-03-21-17-56-31 16.jpg',
            'galeria comercial/Villada/PHOTO-2025-03-21-17-56-31 18.jpg',
            'galeria comercial/Villada/PHOTO-2025-03-21-17-56-31 22.jpg',
            'galeria comercial/Villada/PHOTO-2025-03-21-17-56-31 25.jpg',
            'galeria comercial/Villada/PHOTO-2025-03-21-17-56-31 34.jpg',
            'galeria comercial/Villada/PHOTO-2025-03-21-17-56-31 37.jpg',
            'galeria comercial/Villada/PHOTO-2025-03-21-17-56-31 42.jpg',
            'galeria comercial/Villada/PHOTO-2025-03-21-17-56-31 48.jpg',
            'galeria comercial/Villada/PHOTO-2025-03-21-17-56-31 56.jpg',
            'galeria comercial/Villada/PHOTO-2025-03-21-17-56-31 57.jpg',
        ],
        tabla: [
            { concepto: 'Metros cuadrados', valor: '1,000 m² total' },
            { concepto: 'Precio por m²', valor: '$200.00' },
            { concepto: 'Espacios disponibles', valor: '3 (Casas)' },
        ],
        encabezadosLocales: ['Descripción', 'Superficie (m²)', 'Precio por m²', 'Notas'],
        locales: [
            { no: 'Casa 1', superficie: '1000', precio: '$200.00', notas: 'Disponible (Venta/Renta)' },
            { no: 'Casa 2', superficie: '-', precio: '-', notas: 'Disponible' },
            { no: 'Casa 3', superficie: '-', precio: '-', notas: 'Disponible' },
        ],
        notasPie: [
            '*El inmueble consta de tres casas que suman un total de 1000 m2,para renta es necesario rentarlo en su totalidad',
            '**Inmueble disponible para Venta/Renta'
        ],
        datosGenerales: [
            { concepto: 'Porcentaje de Ocupación', valor: '0%' },
            { concepto: 'Total de Espacios', valor: '3 (Casas)' },
            { concepto: 'Espacios Disponibles', valor: '3' },
            { concepto: 'Cuota de Mantenimiento', valor: 'N/A' },
            { concepto: 'Servicios', valor: 'A confirmar' },
        ],
        ubicacion: {
            embed: 'https://maps.google.com/maps?q=19.284043,-99.6563766&z=17&ie=UTF8&iwloc=&output=embed',
            link: 'https://maps.app.goo.gl/8w1Gxck4gDtbMF3f6',
        },
    },
    'solidaridad-torres': {
        titulo: 'Av. Solidaridad Torres',
        fotos: [
            'galeria comercial/Av. Solidaridad Torres/Portada.jpg',
            'galeria comercial/Av. Solidaridad Torres/PHOTO-2022-02-10-12-52-23.jpg',
        ],
        tabla: [
            { concepto: 'Metros cuadrados', valor: 'Consultar por local' },
            { concepto: 'Precio por m²', valor: '$197.20 – $204.55' },
            { concepto: 'Locales disponibles', valor: '1' },
        ],
        encabezadosLocales: ['NO. LOCAL', 'INQUILINO / GIRO COMERCIAL', 'SUPERFICIE (m²)', 'PRECIO POR m²', 'ESTATUS'],
        locales: [
            { no: '1 P.B.', giro: 'Refaccionaria Automotriz', superficie: '78.22', precio: '$197.20', estatus: 'Rentado' },
            { no: '2 P.B.', giro: 'Refaccionaria Automotriz', superficie: '75.55', precio: '$197.20', estatus: 'Rentado' },
            { no: '3 P.A.', giro: 'Networking', superficie: '78.22', precio: '$204.55', estatus: 'Rentado' },
            { no: '4 P.A.', giro: 'Disponible', superficie: '75.55', precio: '$204.55', estatus: 'Disponible' },
        ],
        datosGenerales: [
            { concepto: 'Porcentaje de Ocupación', valor: '75%' },
            { concepto: 'Total de Locales', valor: '4' },
            { concepto: 'Locales Disponibles', valor: '1' },
            { concepto: 'Cuota de Mantenimiento', valor: 'No aplica en estos locales.' },
            { concepto: 'Servicios', valor: 'Servicios independientes.' },
        ],
        ubicacion: {
            embed: 'https://maps.google.com/maps?q=19.2764472,-99.5883504&z=17&ie=UTF8&iwloc=&output=embed',
            link: 'https://maps.app.goo.gl/BSP2bidQwm8uvUuTA',
        },
    },
    'plaza-ceboruco': {
        titulo: 'Plaza Ceboruco',
        fotos: [
            'galeria comercial/Plaza Ceboruco/portada.jpg',
            'galeria comercial/Plaza Ceboruco/images.jpeg',
            'galeria comercial/Plaza Ceboruco/images (1).jpeg',
        ],
        tabla: [
            { concepto: 'Metros cuadrados', valor: 'Consultar por local' },
            { concepto: 'Precio por m²', valor: 'Consultar por local' },
            { concepto: 'Locales disponibles', valor: '0' },
        ],
        encabezadosLocales: ['No. Local', 'Inquilino', 'Superficie (m²)', 'Precio por m²', 'Estatus'],
        locales: [
            { no: '1', giro: 'Quick Training', superficie: '47.5', precio: '$252.07', estatus: 'Rentado' },
            { no: '2', giro: 'Quick Training', superficie: '47.5', precio: '$252.07', estatus: 'Rentado' },
            { no: '3', giro: 'Quick Training', superficie: '47.5', precio: '$252.07', estatus: 'Rentado' },
            { no: '4', giro: 'Quick Training', superficie: '47.5', precio: '$252.07', estatus: 'Rentado' },
            { no: '5', giro: 'Inmobiliaria', superficie: '47.5', precio: '$268.63', estatus: 'Rentado' },
            { no: '6', giro: 'Oficina Administración', superficie: '47.5', precio: '$0.00', estatus: 'Uso Interno' },
            { no: '7', giro: 'Ludoteca', superficie: '47.5', precio: '$210.52', estatus: 'Rentado' },
            { no: '8', giro: 'Ludoteca', superficie: '47.5', precio: '$210.52', estatus: 'Rentado' },
            { no: '9', giro: 'Ludoteca', superficie: '47.5', precio: '$210.52', estatus: 'Rentado' },
            { no: '10', giro: 'Ludoteca', superficie: '47.5', precio: '$210.52', estatus: 'Rentado' },
            { no: '12', giro: 'Independiente', superficie: '49.22', precio: 'N/A', estatus: 'NO ESTA EN RENTA' },
            { no: '13', giro: 'Enigma Rooms', superficie: '194.72', precio: '$121.13', estatus: 'Rentado' },
            { no: '14', giro: 'Enigma Rooms', superficie: '82.96', precio: '$121.13', estatus: 'Rentado' },
            { no: '15', giro: 'Banco Azteca', superficie: '175.2', precio: '$171.04', estatus: 'Rentado' },
            { no: '16', giro: 'MMA Box', superficie: '54.89', precio: '$133.54', estatus: 'Rentado' },
            { no: '17', giro: 'MMA Box', superficie: '53.61', precio: '$133.54', estatus: 'Rentado' },
            { no: '18', giro: 'Tratamientos corporales', superficie: '52.68', precio: '$227.79', estatus: 'Rentado' },
            { no: '19', giro: 'CASH', superficie: '51.4', precio: '$242.21', estatus: 'Rentado' },
            { no: '20', giro: 'Clinica de Especialidades Veterinarias', superficie: '51.2', precio: '$214.84', estatus: 'Rentado' },
            { no: '21', giro: 'Consultorio Dental', superficie: '57.75', precio: '$220.95', estatus: 'Rentado' },
            { no: '22', giro: 'SPA', superficie: '74.85', precio: '$193.65', estatus: 'Rentado' },
            { no: '23', giro: 'Royal Prestige', superficie: '50.2', precio: '$220.00', estatus: 'Rentado' },
            { no: '24', giro: 'AT&T Ceboruco', superficie: '50', precio: '$623.00', estatus: 'Rentado' },
            { no: '25', giro: 'Oh lala! Café', superficie: '90', precio: '$209.81', estatus: 'Rentado' },
            { no: '26', giro: 'Quick Training', superficie: '63', precio: '$252.07', estatus: 'Rentado' },
            { no: '27', giro: 'Quick Training', superficie: '50.9', precio: '$252.07', estatus: 'Rentado' },
            { no: '28', giro: 'Multiusos', superficie: '52.54', precio: '$278.12', estatus: 'Rentado' },
            { no: '29', giro: 'Multiusos', superficie: '52.54', precio: '$278.12', estatus: 'Rentado' },
            { no: '30', giro: 'Lavandería', superficie: '52.54', precio: '$381.69', estatus: 'Rentado' },
            { no: '31', giro: 'Clinica de Especialidades Veterinarias', superficie: '52.54', precio: '$370.00', estatus: 'Rentado' },
            { no: '32', giro: 'Dental Tot', superficie: '52.54', precio: '$351.18', estatus: 'Rentado' },
            { no: '33', giro: 'Panadería Brito', superficie: '52.54', precio: '$232.23', estatus: 'Rentado' },
            { no: '34', giro: 'Panadería Brito', superficie: '76.64', precio: '$232.23', estatus: 'Rentado' },
            { no: '35', giro: 'OXXO', superficie: '195.87', precio: '$201.58', estatus: 'Rentado' },
            { no: '36', giro: 'Auto Lavado', superficie: 'N/D', precio: 'N/D', estatus: 'Rentado' },
            { no: '37', giro: 'Eccelenzza', superficie: '35', precio: '$113.54', estatus: 'Rentado' },
        ],
        datosGenerales: [
            { concepto: 'Porcentaje de Ocupación', valor: '100%' },
            { concepto: 'Total de Locales', valor: '37' },
            { concepto: 'Locales Disponibles', valor: '0' },
            { concepto: 'Cuota de Mantenimiento', valor: 'Mantenimiento del 10%' },
            { concepto: 'Servicios', valor: 'Servicios independientes' },
        ],
        ubicacion: {
            embed: 'https://maps.google.com/maps?q=Plaza+Ceboruco,+C.+Ceboruco+No.+2317,+San+Jorge+Pueblo+Nuevo,+Toluca&z=17&ie=UTF8&iwloc=&output=embed',
            link: 'https://maps.app.goo.gl/9PJWnaDUk2TbnfR38?g_st=iw',
        },
    },
    'av-lerdo': {
        titulo: 'Av. Lerdo',
        fotos: [
            'galeria comercial/Av. Lerdo/portada.jpg',
            'galeria comercial/Av. Lerdo/PHOTO-2022-02-17-15-01-46.jpg',
            'galeria comercial/Av. Lerdo/PHOTO-2022-02-17-15-01-47.jpg',
            'galeria comercial/Av. Lerdo/PHOTO-2022-02-17-15-01-47 2.jpg',
            'galeria comercial/Av. Lerdo/PHOTO-2022-02-17-15-01-48.jpg',
        ],
        tabla: [
            { concepto: 'Metros cuadrados', valor: 'Consultar por local' },
            { concepto: 'Precio por m²', valor: '$169.36 – $213.30' },
            { concepto: 'Locales disponibles', valor: '0' },
        ],
        encabezadosLocales: ['NO. LOCAL', 'INQUILINO / GIRO COMERCIAL', 'SUPERFICIE (m²)', 'PRECIO POR m²', 'ESTATUS'],
        locales: [
            { no: 'Local 1', giro: 'Farmacia Guadalajara Suc 2385', superficie: '330.31', precio: '$169.36', estatus: 'Rentado' },
            { no: 'Local 2', giro: 'La Dueña Vinos y Licores', superficie: '89.13', precio: '$213.30', estatus: 'Rentado' },
            { no: 'Local 3', giro: 'Restaurant Bar', superficie: '85.47', precio: '$173.36', estatus: 'Rentado' },
            { no: 'Local 4', giro: 'Restaurant Bar', superficie: '81.81', precio: '$173.36', estatus: 'Rentado' },
        ],
        datosGenerales: [
            { concepto: 'Porcentaje de Ocupación', valor: '100%' },
            { concepto: 'Total de Locales', valor: '4' },
            { concepto: 'Locales Disponibles', valor: '0' },
            { concepto: 'Cuota de Mantenimiento', valor: 'No aplica en estos locales.' },
            { concepto: 'Servicios', valor: 'Servicios independientes.' },
            { concepto: 'Agua', valor: 'Agua por cuota fija.' },
        ],
        ubicacion: {
            embed: 'https://maps.google.com/maps?q=19.2891636,-99.6750109&z=17&ie=UTF8&iwloc=&output=embed',
            link: 'https://www.google.com/maps/@19.2891636,-99.6750109,3a,75y,315.46h,89.04t/data=!3m7!1e1!3m5!1sEQ7-u32vuokeq5ON-BKU8w!2e0!6shttps:%2F%2Fstreetviewpixels-pa.googleapis.com%2Fv1%2Fthumbnail%3Fcb_client%3Dmaps_sv.tactile%26w%3D900%26h%3D600%26pitch%3D0.9579892092320392%26panoid%3DEQ7-u32vuokeq5ON-BKU8w%26yaw%3D315.45845042167434!7i16384!8i8192?hl=es&entry=ttu&g_ep=EgoyMDI2MDgxMC4wIKXMDSoASAFQAw%3D%3D',
        },
    },
    'benito-juarez': {
        titulo: 'Benito Juárez',
        fotos: [
            'galeria comercial/Benito Juarez/portada.jpg',
            'galeria comercial/Benito Juarez/PHOTO-2021-07-12-15-32-50.jpg',
            'galeria comercial/Benito Juarez/PHOTO-2021-07-12-15-32-51.jpg',
            'galeria comercial/Benito Juarez/PHOTO-2021-07-12-15-32-51 2.jpg',
            'galeria comercial/Benito Juarez/PHOTO-2021-07-12-15-32-52.jpg',
            'galeria comercial/Benito Juarez/PHOTO-2021-07-12-15-32-52 2.jpg',
            'galeria comercial/Benito Juarez/PHOTO-2021-07-12-15-32-53.jpg',
            'galeria comercial/Benito Juarez/PHOTO-2021-07-12-15-32-54.jpg',
            'galeria comercial/Benito Juarez/PHOTO-2026-05-08-11-07-26.jpg',
            'galeria comercial/Benito Juarez/PHOTO-2026-05-08-20-39-06.jpg',
            'galeria comercial/Benito Juarez/PHOTO-2026-05-08-20-39-06 3.jpg',
        ],
        tabla: [
            { concepto: 'Metros cuadrados', valor: '320 m² total' },
            { concepto: 'Precio por m²', valor: '$120.90 – $210.00' },
            { concepto: 'Locales disponibles', valor: '0' },
        ],
        encabezadosLocales: ['NO. LOCAL', 'INQUILINO / GIRO COMERCIAL', 'SUPERFICIE (m²)', 'PRECIO POR m²', 'ESTATUS'],
        locales: [
            { no: '1', giro: 'Magic', superficie: '270', precio: '$120.90', estatus: 'Rentado' },
            { no: '2', giro: 'SPA', superficie: '50', precio: '$210.00', estatus: 'Rentado' },
        ],
        datosGenerales: [
            { concepto: 'Porcentaje de Ocupación', valor: '100%' },
            { concepto: 'Total de Locales', valor: '2' },
            { concepto: 'Locales Disponibles', valor: '0' },
            { concepto: 'Cuota de Mantenimiento', valor: 'No aplica en estos locales.' },
            { concepto: 'Servicios', valor: 'Servicios independientes.' },
            { concepto: 'Agua', valor: 'Cuota proporcional.' },
        ],
        ubicacion: {
            embed: 'https://maps.google.com/maps?q=19.2803675,-99.6564654&z=17&ie=UTF8&iwloc=&output=embed',
            link: 'https://maps.app.goo.gl/pmdogp2UFdozHDNz8',
        },
    },
    'brigida-garcia': {
        titulo: 'Brígida García',
        fotos: [
            'galeria/unniplaza.jpg',
            'galeria comercial/Riva Palacio/portada tarjeta.png',
        ],
        tabla: [
            { concepto: 'Metros cuadrados', valor: '161.28 m² total' },
            { concepto: 'Precio por m²', valor: '$200.00 – $443.00' },
            { concepto: 'Locales disponibles', valor: '0' },
        ],
        encabezadosLocales: ['NO. LOCAL', 'INQUILINO / GIRO COMERCIAL', 'SUPERFICIE (m²)', 'PRECIO POR m²', 'ESTATUS'],
        locales: [
            { no: '1', giro: 'Farmacia Similares', superficie: '81.66', precio: '$443.00', estatus: 'Rentado' },
            { no: '2', giro: 'CARFAGO', superficie: '79.62', precio: '$200.00', estatus: 'Rentado' },
        ],
        datosGenerales: [
            { concepto: 'Porcentaje de Ocupación', valor: '100%' },
            { concepto: 'Total de Locales', valor: '2' },
            { concepto: 'Locales Disponibles', valor: '0' },
            { concepto: 'Cuota de Mantenimiento', valor: 'No aplica en estos locales.' },
            { concepto: 'Servicios', valor: 'Servicios independientes.' },
            { concepto: 'Agua', valor: 'Cuota proporcional.' },
        ],
        ubicacion: {
            embed: 'https://maps.google.com/maps?q=19.2697308,-99.640952&z=17&ie=UTF8&iwloc=&output=embed',
            link: 'https://maps.app.goo.gl/V62wxoPD8bd9NuWX8',
        },
    },
    'plaza-rancho-el-meson-ii': {
        titulo: 'Plaza Rancho El Mesón II',
        fotos: [
            'galeria comercial/Plaza rancho el meson II/portada.jpg',
            'galeria comercial/Plaza rancho el meson II/PHOTO-2026-07-09-15-28-43 2.jpg',
            'galeria comercial/Plaza rancho el meson II/PHOTO-2026-07-09-15-28-43 3.jpg',
            'galeria comercial/Plaza rancho el meson II/PHOTO-2026-07-09-15-28-43 4.jpg',
            'galeria comercial/Plaza rancho el meson II/PHOTO-2026-07-09-15-28-43 5.jpg',
            'galeria comercial/Plaza rancho el meson II/PHOTO-2026-07-09-15-28-43 6.jpg',
            'galeria comercial/Plaza rancho el meson II/PHOTO-2026-07-09-15-28-43 7.jpg',
        ],
        tabla: [
            { concepto: 'Metros cuadrados', valor: 'Consultar por local' },
            { concepto: 'Precio por m²', valor: '$177.22 – $693.00' },
            { concepto: 'Locales disponibles', valor: '0' },
        ],
        encabezadosLocales: ['NO. LOCAL', 'INQUILINO / GIRO COMERCIAL', 'SUPERFICIE (m²)', 'PRECIO POR m²', 'ESTATUS'],
        locales: [
            { no: 'A', giro: 'Kayla', superficie: '82.55', precio: '$413.02', estatus: 'Rentado' },
            { no: 'B', giro: 'Antojera', superficie: '82.55', precio: '$277.71', estatus: 'Rentado' },
            { no: 'C', giro: 'Servicios Medicos Amanta', superficie: '82.55', precio: '$445.37', estatus: 'Rentado' },
            { no: 'D', giro: 'Salón de belleza', superficie: '82.55', precio: '$480.99', estatus: 'Rentado' },
            { no: 'E', giro: 'OLEA-G', superficie: '85.2', precio: '$418.25', estatus: 'Rentado' },
            { no: 'F', giro: 'Rosa de Sarn', superficie: '82', precio: '$318.80', estatus: 'Rentado' },
            { no: 'G', giro: 'La Central', superficie: '82', precio: '$429.75', estatus: 'Rentado' },
            { no: 'H', giro: 'Academia Sastre Manantial', superficie: '82', precio: '$429.03', estatus: 'Rentado' },
            { no: 'I', giro: 'Comex', superficie: '85.2', precio: '$351.28', estatus: 'Rentado' },
            { no: 'J', giro: 'Restaurante Bistro by Jaime Mena', superficie: '82', precio: '$254.71', estatus: 'Rentado' },
            { no: 'K', giro: 'Restaurante Bistro by Jaime Mena', superficie: '82', precio: '$254.71', estatus: 'Rentado' },
            { no: 'L', giro: 'Clinica Dental LEIA', superficie: '64.04', precio: '$693.00', estatus: 'Rentado' },
            { no: 'M', giro: 'Farmacia Guadalajara', superficie: '338.5', precio: '$177.22', estatus: 'Rentado' },
        ],
        datosGenerales: [
            { concepto: 'Porcentaje de Ocupación', valor: '100%' },
            { concepto: 'Total de Locales', valor: '13' },
            { concepto: 'Locales Disponibles', valor: '0' },
            { concepto: 'Cuota de Mantenimiento', valor: 'Mantenimiento del 15%' },
            { concepto: 'Servicios', valor: 'Servicios independientes.' },
        ],
        ubicacion: {
            embed: 'https://maps.google.com/maps?q=Av.+Calimaya+Plaza+Comercial+El+Meson+2+Calimaya&z=17&ie=UTF8&iwloc=&output=embed',
            link: 'https://maps.app.goo.gl/THzrzkqntGPwdr94A?g_st=iw',
        },
    },
    'unni-plaza': {
        titulo: 'Unni Plaza',
        fotos: [
            'galeria comercial/Unni Plaza/portada.jpg',
            'galeria comercial/Unni Plaza/PHOTO-2022-04-04-17-12-59.jpg',
            'galeria/unniplaza.jpg',
        ],
        tabla: [
            { concepto: 'Metros cuadrados', valor: '2,066.32 m² total' },
            { concepto: 'Precio por m²', valor: '$30.23 – $337.44' },
            { concepto: 'Locales disponibles', valor: '0' },
        ],
        encabezadosLocales: ['No. Local', 'Inquilino', 'Superficie (m²)', 'Precio por m²', 'Estatus'],
        locales: [
            { no: '1 PB', giro: 'Karcher', superficie: '105.7', precio: '$337.44', estatus: 'Rentado' },
            { no: '2 PB', giro: 'Farmacia Guadalajara suc 2033', superficie: '100', precio: '$256.98', estatus: 'Rentado' },
            { no: '3 PB', giro: 'Farmacia Guadalajara suc 2033', superficie: '100', precio: '$256.98', estatus: 'Rentado' },
            { no: '4 PB', giro: 'Farmacia Guadalajara suc 2033', superficie: '100', precio: '$256.98', estatus: 'Rentado' },
            { no: '5 N1', giro: 'Universidad UEEM', superficie: '236.05', precio: '$108.29', estatus: 'Rentado' },
            { no: 'N2', giro: 'Universidad UEEM', superficie: '554.4', precio: '$108.29', estatus: 'Rentado' },
            { no: '6 Y 9 N1', giro: 'SUMO Buffet', superficie: '215.64', precio: '$317.59', estatus: 'Rentado' },
            { no: '7 N1', giro: 'PAULASH/STUDIO', superficie: '48.24', precio: '$288.90', estatus: 'Rentado' },
            { no: '8 N1', giro: 'El sabor del mar', superficie: '46.29', precio: '$313.24', estatus: 'Rentado' },
            { no: 'Sótano Estac.', giro: 'Unni Garage', superficie: '560', precio: '$30.23', estatus: 'Rentado' },
        ],
        datosGenerales: [
            { concepto: 'Porcentaje de Ocupación', valor: '100%' },
            { concepto: 'Total de Locales', valor: '10' },
            { concepto: 'Locales Disponibles', valor: '0' },
            { concepto: 'Cuota de Mantenimiento', valor: 'Mantenimiento del 10%' },
            { concepto: 'Servicios', valor: 'Servicios independientes' },
        ],
        ubicacion: {
            embed: 'https://maps.google.com/maps?q=19.2883287,-99.6399426&z=17&ie=UTF8&iwloc=&output=embed',
            link: 'https://maps.app.goo.gl/T5gHbpbgCHFEaaLX7',
        },
    },
    'venustiano-carranza': {
        titulo: 'Venustiano Carranza',
        fotos: [
            'galeria/unniplaza.jpg',
            'galeria comercial/Riva Palacio/portada tarjeta.png',
        ],
        tabla: [
            { concepto: 'Metros cuadrados', valor: '660 m² total' },
            { concepto: 'Precio por m²', valor: '$168.72 – $194.70' },
            { concepto: 'Locales disponibles', valor: '0' },
        ],
        encabezadosLocales: ['No. Local', 'Inquilino', 'Superficie (m²)', 'Precio por m²', 'Estatus'],
        locales: [
            { no: '1', giro: 'SexShop', superficie: '110', precio: '$175.00', estatus: 'Rentado' },
            { no: '2', giro: 'Llantera', superficie: '110', precio: '$168.72', estatus: 'Rentado' },
            { no: '3', giro: 'La Dueña Vinos y Licores', superficie: '110', precio: '$168.72', estatus: 'Rentado' },
            { no: '4, 5, 2006', giro: 'Mambo café', superficie: '330', precio: '$194.70', estatus: 'Rentado' },
        ],
        datosGenerales: [
            { concepto: 'Porcentaje de Ocupación', valor: '100%' },
            { concepto: 'Total de Locales', valor: '6' },
            { concepto: 'Locales Disponibles', valor: '0' },
            { concepto: 'Cuota de Mantenimiento', valor: 'No aplica en estos locales.' },
            { concepto: 'Servicios', valor: 'Servicios independientes.' },
            { concepto: 'Agua', valor: 'Cuota proporcional.' },
        ],
        ubicacion: {
            embed: 'https://maps.google.com/maps?q=Calle+Gral.+Venustiano+Carranza+20+Pte+Toluca&z=17&ie=UTF8&iwloc=&output=embed',
            link: 'https://maps.app.goo.gl/Zfq76o8JoJtTrVr88?g_st=iw',
        },
    },
    'wenceslao-labra': {
        titulo: 'Wenceslao Labra',
        fotos: [
            'galeria/unniplaza.jpg',
            'galeria comercial/Riva Palacio/portada tarjeta.png',
        ],
        tabla: [
            { concepto: 'Metros cuadrados', valor: '885.37 m² total' },
            { concepto: 'Precio por m²', valor: '$47.61 – $148.20' },
            { concepto: 'Locales disponibles', valor: '0' },
        ],
        encabezadosLocales: ['No. Local', 'Inquilino', 'Superficie (m²)', 'Precio por m²', 'Estatus'],
        locales: [
            { no: '1', giro: 'Refaccionaria Diesel', superficie: '88.59', precio: '$148.20', estatus: 'Rentado' },
            { no: '2', giro: 'Refaccionaria Diesel', superficie: '88.59', precio: '$148.20', estatus: 'Rentado' },
            { no: '3', giro: 'OXXO', superficie: '288.19', precio: '$135.45', estatus: 'Rentado' },
            { no: '4', giro: 'Check point', superficie: '420', precio: '$47.61', estatus: 'Rentado' },
        ],
        datosGenerales: [
            { concepto: 'Porcentaje de Ocupación', valor: '100%' },
            { concepto: 'Total de Locales', valor: '4' },
            { concepto: 'Locales Disponibles', valor: '0' },
            { concepto: 'Cuota de Mantenimiento', valor: 'No aplica en estos locales.' },
            { concepto: 'Servicios', valor: 'Servicios independientes.' },
            { concepto: 'Agua', valor: 'Cuota proporcional.' },
        ],
        ubicacion: {
            embed: 'https://maps.google.com/maps?q=19.27267,-99.6394822&z=17&ie=UTF8&iwloc=&output=embed',
            link: 'https://www.google.com/maps/place/OXXO+WENCESLAO+LABRA/@19.27267,-99.6394822,3a,75y,290.72h,90t/data=!3m8!1e1!3m5!1sUFNipTqNqL1t-65qQbcnQQ!2e0!6shttps:%2F%2Fstreetviewpixels-pa.googleapis.com%2Fv1%2Fthumbnail%3Fcb_client%3Dmaps_sv.tactile%26w%3D900%26h%3D600%26pitch%3D0%26panoid%3DUFNipTqNqL1t-65qQbcnQQ%26yaw%3D290.71848!7i16384!8i8192!5s0x85cd89841c162231:0xb2e0a4202deed12b!4m14!1m7!3m6!1s0x85cd8986a7089a77:0xc5240244557bf8f9!2sOXXO+WENCESLAO+LABRA!8m2!3d19.2727933!4d-99.6398654!16s%2Fg%2F11g8p90_tf!3m5!1s0x85cd8986a7089a77:0xc5240244557bf8f9!8m2!3d19.2727933!4d-99.6398654!16s%2Fg%2F11g8p90_tf?hl=es&entry=ttu&g_ep=EgoyMDI2MDgxMC4wIKXMDSoASAFQAw%3D%3D',
        },
    },
};

let fichaRAF = null;
let fichaOffset = 0;

function openFichaModal(el) {
    const overlay = document.getElementById('ficha-modal-overlay');
    if (!overlay) return;

    let key = null;
    let card = null;

    if (typeof el === 'string') {
        key = el;
        card = document.querySelector(`.catalog-item[data-ficha="${key}"]`);
    } else if (el && el.target) {
        card = el.target.closest('.catalog-item');
    } else if (el && typeof el.closest === 'function') {
        card = el.closest('.catalog-item');
    }

    if (!key && card) {
        key = card.getAttribute('data-ficha');
    }

    let ficha = key ? fichasInmuebles[key] : null;
    if (!ficha) {
        ficha = fichasInmuebles['felipe-villanueva'];
    }
    const cardTitle = card ? (card.querySelector('h3') ? card.querySelector('h3').textContent.trim() : null) : null;
    document.getElementById('ficha-modal-title').textContent = (ficha && ficha.titulo) ? ficha.titulo : (cardTitle || 'Inmueble');

    // Tabla técnica: si hay locales, muestra el detalle por local;
    // en caso contrario, muestra la estructura con fila en blanco.
    const table = document.getElementById('ficha-table');
    if (ficha && ficha.locales && ficha.locales.length) {
        const headers = ficha.encabezadosLocales || ['No. Local', 'Superficie (m²)', 'Precio por m²', 'Notas'];
        const header = `<thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>`;
        const rows = ficha.locales.map(l => {
            if (ficha.encabezadosLocales && ficha.encabezadosLocales.length === 5) {
                return `<tr><td>${l.no}</td><td>${l.giro || l.inquilino || ''}</td><td>${l.superficie}</td><td>${l.precio}</td><td>${l.estatus || l.notas || ''}</td></tr>`;
            }
            if (ficha.encabezadosLocales && ficha.encabezadosLocales.length === 3) {
                return `<tr><td>${l.no}</td><td>${l.superficie}</td><td>${l.precio}</td></tr>`;
            }
            if (l.descripcion !== undefined) {
                return `<tr><td>${l.no}</td><td>${l.descripcion}</td><td>${l.superficie}</td><td>${l.precio}</td></tr>`;
            }
            return `<tr><td>${l.no}</td><td>${l.superficie}</td><td>${l.precio}</td><td>${l.notas || ''}</td></tr>`;
        }).join('');
        const footnoteRows = (ficha.notasPie && ficha.notasPie.length)
            ? ficha.notasPie.map(note => `<tr><td colspan="${headers.length}" style="font-size:0.75rem; color:#555; font-style:italic; border-top: 1px dashed #ccc; padding: 0.6rem 0.5rem 0.3rem 0.5rem; line-height: 1.4; text-align: left;">${note}</td></tr>`).join('')
            : '';
        table.innerHTML = header + `<tbody>${rows}${footnoteRows}</tbody>`;
    } else {
        table.innerHTML = '<thead><tr><th>No. Local</th><th>Superficie (m²)</th><th>Precio por m²</th><th>Notas</th></tr></thead><tbody><tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr></tbody>';
    }

    // Tabla Datos Generales
    const generalTable = document.getElementById('ficha-general-table');
    const generalTitle = document.getElementById('ficha-general-title');
    generalTitle.style.display = '';
    if (ficha && ficha.datosGenerales && ficha.datosGenerales.length) {
        const header = '<thead><tr><th>Concepto</th><th>Valor</th></tr></thead>';
        const rows = ficha.datosGenerales.map(r => `<tr><td>${r.concepto}</td><td>${r.valor}</td></tr>`).join('');
        generalTable.innerHTML = header + `<tbody>${rows}</tbody>`;
    } else {
        generalTable.innerHTML = '<thead><tr><th>Concepto</th><th>Valor</th></tr></thead><tbody><tr><td>&nbsp;</td><td>&nbsp;</td></tr></tbody>';
    }

    // Ubicación
    const ubicacionTitle = document.getElementById('ficha-ubicacion-title');
    const ubicacionBox = document.getElementById('ficha-ubicacion');
    if (ficha && ficha.ubicacion) {
        ubicacionTitle.style.display = '';
        ubicacionBox.style.display = '';
        const iframe = ubicacionBox.querySelector('iframe');
        const link = ubicacionBox.querySelector('.ficha-ubicacion-link');
        
        let embedUrl = ficha.ubicacion.embed;
        if (ficha.ubicacion.link && ficha.ubicacion.link.includes('@')) {
            const match = ficha.ubicacion.link.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
            if (match) {
                embedUrl = `https://maps.google.com/maps?q=${match[1]},${match[2]}&z=17&ie=UTF8&iwloc=&output=embed`;
            }
        }
        
        if (iframe) iframe.src = embedUrl;
        if (link) link.href = ficha.ubicacion.link;
    } else {
        ubicacionTitle.style.display = 'none';
        ubicacionBox.style.display = 'none';
    }

    // Desfile de fotos
    const track = document.getElementById('ficha-photos-track');
    track.innerHTML = '';
    if (fichaRAF) { cancelAnimationFrame(fichaRAF); fichaRAF = null; }
    fichaOffset = 0;

    if (ficha && ficha.fotos.length) {
        const build = () => ficha.fotos.map(src => {
            const item = document.createElement('div');
            item.className = 'ficha-photo';
            const img = document.createElement('img');
            img.src = encodeURI(src);
            img.alt = ficha.titulo;
            img.loading = 'eager';
            item.appendChild(img);
            return item;
        });
        build().forEach(el => track.appendChild(el));
        build().forEach(el => track.appendChild(el));
        build().forEach(el => track.appendChild(el)); // 3 copias para loop infinito garantizado
    } else {
        const empty = document.createElement('div');
        empty.className = 'ficha-photo';
        empty.style.cssText = 'display:flex;align-items:center;justify-content:center;padding:1rem;';
        empty.textContent = 'Fotos próximamente.';
        track.appendChild(empty);
    }

    // Siempre abrir mostrando el inicio de la ficha (Datos del espacio),
    // sin conservar el scroll de la vista anterior.
    const tech = document.querySelector('.ficha-modal .ficha-tech');
    if (tech) tech.scrollTop = 0;

    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    if (window.lenis) window.lenis.stop();
    bindFichaWheel();

    setTimeout(startFichaScroll, 60);
}

// El scroll interno del modal (tabla técnica) se controla manualmente,
// porque Lenis intercepta los eventos wheel y touch a nivel de documento.
let fichaWheelBound = false;
let fichaTouchStartY = 0;

function handleFichaTouchStart(e) {
    if (e.touches && e.touches.length > 0) {
        fichaTouchStartY = e.touches[0].clientY;
    }
}

function handleFichaTouchMove(e) {
    const overlay = document.getElementById('ficha-modal-overlay');
    if (!overlay || !overlay.classList.contains('active')) return;

    const tech = document.querySelector('.ficha-modal .ficha-tech');
    if (!tech || !e.touches || e.touches.length === 0) return;

    const currentY = e.touches[0].clientY;
    const deltaY = fichaTouchStartY - currentY;
    fichaTouchStartY = currentY;

    if (tech.scrollHeight > tech.clientHeight) {
        tech.scrollTop += deltaY;
    }
}

function bindFichaWheel() {
    if (fichaWheelBound) return;
    fichaWheelBound = true;
    document.addEventListener('wheel', handleFichaWheel, { passive: false });
    document.addEventListener('touchstart', handleFichaTouchStart, { passive: true });
    document.addEventListener('touchmove', handleFichaTouchMove, { passive: true });
}

function unbindFichaWheel() {
    if (!fichaWheelBound) return;
    fichaWheelBound = false;
    document.removeEventListener('wheel', handleFichaWheel);
    document.removeEventListener('touchstart', handleFichaTouchStart);
    document.removeEventListener('touchmove', handleFichaTouchMove);
}

function handleFichaWheel(event) {
    const overlay = document.getElementById('ficha-modal-overlay');
    if (!overlay || !overlay.classList.contains('active')) return;

    const tech = document.querySelector('.ficha-modal .ficha-tech');
    if (!tech) return;

    const delta = event.deltaY;
    if (tech.scrollHeight > tech.clientHeight) {
        tech.scrollTop += delta;
        event.preventDefault();
    }
}

function startFichaScroll() {
    const track = document.getElementById('ficha-photos-track');
    const viewport = document.getElementById('ficha-photos-viewport');
    if (!track || !viewport) return;
    if (fichaRAF) { cancelAnimationFrame(fichaRAF); fichaRAF = null; }

    const singleSetWidth = track.scrollWidth / 3;
    if (singleSetWidth <= 0) {
        fichaRAF = requestAnimationFrame(startFichaScroll);
        return;
    }

    function step() {
        fichaOffset += 1.8;
        if (fichaOffset >= singleSetWidth) {
            fichaOffset = 0;
        }
        track.style.transform = `translate3d(${-fichaOffset}px, 0px, 0px)`;
        fichaRAF = requestAnimationFrame(step);
    }
    fichaRAF = requestAnimationFrame(step);
}

function closeFichaModal() {
    const overlay = document.getElementById('ficha-modal-overlay');
    if (!overlay) return;
    overlay.classList.remove('active');
    document.body.style.overflow = '';
    if (window.lenis) window.lenis.start();
    unbindFichaWheel();
    if (fichaRAF) { cancelAnimationFrame(fichaRAF); fichaRAF = null; }
}

function closeFichaModalOnBackdrop(event) {
    if (event.target.id === 'ficha-modal-overlay') closeFichaModal();
}

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        closeMatchDrawer();
        closePhilosophyDrawer();
        closeCompromisoDrawer();
        closePropuestasModal();
        closeFichaModal();
    }
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
        btn.style.background = '#2b6954';
        btn.style.color = '#FFFFFF';
        setTimeout(() => {
            closeMatchDrawer();
            btn.textContent = original;
            btn.disabled = false;
            btn.style.background = '#eae6d8';
            btn.style.color = '#064E3B';
            document.getElementById('vm-drawer-form').reset();
        }, 1200);
    }, 800);
}

// Navegación del menú superior hacia hitos de la línea de tiempo (expresados en vh)
function scrollToTimelineSection(event, vh) {
    if (event) event.preventDefault();
    const target = vh * window.innerHeight;
    const lenis = window.lenis;
    suppressSnapTemporarily();
    if (lenis) {
        lenis.scrollTo(target, {
            duration: 2.2,
            easing: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
        });
    } else {
        window.scrollTo({ top: target, behavior: 'smooth' });
    }
}

// Suprime los snaps magnéticos durante la duración de una navegación por clic,
// para que no bloqueen el avance hacia la siguiente sección. Una vez llegado,
// los snaps vuelven a actuar de forma normal sobre la sección visible.
function suppressSnapTemporarily() {
    window.__suppressSnapUntil = Date.now() + 2600;
}

// Navegación inteligente suave y fluida entre secciones con el botón flotante global
function scrollToNextSection() {
    const vh = window.innerHeight;
    const scrollY = window.scrollY || window.pageYOffset;

    // Lista ordenada de los puntos clave de scroll en la línea de tiempo de cortinas
    const targets = [
        1.0 * vh,   // Sección 2 (El Diferenciador Absoluto)
        5.5 * vh,   // Sección 3 (Casos de Éxito)
        10.2 * vh,  // Sección 4 (Galería Comercial)
        10.7 * vh,  // Sección 5 (Transición de Imagen)
        12.2 * vh,  // Sección 6 (Catálogo — El Match)
        14.35 * vh, // Sección 7 (Pilar de Integridad)
        17.5 * vh,  // Sección 8 (Idea Lab)
        21.2 * vh,  // Sección 9 (ValorMáximoART + Footer)
        0           // Volver al Inicio (Hero)
    ];

    // Encontrar el siguiente hito de navegación con un margen de tolerancia de 30px
    let nextTarget = targets.find(t => t > scrollY + 30);
    if (nextTarget === undefined) {
        nextTarget = 0; // Si estamos en la última sección, vuelve al inicio
    }

    const lenis = window.lenis;
    suppressSnapTemporarily();
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

    const stops = [hexToVec3('#2b6954'), hexToVec3('#6d6e68'), hexToVec3('#6a6a6a')];
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

    window.startDrawerLinesAnimation = function () {
        if (!isDrawerLinesAnimating) {
            isDrawerLinesAnimating = true;
            clock.start();
            animate();
        }
    };

    window.stopDrawerLinesAnimation = function () {
        isDrawerLinesAnimating = false;
        if (drawerAnimId) cancelAnimationFrame(drawerAnimId);
    };
}
