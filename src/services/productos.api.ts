// Acciones HTTP de productos: lectura del cliente (RF-10) y gestión del administrador (RF-27).
// La RLS solo deja al administrador ver los inactivos y escribir. Cada escritura pide la fila de
// vuelta: si no llega, nada se guardó y se lanza un error (RN-12).
import { FOTOS } from '@/config/negocio';
import { env } from '@/config/env';
import { mapProducto, mapProductoGestion, productoACuerpo } from '@/models/producto.mapper';
import { storageApi } from '@/services/api/storage-api';
import { supabaseApi } from '@/services/api/supabase-api';
import type { ProductoRespuesta } from '@/types/api';
import type {
  ImagenComprobante,
  Producto,
  ProductoFormulario,
  ProductoGestion,
} from '@/types/entidades';

const SELECT_PRODUCTO = 'id,nombre,descripcion,categoria,precio,foto_url,activo';
const devolverFila = { Prefer: 'return=representation' };

export const getProductos = async (): Promise<Producto[]> => {
  const { data } = await supabaseApi.get<ProductoRespuesta[]>('/productos', {
    params: { select: SELECT_PRODUCTO, activo: 'eq.true', order: 'nombre.asc' },
  });
  return data.map(mapProducto);
};

/** Todos los productos, activos e inactivos (solo el administrador recibe los inactivos). */
export const getProductosGestion = async (): Promise<ProductoGestion[]> => {
  const { data } = await supabaseApi.get<ProductoRespuesta[]>('/productos', {
    params: { select: SELECT_PRODUCTO, order: 'nombre.asc' },
  });
  return data.map(mapProductoGestion);
};

const primeraFila = (data: ProductoRespuesta[]): ProductoGestion => {
  const fila = data[0];
  if (!fila) throw new Error('No encontramos este producto.');
  return mapProductoGestion(fila);
};

/** Crea (id null) o edita un producto. */
export const guardarProducto = async (
  id: string | null,
  f: ProductoFormulario,
): Promise<ProductoGestion> => {
  const cuerpo = productoACuerpo(f);
  const opciones = { params: { select: SELECT_PRODUCTO }, headers: devolverFila };
  if (id === null) {
    const { data } = await supabaseApi.post<ProductoRespuesta[]>('/productos', cuerpo, opciones);
    return primeraFila(data);
  }
  const { data } = await supabaseApi.patch<ProductoRespuesta[]>('/productos', cuerpo, {
    ...opciones,
    params: { ...opciones.params, id: `eq.${id}` },
  });
  return primeraFila(data);
};

/** Desactiva o reactiva un producto. Nunca se borra. */
export const cambiarActivoProducto = async (id: string, activo: boolean): Promise<void> => {
  const { data } = await supabaseApi.patch<{ id: string }[]>(
    '/productos',
    { activo },
    { params: { id: `eq.${id}`, select: 'id' }, headers: devolverFila },
  );
  if (data.length === 0) throw new Error('No encontramos este producto.');
};

/** URL pública de un archivo del bucket "fotos" (lectura sin sesión). */
export const urlPublicaFoto = (ruta: string): string =>
  `${env.supabaseUrl}/storage/v1/object/public/${FOTOS.bucket}/${ruta}`;

/**
 * Sube una foto del catálogo (producto o profesional, RF-27 y RF-29) ya validada (JPG o PNG)
 * y devuelve su URL pública. Igual que el comprobante:
 * bytes como ArrayBuffer y x-upsert en false, así nunca pisa otro archivo.
 */
export const subirFoto = async (ruta: string, imagen: ImagenComprobante): Promise<string> => {
  await storageApi.post(`/object/${FOTOS.bucket}/${ruta}`, imagen.bytes, {
    headers: { 'Content-Type': imagen.mime, 'x-upsert': 'false' },
  });
  return urlPublicaFoto(ruta);
};
