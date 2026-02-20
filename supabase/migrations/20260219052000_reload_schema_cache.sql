-- Reload PostgREST schema cache so it recognizes the new 'requirements' column
NOTIFY pgrst, 'reload schema';
