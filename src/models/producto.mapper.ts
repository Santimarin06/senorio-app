import type { ProductoCuerpo, ProductoRespuesta } from '@/types/api';
import type {
  CategoriaProducto,
  Producto,
  ProductoFormulario,
  ProductoGestion,
} from '@/types/entidades';

const aCategoria = (valor: string): CategoriaProducto | null =>
  valor === 'cabello' || valor === 'barba' ? valor : null;

export const mapProducto = (producto: ProductoRespuesta): Producto => ({
  id: producto.id,
  nombre: producto.nombre,
  descripcion: producto.descripcion ?? '',
  precio: Math.round(producto.precio),
  foto: producto.foto_url && producto.foto_url.trim() !== '' ? producto.foto_url : null,
  categoria: aCategoria(producto.categoria),
});

/** Respuesta de la gestión (RF-27): incluye si está activo. */
export const mapProductoGestion = (producto: ProductoRespuesta): ProductoGestion => ({
  ...mapProducto(producto),
  activo: producto.activo,
});

/** Mapper inverso (modelo → API): cuerpo de productos. Descripción o foto vacías = null. */
export const productoACuerpo = (f: ProductoFormulario): ProductoCuerpo => ({
  nombre: f.nombre.trim(),
  descripcion: f.descripcion.trim() === '' ? null : f.descripcion.trim(),
  categoria: f.categoria,
  precio: f.precio,
  foto_url: f.foto && f.foto.trim() !== '' ? f.foto : null,
});
