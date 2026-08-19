document.addEventListener('DOMContentLoaded', () => {
    // Cada inicializador corre aislado: si uno lanza una excepción (p. ej. sin WebGL),
    // los demás deben continuar funcionando.
    const safeInit = (fn) => {
        try {
            fn();
        } catch (err) {
            if (window.console && console.error) console.error('[vm] init falló:', fn.name, err);
        }
    };

    safeInit(initPreloader);
    safeInit(initLenis);
    if (window.innerWidth > 768) {
        safeInit(initCurtainEdgeProximitySnap);
    }
    safeInit(initScrollNavbar);
    safeInit(initLogoSwap);
    safeInit(initCurtainReveals);
    safeInit(initHorizontalCurtainReveals);
    safeInit(initRevealObserver);
    safeInit(initHeroVideoObserver);
    safeInit(initSilkBackground);
    safeInit(initIsoSilk);
    safeInit(initGaleriaCurtain);
    safeInit(initTransitionCurtain);
    safeInit(initMatchCatalogCurtain);
    safeInit(initIntegrityCurtain);
    safeInit(initIdeaLabCurtain);
    safeInit(initVmartCurtain);
    safeInit(initPortfolioVideoObserver);
    safeInit(initGaleriaVideoObserver);
    safeInit(initImageTrail);
    safeInit(initDrawerFloatingLines);
    safeInit(initIdeaLabGalleryScroll);
});

