import { mapProducto } from '@/models/producto.mapper';
import { supabaseApi } from '@/services/api/supabase-api';
import type { ProductoRespuesta } from '@/types/api';
import type { Producto } from '@/types/entidades';

export const getProductos = async (): Promise<Producto[]> => {
  const { data } = await supabaseApi.get<ProductoRespuesta[]>('/productos', {
    params: { select: '*', activo: 'eq.true', order: 'nombre.asc' },
  });
  return data.map(mapProducto);
};
