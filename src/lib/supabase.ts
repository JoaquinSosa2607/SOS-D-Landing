import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.PUBLIC_SUPABASE_URL;
const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

// El cliente es null si no hay credenciales configuradas (modo demo/placeholder)
export const supabase = url && key ? createClient(url, key) : null;
