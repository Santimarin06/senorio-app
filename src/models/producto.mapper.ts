import type { ProductoRespuesta } from '@/types/api';
import type { Producto } from '@/types/entidades';

export const mapProducto = (producto: ProductoRespuesta): Producto => ({
  id: producto.id,
  nombre: producto.nombre,
  descripcion: producto.descripcion ?? '',
  precio: Math.round(producto.precio),
  foto: producto.foto_url && producto.foto_url.trim() !== '' ? producto.foto_url : null,
});
