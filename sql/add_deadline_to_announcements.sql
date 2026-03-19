-- Add deadline column to announcements table
ALTER TABLE public.announcements 
ADD COLUMN IF NOT EXISTS deadline TIMESTAMPTZ;

-- Optional: Update description for the new column
COMMENT ON COLUMN public.announcements.deadline IS 'Plazo final o fecha límite para el anuncio';
