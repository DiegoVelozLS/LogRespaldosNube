-- ===============================================
-- FASE 5: LIMPIEZA - DESHABILITADA POR SEGURIDAD
-- ===============================================
-- NO EJECUTAR PARA PRODUCCION MIENTRAS QUIERAS CONSERVAR DATOS LEGACY.
--
-- Este archivo se deja como referencia historica. Antes de cualquier limpieza:
-- 1. Verifica migracion con verify_vault_migration.sql
-- 2. Crea respaldo con backup_legacy_vault_data.sql
-- 3. Confirma manualmente que ya no necesitas las tablas/funciones antiguas

DO $$
BEGIN
    RAISE EXCEPTION 'Limpieza deshabilitada por seguridad. No se eliminara ningun dato legacy desde este archivo.';
END $$;
