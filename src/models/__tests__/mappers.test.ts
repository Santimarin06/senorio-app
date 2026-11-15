import { describe, expect, it } from '@jest/globals';

import { mapProducto } from '@/models/producto.mapper';
import { mapProfesional, mapProfesionalDetalle } from '@/models/profesional.mapper';

describe('mapProfesional', () => {
  it('convierte snake_case a camelCase y aplica valores por defecto', () => {
    expect(
      mapProfesional({ id: '1', nombre: 'Mario', cargo: null, foto_url: '', activo: true }),
    ).toEqual({ id: '1', nombre: 'Mario', cargo: 'Profesional', foto: null });
  });

  it('el detalle solo incluye servicios activos y redondea precios a enteros', () => {
    const detalle = mapProfesionalDetalle({
      id: '1',
      nombre: 'Rosmery',
      cargo: 'Estética',
      foto_url: 'https://ejemplo.com/foto.jpg',
      activo: true,
      servicios: [
        {
          id: 'a',
          nombre: 'Mascarilla sencilla',
          descripcion: null,
          duracion_min: 30,
          precio: 15000.4,
          es_adicional: false,
          activo: true,
        },
        {
          id: 'b',
          nombre: 'Retirado',
          descripcion: null,
          duracion_min: 10,
          precio: 1000,
          es_adicional: false,
          activo: false,
        },
      ],
    });
    expect(detalle.foto).toBe('https://ejemplo.com/foto.jpg');
    expect(detalle.servicios).toEqual([
      {
        id: 'a',
        nombre: 'Mascarilla sencilla',
        descripcion: '',
        duracionMin: 30,
        precio: 15000,
        esAdicional: false,
      },
    ]);
  });

  it('servicios null queda como lista vacía', () => {
    const detalle = mapProfesionalDetalle({
      id: '1',
      nombre: 'X',
      cargo: 'Barbero',
      foto_url: null,
      activo: true,
      servicios: null,
    });
    expect(detalle.servicios).toEqual([]);
  });
});

describe('mapProducto', () => {
  it('foto vacía queda en null', () => {
    expect(
      mapProducto({ id: 'p', nombre: 'Cera', descripcion: null, precio: 30000, foto_url: '  ', activo: true }),
    ).toEqual({ id: 'p', nombre: 'Cera', descripcion: '', precio: 30000, foto: null });
  });
});
