// Carrito de cotización (RF-10). Solo cotiza: no hay pago en la app.
import { create } from 'zustand';

import { limitarCantidad } from '@/lib/cantidad';
import type { Producto } from '@/types/entidades';

export interface ItemCarrito {
  producto: Producto;
  cantidad: number;
}

interface CarritoState {
  items: ItemCarrito[];
  agregar: (producto: Producto) => void;
  cambiarCantidad: (productoId: string, cantidad: number) => void;
  quitar: (productoId: string) => void;
  vaciar: () => void;
}

export const useCarritoStore = create<CarritoState>()((set) => ({
  items: [],

  agregar: (producto) =>
    set((estado) => {
      const existe = estado.items.some((i) => i.producto.id === producto.id);
      if (!existe) {
        return { items: [...estado.items, { producto, cantidad: 1 }] };
      }

      return {
        items: estado.items.map((i) =>
          i.producto.id === producto.id ? { ...i, cantidad: limitarCantidad(i.cantidad + 1) } : i,
        ),
      };
    }),

  cambiarCantidad: (productoId, cantidad) =>
    set((estado) => ({
      items: estado.items.map((i) =>
        i.producto.id === productoId ? { ...i, cantidad: limitarCantidad(cantidad) } : i,
      ),
    })),

  quitar: (productoId) =>
    set((estado) => ({
      items: estado.items.filter((i) => i.producto.id !== productoId),
    })),

  vaciar: () => set({ items: [] }),
}));
