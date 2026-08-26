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
    cacheKey: "vm_catalog_cache_v3",
    items: [],

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
                (loc.notas || '').toUpperCase().includes('DISPONIBLE') ||
                (loc.estatus || '').toUpperCase().includes('DISPONIBLE')
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

    /**
     * Inicializa el servicio, carga desde caché o JSON maestro,
     * e intenta sincronizar en segundo plano.
     */
    async init() {
        // 1. Carga instantánea desde caché local (0ms de latencia)
        const cached = this.loadFromCache();
        if (cached && cached.length) {
            this.items = this.sortItems(cached);
            this.syncFichasInmuebles(cached);
            this.render();
        }

        // 2. Sincronización en segundo plano con backend remoto (si Supabase está configurado)
        try {
            const remoteData = await this.fetchRemoteData();
            if (remoteData && remoteData.length) {
                const hasChanged = JSON.stringify(remoteData) !== JSON.stringify(this.items);
                this.items = this.sortItems(remoteData);
                this.saveToCache(remoteData);
                this.syncFichasInmuebles(remoteData);

                if (hasChanged) {
                    this.render();
                }
                return;
            }
        } catch (err) {
            console.warn("[CatalogService] Sincronización remota no disponible:", err);
        }

        // 3. Fallback inicial: SOLO si NO había nada en caché local
        if (!this.items || !this.items.length) {
            try {
                const fallback = await this.fetchFallbackJSON();
                if (fallback && fallback.length) {
                    this.items = this.sortItems(fallback);
                    this.saveToCache(fallback);
                    this.syncFichasInmuebles(fallback);
                    this.render();
                }
            } catch (e) {
                console.error("[CatalogService] Error cargando data/catalogo.json:", e);
            }
        }
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
        } catch (e) {}

        // Sincronización automática con el servidor del dominio (Hostinger / Apache PHP)
        this.saveToServer(data);
    },

    async saveToServer(data) {
        try {
            const res = await fetch("save_catalog.php", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                const resJson = await res.json();
                console.log("[CatalogService] Guardado en servidor exitoso:", resJson);
            }
        } catch (err) {
            console.warn("[CatalogService] Servidor estático sin PHP o sin permisos:", err);
        }
    },

    async fetchFallbackJSON() {
        const res = await fetch("data/catalogo.json?v=" + Date.now());
        if (!res.ok) throw new Error("No se pudo cargar data/catalogo.json");
        return await res.json();
    },

    async fetchRemoteData() {
        const cfg = window.VALOR_MAXIMO_CONFIG;
        if (cfg && cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase) {
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
        return null;
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
     * Mapa de equivalencias para claves de traducción en i18n
     */
    fichaI18nMap: {
        "riva-palacio": 1,
        "sub-level": 2,
        "avenida-central": 3,
        "distrito-financiero": 4,
        "paseo-artes": 5,
        "felipe-villanueva": 6,
        "villada": 7,
        "solidaridad-torres": 8,
        "plaza-ceboruco": 9,
        "av-lerdo": 10,
        "benito-juarez": 11,
        "plaza-rancho-el-meson-ii": 12,
        "unni-plaza": 13,
        "venustiano-carranza": 14,
        "wenceslao-labra": 15,
        "brigida-garcia": 16
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

        const sortedItems = this.sortItems(this.items || []);

        sortedItems.forEach((item, index) => {
            if (item.active === false) return;

            const card = document.createElement("div");
            card.className = "catalog-item catalog-card-stagger";
            card.setAttribute("data-ficha", item.id);
            card.style.cursor = "pointer";
            card.setAttribute("onclick", "openFichaModal(this)");

            const num = this.fichaI18nMap[item.id] || item.order || (index + 1);
            const subAttr = num ? ` data-i18n="card_sub_${num}"` : "";
            const descAttr = num ? ` data-i18n="card_desc_${num}"` : "";
            const profTAttr = num ? ` data-i18n="card_prof_t_${num}"` : "";
            const profVAttr = num ? ` data-i18n="card_prof_v_${num}"` : "";

            const perfilHTML = item.perfilTexto ? `
                <div style="border-top: 1px solid #eee; padding-top: 1rem; margin-bottom: 1rem;">
                    <span style="font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-muted); text-align: left; display: block;"${profTAttr}>${item.perfilLabel || "Perfil Empresarial"}</span>
                    <p style="font-size: 0.85rem; font-weight: 500; margin: 0.2rem 0 0 0; text-align: left;"${profVAttr}>${item.perfilTexto}</p>
                </div>
            ` : "";

            card.innerHTML = `
                <img src="${encodeURI(item.portada || 'galeria comercial/Hidalgo/Portada.jpg')}" onerror="this.onerror=null; this.src='galeria%20comercial/Hidalgo/Portada.jpg';" alt="${item.titulo}" class="catalog-img" onclick="openFichaModal(this)" style="cursor:pointer;" loading="lazy" decoding="async">
                <div class="catalog-content">
                    <div class="catalog-meta">
                        <div>
                            <h3 class="font-serif" style="font-size: 1.5rem; margin-bottom: 0.25rem;">${item.titulo}</h3>
                            <p class="font-serif" style="font-style: italic; color: var(--text-muted);"><span${subAttr}>${item.subtitulo || ""}</span></p>
                        </div>
                        <span class="badge ${item.badgeType || "badge-open"}" onclick="openFichaModal(this)" style="cursor:pointer;">${item.badgeText || "DISPONIBLE"}</span>
                    </div>
                    <p class="text-muted" style="font-size: 0.85rem; margin-bottom: 1.5rem;"><span${descAttr}>${item.descripcion || ""}</span></p>
                    ${perfilHTML}
                    <div class="catalog-actions">
                        <button onclick="openMatchDrawer()" class="btn btn-dark" data-i18n="catalog_btn_request">Solicitar Ficha Detallada</button>
                        <button type="button" class="btn btn-details" onclick="openFichaModal(this)" data-i18n="catalog_btn_details">Detalles</button>
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

        // Re-aplicar idioma activo inmediatamente tras renderizar
        const activeLang = localStorage.getItem("vm_lang_pref") || (window.currentLang || "es");
        if (typeof window.applyLanguage === "function") {
            window.applyLanguage(activeLang);
        } else if (typeof window.setLanguage === "function") {
            window.setLanguage(activeLang);
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
