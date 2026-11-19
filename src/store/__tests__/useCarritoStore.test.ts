import { beforeEach, describe, expect, it } from '@jest/globals';

import { totalCotizacion } from '@/lib/cotizacion';
import { useCarritoStore } from '@/store/useCarritoStore';
import type { Producto } from '@/types/entidades';

const producto: Producto = {
  id: 'pomada',
  nombre: 'Pomada mate',
  descripcion: 'Fijación media',
  precio: 28000,
  foto: null,
  categoria: 'cabello',
};

describe('useCarritoStore: agregar productos', () => {
  beforeEach(() => useCarritoStore.setState({ items: [] }));

  it('incrementa cantidades sin duplicar filas y respeta el máximo', () => {
    useCarritoStore.getState().agregar(producto);
    expect(useCarritoStore.getState().items).toHaveLength(1);
    expect(useCarritoStore.getState().items[0]?.cantidad).toBe(1);

    useCarritoStore.getState().agregar(producto);
    expect(useCarritoStore.getState().items).toHaveLength(1);
    expect(useCarritoStore.getState().items[0]?.cantidad).toBe(2);

    for (let i = 0; i < 20; i += 1) {
      useCarritoStore.getState().agregar(producto);
    }

    const items = useCarritoStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0]?.cantidad).toBe(10);
    expect(
      totalCotizacion(items.map((i) => ({ precio: i.producto.precio, cantidad: i.cantidad }))),
    ).toEqual({ total: 280000, unidades: 10 });
  });
});
