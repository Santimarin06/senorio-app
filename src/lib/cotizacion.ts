// Cotizador de productos (RF-10, RF-11, RN-11): filtro del catálogo y total de la bolsa.
// Precios fijos del catálogo; solo se cotiza, no se paga en la app.
import { filtrarPorTexto } from '@/lib/busqueda';
import { limitarCantidad } from '@/lib/cantidad';
import type { CategoriaProducto, Producto } from '@/types/entidades';

/** 'todos' muestra el catálogo completo; las otras opciones filtran por categoría. */
export type FiltroCategoria = 'todos' | CategoriaProducto;

/** Productos de la categoría elegida que además coinciden con la búsqueda. */
export const filtrarProductos = (
  productos: readonly Producto[],
  categoria: FiltroCategoria,
  consulta: string,
): Producto[] => {
  const deCategoria =
    categoria === 'todos' ? productos : productos.filter((p) => p.categoria === categoria);
  return filtrarPorTexto(deCategoria, consulta, (p) => [p.nombre, p.descripcion]);
};

export interface LineaCotizacion {
  precio: number;
  cantidad: number;
}

/** Subtotal de un producto: precio fijo × cantidad (la cantidad se ajusta de 1 a 10). */
export const subtotalLinea = (linea: LineaCotizacion): number =>
  Math.round(linea.precio) * limitarCantidad(linea.cantidad);

/** Total de la bolsa y número de unidades. Es el único lugar donde se suma la cotización. */
export const totalCotizacion = (
  lineas: readonly LineaCotizacion[],
): { total: number; unidades: number } =>
  lineas.reduce(
    (acumulado, linea) => ({
      total: acumulado.total + subtotalLinea(linea),
      unidades: acumulado.unidades + limitarCantidad(linea.cantidad),
    }),
    { total: 0, unidades: 0 },
  );
