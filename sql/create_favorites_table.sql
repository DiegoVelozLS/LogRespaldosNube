-- =====================================================
-- TABLA DE FAVORITOS - Sistema de Intranet Listosoft
-- Ejecutar en: Supabase > SQL Editor
-- =====================================================

-- 1. Crear tabla de favoritos
CREATE TABLE IF NOT EXISTS public.favorites (
    user_id     UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    item_id     TEXT        NOT NULL,
    type        TEXT        NOT NULL CHECK (type IN ('document', 'folder')),
    name        TEXT        NOT NULL,
    category_id TEXT,
    category_name TEXT,
    description TEXT,
    file_url    TEXT,
    position    INTEGER     NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, item_id)
);

-- 2. Índice para recuperar favoritos ordenados por usuario (consulta más frecuente)
CREATE INDEX IF NOT EXISTS idx_favorites_user_position
    ON public.favorites (user_id, position ASC);

-- 3. Habilitar Row Level Security
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- 4. Política única: cada usuario solo puede ver y modificar SUS propios favoritos
DROP POLICY IF EXISTS "Users can manage their own favorites" ON public.favorites;
CREATE POLICY "Users can manage their own favorites"
    ON public.favorites
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ✅ Listo. Ejecuta este script y la tabla estará lista.
