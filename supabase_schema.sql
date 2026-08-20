-- ==============================================================================
-- VALOR MAXIMO — ESQUEMA DE BASE DE DATOS SUPABASE PARA CATALOGO DE INMUEBLES
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.inmuebles (
    id TEXT PRIMARY KEY,
    order_num INTEGER NOT NULL DEFAULT 1,
    active BOOLEAN NOT NULL DEFAULT true,
    titulo TEXT NOT NULL,
    subtitulo TEXT,
    badge_text TEXT NOT NULL DEFAULT 'DISPONIBLE',
    badge_type TEXT NOT NULL DEFAULT 'badge-open',
    descripcion TEXT,
    perfil_label TEXT DEFAULT 'Perfil Empresarial',
    perfil_texto TEXT,
    portada TEXT NOT NULL,
    ubicacion JSONB DEFAULT '{"embed":"","link":""}'::jsonb,
    fotos JSONB DEFAULT '[]'::jsonb,
    tabla JSONB DEFAULT '[]'::jsonb,
    encabezados_locales JSONB DEFAULT '[]'::jsonb,
    locales JSONB DEFAULT '[]'::jsonb,
    notas_pie JSONB DEFAULT '[]'::jsonb,
    datos_generales JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

ALTER TABLE public.inmuebles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir lectura publica de inmuebles" ON public.inmuebles;
CREATE POLICY "Permitir lectura publica de inmuebles"
    ON public.inmuebles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir insercion solo a administradores autenticados" ON public.inmuebles;
CREATE POLICY "Permitir insercion solo a administradores autenticados"
    ON public.inmuebles FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir actualizacion solo a administradores autenticados" ON public.inmuebles;
CREATE POLICY "Permitir actualizacion solo a administradores autenticados"
    ON public.inmuebles FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir eliminacion solo a administradores autenticados" ON public.inmuebles;
CREATE POLICY "Permitir eliminacion solo a administradores autenticados"
    ON public.inmuebles FOR DELETE TO authenticated USING (true);
