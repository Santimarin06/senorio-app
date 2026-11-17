import { describe, expect, it } from '@jest/globals';

import { codigoCita } from '@/lib/codigoCita';
import { filtrarProductos, subtotalLinea, totalCotizacion } from '@/lib/cotizacion';
import { formatoCOP } from '@/lib/dinero';
import { enlaceWhatsApp, mensajeCotizacion } from '@/lib/whatsapp';
import type { Producto } from '@/types/entidades';

const producto = (p: Partial<Producto> & Pick<Producto, 'id' | 'nombre'>): Producto => ({
  descripcion: '',
  precio: 10000,
  foto: null,
  categoria: 'cabello',
  ...p,
});

const catalogo: Producto[] = [
  producto({
    id: '1',
    nombre: 'Pomada mate',
    descripcion: 'Fijación media',
    categoria: 'cabello',
  }),
  producto({
    id: '2',
    nombre: 'Aceite para barba',
    descripcion: 'Cuidado diario',
    categoria: 'barba',
  }),
  producto({
    id: '3',
    nombre: 'Champú',
    descripcion: 'Limpieza suave',
    categoria: 'cabello',
  }),
  producto({ id: '4', nombre: 'Peine', categoria: null }),
];

describe('filtrarProductos (RF-11)', () => {
  it('"todos" sin búsqueda devuelve el catálogo completo', () => {
    expect(filtrarProductos(catalogo, 'todos', '')).toHaveLength(4);
  });

  it('filtra por categoría', () => {
    expect(filtrarProductos(catalogo, 'barba', '').map((p) => p.id)).toEqual(['2']);
    expect(filtrarProductos(catalogo, 'cabello', '').map((p) => p.id)).toEqual(['1', '3']);
  });

  it('combina categoría y búsqueda, sin tildes ni mayúsculas', () => {
    expect(filtrarProductos(catalogo, 'cabello', 'CHAMPU').map((p) => p.id)).toEqual(['3']);
    expect(filtrarProductos(catalogo, 'barba', 'champu')).toEqual([]);
  });

  it('busca también en la descripción', () => {
    expect(filtrarProductos(catalogo, 'todos', 'fijacion').map((p) => p.id)).toEqual(['1']);
  });
});

describe('totalCotizacion (RF-10, RN-11)', () => {
  it('subtotal = precio × cantidad', () => {
    expect(subtotalLinea({ precio: 28000, cantidad: 2 })).toBe(56000);
  });

  it('suma subtotales y unidades', () => {
    const r = totalCotizacion([
      { precio: 28000, cantidad: 2 },
      { precio: 24000, cantidad: 1 },
    ]);
    expect(r).toEqual({ total: 80000, unidades: 3 });
    expect(formatoCOP(r.total)).toBe('$80.000');
  });

  it('la bolsa vacía vale $0', () => {
    expect(totalCotizacion([])).toEqual({ total: 0, unidades: 0 });
  });

  it('ajusta cantidades fuera de 1 a 10', () => {
    expect(subtotalLinea({ precio: 1000, cantidad: 15 })).toBe(10000);
    expect(subtotalLinea({ precio: 1000, cantidad: 0 })).toBe(1000);
  });
});

describe('codigoCita (D-35)', () => {
  it('SB- y los 6 primeros caracteres del id en mayúsculas', () => {
    expect(codigoCita('3f9a1c2b-0d4e-4c6a-9b1f-2e7d8c9a0b1c')).toBe('SB-3F9A1C');
  });

  it('ignora guiones si el id es corto al inicio', () => {
    expect(codigoCita('ab-cdef12')).toBe('SB-ABCDEF');
  });
});

describe('mensajeCotizacion (RF-10)', () => {
  const productos = [
    { nombre: 'Pomada mate', precio: 28000, cantidad: 2 },
    { nombre: 'Aceite para barba', precio: 24000, cantidad: 1 },
  ];

  it('lleva productos, cantidades, subtotales y total', () => {
    const m = mensajeCotizacion({ productos });
    expect(m).toContain('- Pomada mate x2: $56.000');
    expect(m).toContain('- Aceite para barba x1: $24.000');
    expect(m).toContain('Total: $80.000');
    expect(m).toContain('no una compra');
    expect(m).not.toContain('cita');
  });

  it('incluye la cita si se asoció', () => {
    const m = mensajeCotizacion({
      productos,
      cita: {
        codigo: 'SB-3F9A1C',
        fechaHora: 'viernes 20 de noviembre, 3:00 p. m.',
        profesional: 'Mario',
      },
    });
    expect(m).toContain('mi cita SB-3F9A1C del viernes 20 de noviembre, 3:00 p. m. con Mario');
  });

  it('se abre con enlaceWhatsApp sin perder el texto', () => {
    const m = mensajeCotizacion({ productos });
    expect(decodeURIComponent(enlaceWhatsApp(m).split('text=')[1] ?? '')).toBe(m);
  });
});
