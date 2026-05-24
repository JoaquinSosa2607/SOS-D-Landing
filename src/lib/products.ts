import { supabase } from './supabase';

export interface Product {
  id: number;
  name: string;
  description: string;
  category: 'futbol' | 'egresados' | 'escolar';
  image_url: string | null;
  active: boolean;
}

export async function getProducts(): Promise<Product[]> {
  if (!supabase) throw new Error('Supabase no está configurado. Revisá el .env');

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('active', true)
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Error al obtener productos: ${error.message}`);
  return (data ?? []) as Product[];
}
