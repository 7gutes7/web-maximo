/**
 * VALOR MÁXIMO — SERVICIO DE CATÁLOGO DINÁMICO
 * Gestiona la sincronización en tiempo real, caché local (0ms de latencia)
 * y renderizado inmutable de tarjetas y fichas técnicas.
 */

window.VALOR_MAXIMO_CONFIG = window.VALOR_MAXIMO_CONFIG || {
    supabaseUrl: "", // URL de tu proyecto Supabase
    supabaseAnonKey: "", // Clave anon pública de Supabase
};

const CatalogService = {
    cacheKey: "vm_catalog_cache_v1",
    items: [],

    /**
     * Inicializa el servicio, carga desde caché o JSON maestro,
     * e intenta sincronizar en segundo plano.
     */
    async init() {
        // 1. Carga instantánea desde caché local (0ms)
        const cached = this.    /**
     * Ordena los inmuebles automáticamente:
     * 1. Riva Palacio siempre primero.
     * 2. De mayor a menor disponibilidad de locales.
     * 3. Reforzado por número total de locales (de más a menos).
     */
    sortItems(items) {
        if (!items || !items.length) return items || [];

        const getDispCount = (item) => {
            const locales = item.locales || [];
            return locales.filter(loc => 
                (loc.giro || '').toUpperCase().includes('DISPONIBLE') || 
                (loc.notas || '').toUpperCase().includes('DISPONIBLE')
            ).length;
        };

        const isRiva = (item) => {
            const idStr = String(item.id || '').toLowerCase();
            const titleStr = String(item.titulo || '').toLowerCase();
            return idStr.includes('riva') || titleStr.includes('riva');
        };

        return [...items].sort((a, b) => {
            const aRiva = isRiva(a);
            const bRiva = isRiva(b);

            if (aRiva && !bRiva) return -1;
            if (!aRiva && bRiva) return 1;

            const aDisp = getDispCount(a);
            const bDisp = getDispCount(b);
            if (bDisp !== aDisp) {
                return bDisp - aDisp;
            }

            const aTotal = (a.locales || []).length;
            const bTotal = (b.locales || []).length;
            if (bTotal !== aTotal) {
                return bTotal - aTotal;
            }

            return (a.order || 0) - (b.order || 0);
        });
    },

    loadFromCache();
        if (cached && cached.length) {
            this.items = this.sortItems(cached);
            this.syncFichasInmuebles(cached);
        }

        // 2. Sincronización en segundo plano (Fetch a JSON o Supabase)
        try {
            const freshData = await this.fetchRemoteData();
            if (freshData && freshData.length) {
                const hasChanged = JSON.stringify(freshData) !== JSON.stringify(this.items);
                this.items = this.sortItems(freshData);
                this.saveToCache(freshData);
                this.syncFichasInmuebles(freshData);

                if (hasChanged) {
                    this.render();
                }
            }
        } catch (err) {
            console.warn("[CatalogService] Modo offline / fallback activo:", err);
            if (!this.items.length) {
                const fallback = await this.fetchFallbackJSON();
                this.items = this.sortItems(fallback);
                this.syncFichasInmuebles(fallback);
                this.render();
            }
        }
    },

        /**
     * Ordena los inmuebles automáticamente:
     * 1. Riva Palacio siempre primero.
     * 2. De mayor a menor disponibilidad de locales.
     * 3. Reforzado por número total de locales (de más a menos).
     */
    sortItems(items) {
        if (!items || !items.length) return items || [];

        const getDispCount = (item) => {
            const locales = item.locales || [];
            return locales.filter(loc => 
                (loc.giro || '').toUpperCase().includes('DISPONIBLE') || 
                (loc.notas || '').toUpperCase().includes('DISPONIBLE')
            ).length;
        };

        const isRiva = (item) => {
            const idStr = String(item.id || '').toLowerCase();
            const titleStr = String(item.titulo || '').toLowerCase();
            return idStr.includes('riva') || titleStr.includes('riva');
        };

        return [...items].sort((a, b) => {
            const aRiva = isRiva(a);
            const bRiva = isRiva(b);

            if (aRiva && !bRiva) return -1;
            if (!aRiva && bRiva) return 1;

            const aDisp = getDispCount(a);
            const bDisp = getDispCount(b);
            if (bDisp !== aDisp) {
                return bDisp - aDisp;
            }

            const aTotal = (a.locales || []).length;
            const bTotal = (b.locales || []).length;
            if (bTotal !== aTotal) {
                return bTotal - aTotal;
            }

            return (a.order || 0) - (b.order || 0);
        });
    },

    loadFromCache() {
        try {
            const data = localStorage.getItem(this.cacheKey);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            return null;
        }
    },

    saveToCache(data) {
        try {
            localStorage.setItem(this.cacheKey, JSON.stringify(data));
        } catch (e) {
            // Quota exceeded o modo privado
        }
    },

    async fetchFallbackJSON() {
        const res = await fetch("data/catalogo.json?v=" + Date.now());
        if (!res.ok) throw new Error("No se pudo cargar data/catalogo.json");
        return await res.json();
    },

    async fetchRemoteData() {
        const cfg = window.VALOR_MAXIMO_CONFIG;
        if (cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase) {
            const client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
            const { data, error } = await client
                .from("inmuebles")
                .select("*")
                .eq("active", true)
                .order("order_num", { ascending: true });

            if (error) throw error;
            if (data && data.length) {
                return data.map(row => ({
                    id: row.id,
                    order: row.order_num,
                    active: row.active,
                    titulo: row.titulo,
                    subtitulo: row.subtitulo,
                    badgeText: row.badge_text,
                    badgeType: row.badge_type,
                    descripcion: row.descripcion,
                    perfilLabel: row.perfil_label,
                    perfilTexto: row.perfil_texto,
                    portada: row.portada,
                    ubicacion: row.ubicacion || {},
                    fotos: row.fotos || [],
                    tabla: row.tabla || [],
                    encabezadosLocales: row.encabezados_locales || [],
                    locales: row.locales || [],
                    notasPie: row.notas_pie || [],
                    datosGenerales: row.datos_generales || []
                }));
            }
        }
        return await this.fetchFallbackJSON();
    },

    /**
     * Sincroniza el diccionario global de fichas técnicas para el modal
     */
    syncFichasInmuebles(items) {
        if (!window.fichasInmuebles) {
            window.fichasInmuebles = {};
        }
        items.forEach(item => {
            window.fichasInmuebles[item.id] = {
                titulo: item.titulo,
                ubicacion: item.ubicacion,
                fotos: item.fotos,
                tabla: item.tabla,
                encabezadosLocales: item.encabezadosLocales,
                locales: item.locales,
                notasPie: item.notasPie,
                datosGenerales: item.datosGenerales
            };
        });
    },

    /**
     * Renderiza las tarjetas del catálogo manteniendo los elementos fijos
     */
    render() {
        const rightCol = document.querySelector(".catalog-right-col");
        if (!rightCol) return;

        const indicator = document.getElementById("catalog-scroll-indicator");
        const closingGlass = document.getElementById("catalog-closing-glass");

        // Eliminar tarjetas previas
        const oldCards = rightCol.querySelectorAll(".catalog-item");
        oldCards.forEach(c => c.remove());

        // Fragmento para máximo rendimiento de renderizado en DOM
        const fragment = document.createDocumentFragment();

        this.items.forEach(item => {
            if (item.active === false) return;

            const card = document.createElement("div");
            card.className = "catalog-item catalog-card-stagger";
            card.setAttribute("data-ficha", item.id);
            card.style.cursor = "pointer";
            card.setAttribute("onclick", "openFichaModal(this)");

            const perfilHTML = item.perfilTexto ? `
                <div style="border-top: 1px solid #eee; padding-top: 1rem; margin-bottom: 1rem;">
                    <span style="font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-muted); text-align: left; display: block;">${item.perfilLabel || "Perfil Empresarial"}</span>
                    <p style="font-size: 0.85rem; font-weight: 500; margin: 0.2rem 0 0 0; text-align: left;">${item.perfilTexto}</p>
                </div>
            ` : "";

            card.innerHTML = `
                <img src="${item.portada}" alt="${item.titulo}" class="catalog-img" onclick="openFichaModal(this)" style="cursor:pointer;" loading="lazy" decoding="async">
                <div class="catalog-content">
                    <div class="catalog-meta">
                        <div>
                            <h3 class="font-serif" style="font-size: 1.5rem; margin-bottom: 0.25rem;">${item.titulo}</h3>
                            <p class="font-serif" style="font-style: italic; color: var(--text-muted);">${item.subtitulo || ""}</p>
                        </div>
                        <span class="badge ${item.badgeType || "badge-open"}" onclick="openFichaModal(this)" style="cursor:pointer;">${item.badgeText || "DISPONIBLE"}</span>
                    </div>
                    <p class="text-muted" style="font-size: 0.85rem; margin-bottom: 1.5rem;">${item.descripcion || ""}</p>
                    ${perfilHTML}
                    <div class="catalog-actions">
                        <button onclick="openMatchDrawer()" class="btn btn-dark">Solicitar Ficha Detallada</button>
                        <button type="button" class="btn btn-details" onclick="openFichaModal(this)">Detalles</button>
                    </div>
                </div>
            `;
            fragment.appendChild(card);
        });

        if (closingGlass) {
            rightCol.insertBefore(fragment, closingGlass);
        } else {
            rightCol.appendChild(fragment);
        }

        // Re-inicializar animaciones e IntersectionObserver
        if (typeof initSectionMatchCatalogObserver === "function") {
            initSectionMatchCatalogObserver();
        }
    }
};

window.CatalogService = CatalogService;

// Auto-inicialización al cargar el DOM
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => CatalogService.init());
} else {
    CatalogService.init();
}