// 0. Lenis — Smooth scroll con inercia (Escritorio) y Scroll Táctil Nativo a 120Hz Ultra Fluido (Móvil)
function initLenis() {
    if (typeof Lenis === 'undefined') return;
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
        // En móvil, deshabilitamos Lenis para permitir el scroll táctil 100% nativo de iOS/Android.
        // Esto elimina por completo los saltos y tirones al cambiar de dirección o dar reversa.
        window.lenis = null;
        return;
    }
    const lenis = new Lenis({
        duration: 1.2,
        easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: 'vertical',
        smoothWheel: true,
        smoothTouch: false,
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

// 0a. Snap Magnético Inteligente por Proximidad de Borde de Cortina (<= 150px de cualquier borde en Desktop)
function initCurtainEdgeProximitySnap() {
    if (window.innerWidth <= 768) return;
    const lenis = window.lenis;
    const wrapper = document.querySelector('.curtain-wrapper');
    if (!lenis || !wrapper) return;

    function isDrawerActive() {
        const drawer = document.getElementById('vm-drawer-overlay');
        return drawer && drawer.classList.contains('active');
    }

    let isSnapping = false;
    let snapTimer = null;
    let releaseTimer = null;

    // Relación de todas las transiciones de cortina en Desktop y su orientación geométrica
    const transitions = [
        // 01. Sección 2 (#esencia) - Cortina Vertical
        { name: 'esencia', type: 'vertical', startVh: 0.15, endVh: 1.0 },
        // 02. Sección 3 (#casos-exito) - Cortina Horizontal (entra desde la derecha)
        { name: 'casos-exito', type: 'horizontal', startVh: 2.0, endVh: 5.0 },
        // 03. Sección 4 (#galeria-comercial) - Cortina Vertical
        { name: 'galeria', type: 'vertical', startVh: 6.0, endVh: 6.9 },
        // 04. Sección 5 (#transicion-imagen) - Cortina 2 Fases
        { name: 'transicion', type: 'vertical', startVh: 6.9, endVh: 8.2 },
        // 05. Sección 6 (#el-match / Catálogo) - Cortina 2 Fases
        { name: 'match', type: 'vertical', startVh: 8.2, endVh: 9.4 },
        // 06. Sección 7 (#pilar-integridad) - Cortina Vertical
        { name: 'integridad', type: 'vertical', startVh: 17.2, endVh: 18.05 },
        // 07. Sección 8 (#idea-lab) - Cortina Vertical
        { name: 'idealab', type: 'vertical', startVh: 20.4, endVh: 21.4 },
        // 08. Sección 9 (#valormaximoart + Footer) - Cortina Vertical
        { name: 'vmart', type: 'vertical', startVh: 25.4, endVh: 26.7 }
    ];

    function checkProximityAndSnap() {
        if (window.innerWidth <= 768 || isSnapping || isDrawerActive()) return;
        if (window.__suppressSnapUntil && Date.now() < window.__suppressSnapUntil) return;

        const vh = window.innerHeight;
        const vw = window.innerWidth;
        const scrollY = window.scrollY;

        for (const t of transitions) {
            const startPx = t.startVh * vh;
            const endPx = t.endVh * vh;
            const totalTravelPx = endPx - startPx;

            // Comprobar si el scroll actual se encuentra en el rango de transición de esta cortina
            if (scrollY >= startPx - 40 && scrollY <= endPx + 40) {
                const progress = Math.min(1, Math.max(0, (scrollY - startPx) / totalTravelPx));

                // Dimensión de la ventana según el eje de la cortina (16:9)
                const dimension = (t.type === 'horizontal') ? vw : vh;

                // Distancia física del borde de la cortina a los bordes de la pantalla (en píxeles)
                const distanceToComplete = (1 - progress) * dimension; // Píxeles restantes para abrirse al 100%
                const distanceToClose = progress * dimension;          // Píxeles restantes para cerrarse al 0%

                let targetPx = null;

                // Regla de proximidad: la cortina se completará si la transición está a 150px o menos del borde
                if (distanceToComplete <= 150 && distanceToComplete > 0.5) {
                    targetPx = endPx; // A <= 150px de abrirse -> Snap hacia el 100%
                } else if (distanceToClose <= 150 && distanceToClose > 0.5) {
                    targetPx = startPx; // A <= 150px de cerrarse -> Snap hacia el 0%
                }

                if (targetPx !== null && Math.abs(scrollY - targetPx) > 6) {
                    isSnapping = true;
                    clearTimeout(releaseTimer);
                    releaseTimer = setTimeout(() => { isSnapping = false; }, 2400);

                    lenis.scrollTo(targetPx, {
                        duration: 1.6,
                        easing: (p) => Math.min(1, 1.001 - Math.pow(2, -10 * p)),
                        onComplete: () => { isSnapping = false; }
                    });
                    return;
                }
            }
        }
    }

    function scheduleProximityCheck() {
        if (window.innerWidth <= 768 || isSnapping || isDrawerActive()) return;

        // Disparo si la inercia del scroll casi se detiene
        if (lenis && !isNaN(lenis.velocity) && Math.abs(lenis.velocity) < 2) {
            checkProximityAndSnap();
            return;
        }

        clearTimeout(snapTimer);
        snapTimer = setTimeout(checkProximityAndSnap, 130);
    }

    lenis.on('scroll', scheduleProximityCheck);
    window.addEventListener('scroll', scheduleProximityCheck, { passive: true });
}

// 0b. Curtain Reveal Vertical (Sección 2 sobre Hero)
function initCurtainReveals() {
    const esencia = document.getElementById('esencia');
    if (!esencia) return;
    const container = esencia.querySelector('.container');

    function update() {
        const vh = window.innerHeight;
        const isMobile = window.innerWidth <= 768;

        if (isMobile) {
            const scrollY = window.scrollY || window.pageYOffset;

            // Cortina Sección 2 despliega en el tramo de 0.1vh a 1.0vh
            const progressReveal = Math.min(1, Math.max(0, (scrollY - 0.1 * vh) / (0.9 * vh)));
            const clipPercent = (1 - progressReveal) * 100;
            esencia.style.setProperty('--curtain', `${clipPercent}%`);

            if (container) {
                if (progressReveal < 1.0) {
                    container.style.setProperty('transform', 'translate3d(0, 0px, 0)', 'important');
                } else {
                    // Scroll interno activo de 1.0vh a 2.8vh
                    const activeScrolled = Math.max(0, scrollY - 1.0 * vh);
                    const totalActiveTravel = 1.8 * vh;
                    const flowProgress = Math.min(1, activeScrolled / totalActiveTravel);
                    const maxScroll = Math.max(0, container.scrollHeight - vh + 120);

                    const translateYValue = -flowProgress * maxScroll;
                    container.style.setProperty('transform', `translate3d(0, ${translateYValue}px, 0)`, 'important');
                }
            }
        } else {
            const wrapper = document.querySelector('.curtain-wrapper');
            if (!wrapper) return;
            const rect = wrapper.getBoundingClientRect();
            const scrolled = -rect.top;

            // Cortina Sección 2 despliega de 0.15vh a 1.0vh
            const progress = Math.min(1, Math.max(0, (scrolled - 0.15 * vh) / (0.85 * vh)));
            const clipPercent = (1 - progress) * 100;
            esencia.style.setProperty('--curtain', `${clipPercent}%`);

            if (container) {
                if (progress < 1.0) {
                    const translateY = (1 - progress) * 60;
                    container.style.transform = `translate3d(0, ${translateY}px, 0)`;
                    container.style.opacity = progress;
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
    }

    const lenis = window.lenis;
    if (lenis) {
        lenis.on('scroll', update);
    }
    window.addEventListener('scroll', update, { passive: true });
    update();
}

// 0b2. Curtain Reveal Vertical (Sección 4: Galería Comercial)
function initGaleriaCurtain() {
    if (window.innerWidth <= 768) return;
    const galeria = document.getElementById('galeria-comercial');
    const wrapper = document.querySelector('.curtain-wrapper');
    if (!galeria || !wrapper) return;
    const container = galeria.querySelector('.container');

    function update() {
        const rect = wrapper.getBoundingClientRect();
        const vh = window.innerHeight;
        const scrolled = -rect.top;

        // En modo responsivo (<= 768px), la velocidad de revelado de cortina Galería Comercial se suaviza a 1.8vh. En Desktop se extiende a 0.9vh.
        const startPxGaleria = (window.innerWidth <= 768) ? 10.2 * vh : 6 * vh;
        const revealDistanceGaleria = (window.innerWidth <= 768) ? 1.8 * vh : 0.9 * vh;
        const progress = Math.min(1, Math.max(0, (scrolled - startPxGaleria) / revealDistanceGaleria));
        const clipPercent = (1 - progress) * 100;

        galeria.style.setProperty('--curtain-galeria', `${clipPercent}%`);

        if (container) {
            if (progress < 1.0) {
                container.style.transform = `translate3d(0, 0px, 0)`;
            } else {
                // Scroll interno compacto de Galería Comercial
                const activeStartGaleria = startPxGaleria + revealDistanceGaleria;
                const activeScrolled = Math.max(0, scrolled - activeStartGaleria);
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
    if (window.innerWidth <= 768) return;
    const sec = document.getElementById('transicion-imagen');
    const wrapper = document.querySelector('.curtain-wrapper');
    if (!sec || !wrapper) return;

    function update() {
        const rect = wrapper.getBoundingClientRect();
        const vh = window.innerHeight;
        const scrolled = -rect.top;

        // En modo responsivo (<= 768px), la cortina de Sección 5 (Transición de Imagen) se activa tras Sección 4 (12.1vh) con velocidad reducida a la mitad (2.0vh). En Desktop permanece intacta a 6.9vh.
        const startPxSec5 = (window.innerWidth <= 768) ? 12.1 * vh : 6.9 * vh;
        const revealDistanceSec5 = (window.innerWidth <= 768) ? 2.0 * vh : 1.0 * vh;
        const progress = Math.min(1, Math.max(0, (scrolled - startPxSec5) / revealDistanceSec5));

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
    if (!sec) return;

    const rightCol = sec.querySelector('.catalog-right-col');
    const container = sec.querySelector('.catalog-grid-container');
    const scrollIndicator = document.getElementById('catalog-scroll-indicator');

    function update() {
        const vh = window.innerHeight;
        const isMobile = window.innerWidth <= 768;

        if (isMobile) {
            // En móvil, la Sección 6 toca el borde superior exactamente a los 9.4vh
            const currentScroll = window.scrollY || window.pageYOffset;
            const startPxMobile = 9.4 * vh;
            const activeScrolled = Math.max(0, currentScroll - startPxMobile);

            if (container) {
                if (activeScrolled <= 0) {
                    container.style.setProperty('transform', 'translate3d(0, 0px, 0)', 'important');
                } else {
                    const totalTravel = 3.8 * vh;
                    const flowProgress = Math.min(1, activeScrolled / totalTravel);

                    // Medir la altura completa incluyendo el contenedor y el logo SVG de cierre
                    const closingLogo = sec.querySelector('.catalog-closing-glass');
                    const closingHeight = closingLogo ? (closingLogo.offsetHeight + 80) : 220;
                    const maxScroll = Math.max(0, container.scrollHeight - vh + closingHeight);

                    const translateYValue = -flowProgress * maxScroll;
                    container.style.setProperty('transform', `translate3d(0, ${translateYValue}px, 0)`, 'important');
                }
            }

            // Ocultar la animación de scroll sobre la primera ficha en cuanto el usuario empieza a bajar (> 35px)
            if (scrollIndicator) {
                const isFadedOut = activeScrolled > 35 || currentScroll < (startPxMobile - 100);
                scrollIndicator.classList.toggle('hidden', isFadedOut);
            }
        } else {
            const wrapper = document.querySelector('.curtain-wrapper');
            if (!wrapper) return;
            const rect = wrapper.getBoundingClientRect();
            const scrolled = -rect.top;

            const startPxSec6 = 8.2 * vh;
            const revealDistanceSec6 = 1.2 * vh;
            const progressSec6 = Math.min(1, Math.max(0, (scrolled - startPxSec6) / revealDistanceSec6));

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

            if (rightCol) {
                // Scroll interno activo desde que la sección empieza a revelarse / posicionarse
                const endPxSec6 = 9.4 * vh;
                const flowScrolled = Math.max(0, scrolled - endPxSec6);
                const totalTravel = 7.8 * vh;
                const flowProgress = Math.min(1, flowScrolled / totalTravel);

                // Cálculo dinámico en tiempo real de la altura de desfile de las tarjetas
                const maxScroll = Math.max(0, rightCol.scrollHeight - vh + 60);
                const translateYValue = -flowProgress * maxScroll;

                rightCol.style.transform = `translate3d(0, ${translateYValue}px, 0)`;

                if (scrollIndicator) {
                    const isFadedOut = flowScrolled > 35 || progressSec6 < 0.2;
                    scrollIndicator.classList.toggle('hidden', isFadedOut);
                }
            }
            if (container) container.style.transform = `translate3d(0, 0px, 0)`;
        }

        const globalScrollBtn = document.getElementById('global-scroll-btn');
        if (globalScrollBtn) {
            if (window.innerWidth <= 768) {
                const startPxMobile = 9.4 * vh;
                const totalTravel = 3.8 * vh;
                const endPxMobile = startPxMobile + totalTravel;
                const currentScroll = window.scrollY || window.pageYOffset;

                // Ocultar un poco antes de llegar a la Sección 6 (200px antes) hasta 80px antes del final
                const inCatalogResponsive = currentScroll >= (startPxMobile - 200) && currentScroll < (endPxMobile - 80);
                const isLastSection = currentScroll >= 44.2 * vh;
                globalScrollBtn.classList.toggle('hidden', inCatalogResponsive || isLastSection);
            } else {
                const wrapper = document.querySelector('.curtain-wrapper');
                if (wrapper) {
                    const rect = wrapper.getBoundingClientRect();
                    const scrolled = -rect.top;
                    const isCurtainFlow = scrolled >= 8.2 * vh && scrolled < 9.4 * vh;
                    const isLastSection = scrolled >= 26.0 * vh;
                    globalScrollBtn.classList.toggle('hidden', isCurtainFlow || isLastSection);
                }
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

// 0b5. Curtain Reveal Vertical (Sección 7: Pilar de Integridad)
function initIntegrityCurtain() {
    const sec = document.getElementById('pilar-integridad');
    if (!sec) return;

    const leftCol = sec.querySelector('.integridad-left-col');
    const container = sec.querySelector('.integridad-container') || sec.querySelector('.container');
    const staggerEls = sec.querySelectorAll('.integridad-card-stagger');
    const cardThresholds = [18.0, 18.5, 19.0, 19.5, 20.0];

    function update() {
        const vh = window.innerHeight;
        const isMobile = window.innerWidth <= 768;

        if (isMobile) {
            const scrollY = window.scrollY || window.pageYOffset;

            // Cortina Sección 7 despliega en el tramo de 13.2vh a 14.2vh (1.0vh de distancia, idéntica a Sección 2)
            const progressReveal = Math.min(1, Math.max(0, (scrollY - 13.2 * vh) / (1.0 * vh)));
            const clipPercent = (1 - progressReveal) * 100;
            sec.style.setProperty('--curtain-integrity', `${clipPercent}%`);

            if (container) {
                if (progressReveal < 1.0) {
                    container.style.setProperty('transform', 'translate3d(0, 0px, 0)', 'important');
                } else {
                    // Scroll interno activo de 14.2vh en adelante (con holgura y velocidad idéntica a Sección 2)
                    const activeScrolled = Math.max(0, scrollY - 14.2 * vh);
                    const totalActiveTravel = 1.8 * vh;
                    const flowProgress = Math.min(1, activeScrolled / totalActiveTravel);
                    const maxScroll = Math.max(0, container.scrollHeight - vh + 120);

                    const translateYValue = -flowProgress * maxScroll;
                    container.style.setProperty('transform', `translate3d(0, ${translateYValue}px, 0)`, 'important');
                }
            }

            staggerEls.forEach((card) => {
                card.classList.add('active');
            });
        } else {
            const wrapper = document.querySelector('.curtain-wrapper');
            if (!wrapper) return;
            const rect = wrapper.getBoundingClientRect();
            const scrolled = -rect.top;

            const startPxSec7 = 17.2 * vh;
            const progress = Math.min(1, Math.max(0, (scrolled - startPxSec7) / (0.85 * vh)));
            const clipPercent = (1 - progress) * 100;
            sec.style.setProperty('--curtain-integrity', `${clipPercent}%`);

            if (leftCol) {
                if (progress < 1.0) {
                    const translateY = (1 - progress) * 60;
                    leftCol.style.transform = `translateY(${translateY}px)`;
                    leftCol.style.opacity = progress;
                } else {
                    leftCol.style.transform = `translateY(0px)`;
                    leftCol.style.opacity = '1';
                }
            }

            if (progress >= 1.0) {
                if (container) {
                    const activeStartSec7 = 18.05 * vh;
                    const activeScrolled = Math.max(0, scrolled - activeStartSec7);
                    const totalActiveTravel = 2.35 * vh;
                    const flowProgress = Math.min(1, activeScrolled / totalActiveTravel);
                    const maxScroll = Math.max(0, container.scrollHeight - vh + 80);

                    const translateYValue = -flowProgress * maxScroll;
                    container.style.transform = `translate3d(0, ${translateYValue}px, 0)`;
                }
            } else if (container) {
                container.style.transform = `translate3d(0, 0px, 0)`;
            }

            const progressTotal = scrolled / vh;
            staggerEls.forEach((card, index) => {
                const threshold = cardThresholds[index] !== undefined ? cardThresholds[index] : (18.0 + index * 0.5);
                card.classList.toggle('active', progressTotal >= threshold);
            });
        }
    }

    const lenis = window.lenis;
    if (lenis) {
        lenis.on('scroll', update);
    }
    window.addEventListener('scroll', update, { passive: true });
    update();
}

// 0b5. Curtain Reveal Vertical (Sección 8: Idea Lab)
function initIdeaLabCurtain() {
    const sec = document.getElementById('idea-lab');
    if (!sec) return;

    const leftCol = sec.querySelector('.idealab-left-col');
    const container = sec.querySelector('.idealab-container') || sec.querySelector('.container');
    const staggerEls = sec.querySelectorAll('.idealab-card-stagger');
    const cardThresholds = [21.7, 22.1, 22.5, 22.9];

    function update() {
        const vh = window.innerHeight;
        const isMobile = window.innerWidth <= 768;

        if (isMobile) {
            const scrollY = window.scrollY || window.pageYOffset;

            // Cortina Sección 8 despliega en el tramo de 16.4vh a 17.4vh (1.0vh de distancia, idéntica a Sección 2)
            const progressReveal = Math.min(1, Math.max(0, (scrollY - 16.4 * vh) / (1.0 * vh)));
            const clipPercent = (1 - progressReveal) * 100;
            sec.style.setProperty('--curtain-idealab', `${clipPercent}%`);

            if (container) {
                if (progressReveal < 1.0) {
                    container.style.setProperty('transform', 'translate3d(0, 0px, 0)', 'important');
                } else {
                    // Scroll interno recortado y ágil de 17.4vh a 18.2vh (desplazamiento directo sin scroll muerto)
                    const activeScrolled = Math.max(0, scrollY - 17.4 * vh);
                    const totalActiveTravel = 0.8 * vh;
                    const flowProgress = Math.min(1, activeScrolled / totalActiveTravel);
                    const maxScroll = Math.max(0, container.scrollHeight - vh + 40);

                    const translateYValue = -flowProgress * maxScroll;
                    container.style.setProperty('transform', `translate3d(0, ${translateYValue}px, 0)`, 'important');
                }
            }

            staggerEls.forEach((card) => {
                card.classList.add('active');
            });
        } else {
            const wrapper = document.querySelector('.curtain-wrapper');
            if (!wrapper) return;
            const rect = wrapper.getBoundingClientRect();
            const scrolled = -rect.top;

            const startPxSec8 = 20.4 * vh;
            const progress = Math.min(1, Math.max(0, (scrolled - startPxSec8) / (1.0 * vh)));
            const clipPercent = (1 - progress) * 100;
            sec.style.setProperty('--curtain-idealab', `${clipPercent}%`);

            if (progress < 1.0) {
                if (leftCol) {
                    const translateY = (1 - progress) * 60;
                    leftCol.style.transform = `translateY(${translateY}px)`;
                    leftCol.style.opacity = progress;
                }
                if (container) {
                    container.style.transform = `translate3d(0, 0px, 0)`;
                }
            } else {
                if (container) {
                    const activeStartSec8 = 21.4 * vh;
                    const activeScrolled = Math.max(0, scrolled - activeStartSec8);
                    const totalActiveTravel = 4.0 * vh;
                    const flowProgress = Math.min(1, activeScrolled / totalActiveTravel);
                    const maxScroll = Math.max(0, container.scrollHeight - vh);

                    const translateYValue = -flowProgress * maxScroll;
                    container.style.transform = `translate3d(0, ${translateYValue}px, 0)`;
                }
            }

            const progressTotal = scrolled / vh;
            staggerEls.forEach((card, index) => {
                const threshold = cardThresholds[index] !== undefined ? cardThresholds[index] : (21.7 + index * 0.4);
                card.classList.toggle('active', progressTotal >= threshold);
            });
        }
    }

    const lenis = window.lenis;
    if (lenis) {
        lenis.on('scroll', update);
    }
    window.addEventListener('scroll', update, { passive: true });
    update();
}

// 0b6. Curtain Reveal Vertical (Sección 9: ValorMáximoART)
function initVmartCurtain() {
    const sec = document.getElementById('valormaximoart');
    if (!sec) return;
    const container = sec.querySelector('.container');

    function update() {
        const vh = window.innerHeight;
        const isMobile = window.innerWidth <= 768;

        if (isMobile) {
            const scrollY = window.scrollY || window.pageYOffset;
            const startPxSec9 = 18.2 * vh;
            const revealDistanceSec9 = 1.0 * vh;
            const progress = Math.min(1, Math.max(0, (scrollY - startPxSec9) / revealDistanceSec9));
            const clipPercent = (1 - progress) * 100;
            sec.style.setProperty('--curtain-vmart', `${clipPercent}%`);
        } else {
            const wrapper = document.querySelector('.curtain-wrapper');
            if (!wrapper) return;
            const rect = wrapper.getBoundingClientRect();
            const scrolled = -rect.top;

            const startPxSec9 = 25.4 * vh;
            const revealDistanceSec9 = 1.3 * vh;
            const progress = Math.min(1, Math.max(0, (scrolled - startPxSec9) / revealDistanceSec9));
            const clipPercent = (1 - progress) * 100;
            sec.style.setProperty('--curtain-vmart', `${clipPercent}%`);
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

    const isMobile = window.innerWidth <= 768;
    // Renderer transparente para que el fondo oscuro de #esencia se vea a través del patrón
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !isMobile });
    renderer.setPixelRatio(isMobile ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const vertexShader = `
        precision highp float;
        varying vec2 vUv;

        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `;

    const fragmentShader = `
        precision highp float;
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

// 0d2. Logo ISO Silk Shader (Efecto Silk Shader con Seda Verde #326d03 dentro del Isotipo)
function initIsoSilk() {
    const canvas = document.getElementById('iso-silk-canvas');
    if (!canvas) return;

    function start() {
        if (typeof THREE === 'undefined') {
            setTimeout(start, 50);
            return;
        }

        const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(152, 152, false);
        renderer.setClearColor(0x000000, 0);

        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

        const vertexShader = `
            precision highp float;
            varying vec2 vUv;

            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `;

        const fragmentShader = `
            precision highp float;
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
                col.a = 1.0;
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
            uColor: { value: new THREE.Color(...hexToNormalizedRGB('#ffffff')) },
            uSpeed: { value: 5.0 },
            uScale: { value: 0.8 },
            uRotation: { value: 1.03 },
            uNoiseIntensity: { value: 0.0 }
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

        let clock = new THREE.Clock();
        let animId = null;
        let isIsoSilkAnimating = true;

        function animate() {
            if (!isIsoSilkAnimating) return;
            animId = requestAnimationFrame(animate);
            uniforms.uTime.value += 0.1 * clock.getDelta();
            renderer.render(scene, camera);
        }
        animate();

        const secMatch = document.getElementById('el-match');
        if (secMatch && 'IntersectionObserver' in window) {
            const obs = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        if (!isIsoSilkAnimating) {
                            isIsoSilkAnimating = true;
                            clock.getDelta();
                            animate();
                        }
                    } else {
                        isIsoSilkAnimating = false;
                        if (animId) cancelAnimationFrame(animId);
                    }
                });
            }, { threshold: 0.01 });
            obs.observe(secMatch);
        }
    }

    start();
}

// 0c. Curtain Reveal Horizontal y Secuencia Sticky Timeline (Sección 3: Portafolio — Casos de Éxito)
function initHorizontalCurtainReveals() {
    const sec = document.getElementById('casos-exito');
    if (!sec) return;

    const leftCurtains = document.querySelectorAll('.section-curtain-left');
    const blurTextP = document.querySelector('.blur-text-element');
    const cards = document.querySelectorAll('.project-card-stagger');
    const container = sec.querySelector('.portfolio-container');

    function update() {
        const vh = window.innerHeight;
        const isMobile = window.innerWidth <= 768;

        if (isMobile) {
            const scrollY = window.scrollY || window.pageYOffset;

            // 1. Fase Apertura de Cortina Sección 3 (inicia tras scroll interno de Sección 2 a los 2.8vh)
            const revealStart = 2.8 * vh;
            const revealDuration = 0.8 * vh;
            const progressReveal = Math.min(1, Math.max(0, (scrollY - revealStart) / revealDuration));
            const clipPercent = (1 - progressReveal) * 100;
            sec.style.setProperty('--curtain-casos', `${clipPercent}%`);
            sec.style.setProperty('--curtain-right', `${clipPercent}%`);

            if (container) {
                if (progressReveal < 1.0) {
                    container.style.setProperty('transform', 'translate3d(0, 0px, 0)', 'important');
                } else {
                    // 2. Fase Scroll Interno Tarjetas Sección 3 (de 3.6vh a 5.4vh = 1.8vh de recorrido)
                    const activeStart = revealStart + revealDuration; // 3.6 * vh
                    const activeScrolled = Math.max(0, scrollY - activeStart);
                    const totalActiveTravel = 1.8 * vh;
                    const flowProgress = Math.min(1, activeScrolled / totalActiveTravel);
                    const maxScroll = Math.max(0, container.scrollHeight - vh + 120);

                    const translateYValue = -flowProgress * maxScroll;
                    container.style.setProperty('transform', `translate3d(0, ${translateYValue}px, 0)`, 'important');
                }
            }

            cards.forEach(card => card.classList.add('active'));
            if (blurTextP) blurTextP.classList.add('active');
        } else {
            const wrapper = document.querySelector('.curtain-wrapper');
            if (!wrapper) return;
            const rect = wrapper.getBoundingClientRect();
            const scrolled = -rect.top;

            const startPx = 2 * vh;
            const revealDistance = 3.0 * vh;
            const progress = Math.min(1, Math.max(0, (scrolled - startPx) / revealDistance));
            const clipRight = Math.max(0, Math.min(100, 100 - progress * 100));

            leftCurtains.forEach(section => {
                section.style.setProperty('--curtain-right', `${clipRight}%`);
            });

            if (container) {
                if (progress < 1.0) {
                    container.style.transform = `translate3d(0, 0px, 0)`;
                } else {
                    const activeStartPx = startPx + revealDistance;
                    const activeScrolled = Math.max(0, scrolled - activeStartPx);
                    const scrollTravel = 3.3 * vh;
                    const flowProgress = Math.min(1, activeScrolled / scrollTravel);
                    const maxScroll = Math.max(0, container.scrollHeight - vh + 100);

                    const translateYValue = -flowProgress * maxScroll;
                    container.style.transform = `translate3d(0, ${translateYValue}px, 0)`;
                }
            }

            // Secuencia Timeline en vh acumulado (SÓLO para escritorio)
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
    }
    window.addEventListener('scroll', update, { passive: true });
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
    if (window.lenis) window.lenis.stop();
    if (window.startDrawerLinesAnimation) window.startDrawerLinesAnimation();
}

function closeMatchDrawer() {
    const drawer = document.getElementById('vm-drawer-overlay');
    if (!drawer) return;
    if (document.activeElement && typeof document.activeElement.blur === 'function') {
        document.activeElement.blur();
    }
    drawer.classList.remove('active');
    document.body.style.overflow = '';
    if (window.lenis) window.lenis.start();
    suppressSnapTemporarily();
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
    if (window.lenis) window.lenis.stop();
}

function closePhilosophyDrawer() {
    const drawer = document.getElementById('philosophy-drawer-overlay');
    if (!drawer) return;
    if (document.activeElement && typeof document.activeElement.blur === 'function') {
        document.activeElement.blur();
    }
    drawer.classList.remove('active');
    document.body.style.overflow = '';
    if (window.lenis) window.lenis.start();
    suppressSnapTemporarily();
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
    { key: 'hidalgo', title: 'Edificio Hidalgo', image: 'galeria 3/hidalgo.jpeg' },
    { key: 'villada', title: 'Villada', image: 'galeria 3/villada.png' },
    { key: 'pinosuarez', title: 'Pino Suárez', image: 'galeria 3/pinosuarez.png' },
    { key: 'villanueva', title: 'Felipe Villanueva', image: 'galeria 3/villanueva.png' },
    { key: 'riva palacio', title: 'Riva Palacio', image: 'galeria 3/riva palacio.jpg' },
    { key: 'paseo central', title: 'Paseo Central', image: 'galeria 3/paseo central.jpg' }
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
            embed: 'https://maps.google.com/maps?q=Av.+Felipe+Villanueva,+Toluca,+M%C3%A9xico&z=17&ie=UTF8&iwloc=&output=embed',
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
            embed: 'https://maps.google.com/maps?q=19.2858101,-99.6586716&z=18&ie=UTF8&iwloc=&output=embed',
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
            embed: 'https://maps.google.com/maps?q=19.2803625,-99.6538905&z=18&ie=UTF8&iwloc=&output=embed',
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
            embed: 'https://maps.google.com/maps?q=Plaza+Comercial+El+Meson+2,+Av.+Calimaya,+Rancho+El+Meson,+M%C3%A9x.&ftid=0x85cd89879a895cd9:0xf78972e90cf1c343&z=17&ie=UTF8&iwloc=&output=embed',
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
            const safeSrc = src.startsWith('http') ? src : src.split('/').map(p => encodeURIComponent(p)).join('/');
            img.src = safeSrc;
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
    bindTableMouseDrag();

    setTimeout(startFichaScroll, 60);
}

function bindTableMouseDrag() {
    const wrappers = document.querySelectorAll('.ficha-table-wrapper');
    wrappers.forEach(wrapper => {
        if (wrapper.dataset.dragBound) return;
        wrapper.dataset.dragBound = 'true';
        let isDown = false;
        let startX;
        let scrollLeft;

        wrapper.addEventListener('mousedown', (e) => {
            isDown = true;
            wrapper.style.cursor = 'grabbing';
            startX = e.pageX - wrapper.offsetLeft;
            scrollLeft = wrapper.scrollLeft;
        });
        wrapper.addEventListener('mouseleave', () => {
            isDown = false;
            wrapper.style.cursor = 'grab';
        });
        wrapper.addEventListener('mouseup', () => {
            isDown = false;
            wrapper.style.cursor = 'grab';
        });
        wrapper.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - wrapper.offsetLeft;
            const walk = (x - startX) * 1.5;
            wrapper.scrollLeft = scrollLeft - walk;
        });
    });
}

// El scroll interno del modal (tabla técnica) se controla manualmente,
// porque Lenis intercepta los eventos wheel y touch a nivel de documento.
let fichaWheelBound = false;
let fichaTouchStartX = 0;
let fichaTouchStartY = 0;

function handleFichaTouchStart(e) {
    if (e.touches && e.touches.length > 0) {
        fichaTouchStartX = e.touches[0].clientX;
        fichaTouchStartY = e.touches[0].clientY;
    }
}

function handleFichaTouchMove(e) {
    const overlay = document.getElementById('ficha-modal-overlay');
    if (!overlay || !overlay.classList.contains('active')) return;

    const tech = document.querySelector('.ficha-modal .ficha-tech');
    if (!tech || !e.touches || e.touches.length === 0) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = fichaTouchStartX - currentX;
    const deltaY = fichaTouchStartY - currentY;
    fichaTouchStartX = currentX;
    fichaTouchStartY = currentY;

    // Si el toque ocurrió dentro de un contenedor de tabla desplazable horizontalmente
    const tableWrapper = e.target.closest ? e.target.closest('.ficha-table-wrapper') : null;
    if (tableWrapper && Math.abs(deltaX) > Math.abs(deltaY) && tableWrapper.scrollWidth > tableWrapper.clientWidth) {
        tableWrapper.scrollLeft += deltaX;
        return;
    }

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

    const deltaX = event.deltaX;
    const deltaY = event.deltaY;
    const targetWrapper = event.target.closest ? event.target.closest('.ficha-table-wrapper') : null;

    // 1. Navegación en Eje X (Swipe horizontal en Touchpad / Trackpad de 2 dedos)
    if (Math.abs(deltaX) > 0) {
        const wrapperToScroll = targetWrapper || tech.querySelector('.ficha-table-wrapper');
        if (wrapperToScroll && wrapperToScroll.scrollWidth > wrapperToScroll.clientWidth) {
            wrapperToScroll.scrollLeft += deltaX;
            event.preventDefault();
            event.stopPropagation();
            return;
        }
    }

    // 2. Navegación en Eje Y (Scroll vertical del modal)
    if (Math.abs(deltaY) > 0 && tech.scrollHeight > tech.clientHeight) {
        tech.scrollTop += deltaY;
        event.preventDefault();
    }
}

let fichaTrackTouchStartX = 0;
let fichaTrackIsDragging = false;

function bindFichaTrackTouch() {
    const viewport = document.getElementById('ficha-photos-viewport');
    if (!viewport || viewport.dataset.touchBound) return;
    viewport.dataset.touchBound = 'true';

    viewport.addEventListener('touchstart', (e) => {
        if (e.touches && e.touches.length > 0) {
            fichaTrackIsDragging = true;
            fichaTrackTouchStartX = e.touches[0].clientX;
        }
    }, { passive: true });

    viewport.addEventListener('touchmove', (e) => {
        if (!fichaTrackIsDragging || !e.touches || e.touches.length === 0) return;
        const currentX = e.touches[0].clientX;
        const deltaX = fichaTrackTouchStartX - currentX;
        fichaTrackTouchStartX = currentX;

        fichaOffset += deltaX * 1.3;
        const track = document.getElementById('ficha-photos-track');
        if (track) {
            const singleSetWidth = track.scrollWidth / 3;
            if (singleSetWidth > 0) {
                if (fichaOffset < 0) fichaOffset += singleSetWidth;
                if (fichaOffset >= singleSetWidth) fichaOffset -= singleSetWidth;
            }
            track.style.transform = `translate3d(${-fichaOffset}px, 0px, 0px)`;
        }
    }, { passive: true });

    viewport.addEventListener('touchend', () => {
        fichaTrackIsDragging = false;
    }, { passive: true });
}

function startFichaScroll() {
    const track = document.getElementById('ficha-photos-track');
    const viewport = document.getElementById('ficha-photos-viewport');
    if (!track || !viewport) return;
    if (fichaRAF) { cancelAnimationFrame(fichaRAF); fichaRAF = null; }
    bindFichaTrackTouch();

    const singleSetWidth = track.scrollWidth / 3;
    if (singleSetWidth <= 0) {
        fichaRAF = requestAnimationFrame(startFichaScroll);
        return;
    }

    function step() {
        if (!fichaTrackIsDragging) {
            fichaOffset += 1.8;
            if (fichaOffset >= singleSetWidth) {
                fichaOffset = 0;
            }
            track.style.transform = `translate3d(${-fichaOffset}px, 0px, 0px)`;
        }
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
    let targetVh = vh;
    if (window.innerWidth <= 768) {
        if (vh === 9.4) {
            const secMatch = document.getElementById('el-match');
            if (secMatch) {
                suppressSnapTemporarily();
                window.scrollTo({ top: secMatch.offsetTop, behavior: 'smooth' });
                return;
            }
            targetVh = 9.4;
        }
        else if (vh === 19.2) targetVh = 41.5;
        else if (vh === 16.3) targetVh = 36.5;
        else if (vh === 2.0) targetVh = 5.2;
    } else {
        if (vh === 19.2) targetVh = 23.0;
        else if (vh === 16.3) targetVh = 20.4;
        else if (vh === 22.8) targetVh = 26.7;
    }
    const target = targetVh * window.innerHeight;
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
    const isMobile = window.innerWidth <= 768;

    if (isMobile) {
        const sectionIds = ['inicio', 'esencia', 'casos-exito', 'galeria-comercial', 'transicion-imagen', 'el-match', 'pilar-integridad', 'idea-lab', 'valormaximoart'];
        const targets = sectionIds
            .map(id => document.getElementById(id))
            .filter(Boolean)
            .map(el => el.offsetTop);
        targets.push(0); // Volver al inicio al final

        let nextTarget = targets.find(t => t > scrollY + 40);
        if (nextTarget === undefined) nextTarget = 0;

        window.scrollTo({ top: nextTarget, behavior: 'smooth' });
        return;
    }

    // Lista ordenada de los puntos clave de scroll en la línea de tiempo de cortinas (Escritorio)
    const desktopTargets = [
        1.0 * vh,   // Sección 2 (El Diferenciador Absoluto)
        2.0 * vh,   // Sección 3 (Casos de Éxito)
        6.0 * vh,   // Sección 4 (Galería Comercial)
        6.9 * vh,   // Sección 5 (Transición de Imagen)
        9.4 * vh,   // Sección 6 (Catálogo — El Match: Inmediatamente tras cortina)
        20.4 * vh,  // Sección 7 (Pilar de Integridad: Todos los 5 pilares desplegados con absoluta discreción)
        23.0 * vh,  // Sección 8 (Idea Lab: Todos los contenedores desplegados con Edificio Hidalgo)
        26.7 * vh,  // Sección 9 (ValorMáximoART + Footer: Cortina 100% revelada)
        0           // Volver al Inicio (Hero)
    ];

    let nextTarget = desktopTargets.find(t => t > scrollY + 30);
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

// 0e. Fondo FloatingLines WebGL Shader en el Panel Izquierdo del Formulario / Drawer Modal (Get Qualified - Solo Desktop)
function initDrawerFloatingLines() {
    window.startDrawerLinesAnimation = function () {};
    window.stopDrawerLinesAnimation = function () {};

    if (window.innerWidth <= 768) return;

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

        vec3 getGradientColor(int index) {
            if (index == 0) return lineGradient[0];
            if (index == 1) return lineGradient[1];
            if (index == 2) return lineGradient[2];
            if (index == 3) return lineGradient[3];
            if (index == 4) return lineGradient[4];
            if (index == 5) return lineGradient[5];
            if (index == 6) return lineGradient[6];
            return lineGradient[7];
        }

        vec3 getLineColor(float t, vec3 baseColor) {
            if (lineGradientCount <= 0) return baseColor;
            if (lineGradientCount == 1) return lineGradient[0] * 0.5;
            float clampedT = clamp(t, 0.0, 0.9999);
            float scaled = clampedT * float(lineGradientCount - 1);
            int idx = int(floor(scaled));
            float f = fract(scaled);
            int idx2 = min(idx + 1, lineGradientCount - 1);
            vec3 c1 = getGradientColor(idx);
            vec3 c2 = getGradientColor(idx2);
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
        if (window.innerWidth <= 768) {
            if (isDrawerLinesAnimating) {
                isDrawerLinesAnimating = false;
                if (drawerAnimId) cancelAnimationFrame(drawerAnimId);
            }
            return;
        }
        const width = container.clientWidth || window.innerWidth / 2;
        const height = container.clientHeight || window.innerHeight;
        renderer.setSize(width, height, false);
        uniforms.iResolution.value.set(renderer.domElement.width, renderer.domElement.height, 1);
    }
    resize();
    window.addEventListener('resize', resize, { passive: true });

    container.addEventListener('mousemove', (e) => {
        if (window.innerWidth <= 768) return;
        const rect = canvas.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left) * renderer.getPixelRatio();
        const mouseY = (rect.height - (e.clientY - rect.top)) * renderer.getPixelRatio();
        uniforms.iMouse.value.set(mouseX, mouseY);
        uniforms.bendInfluence.value = 1.0;
    });

    let isDrawerLinesAnimating = false;
    let drawerAnimId = null;

    function animate() {
        if (!isDrawerLinesAnimating || window.innerWidth <= 768) return;
        drawerAnimId = requestAnimationFrame(animate);
        uniforms.iTime.value = clock.getElapsedTime();
        renderer.render(scene, camera);
    }

    window.startDrawerLinesAnimation = function () {
        if (window.innerWidth <= 768) return;
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

// 00. Pantalla de Precarga Prémium (Logo ISO - Fondo Verde Oscuro #064E3B)
function initPreloader() {
    const overlay = document.getElementById('vm-preloader-overlay');
    const progressFill = document.getElementById('preloader-progress-fill');
    const percentageText = document.getElementById('preloader-percentage');
    if (!overlay) return;

    // Detener scroll de Lenis durante la precarga
    if (window.lenis) {
        window.lenis.stop();
    }

    let isFinished = false;
    function finishPreloader() {
        if (isFinished) return;
        isFinished = true;

        if (progressFill) progressFill.style.width = '100%';
        if (percentageText) percentageText.textContent = '100%';

        setTimeout(() => {
            overlay.classList.add('hidden-preloader');
            if (window.lenis) {
                window.lenis.start();
            }
            setTimeout(() => {
                overlay.style.display = 'none';
            }, 450);
        }, 100);
    }

    // Progreso ultra rápido y fluido de precarga (~400ms para no penalizar el LCP)
    const startTime = performance.now();
    const duration = 400;

    function step(now) {
        const elapsed = now - startTime;
        const progress = Math.min(100, Math.round((elapsed / duration) * 100));

        if (progressFill) progressFill.style.width = `${progress}%`;
        if (percentageText) percentageText.textContent = `${progress}%`;

        if (progress < 100) {
            requestAnimationFrame(step);
        } else {
            finishPreloader();
        }
    }

    requestAnimationFrame(step);
    setTimeout(finishPreloader, 600);
}
