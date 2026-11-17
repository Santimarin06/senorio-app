import { describe, expect, it } from '@jest/globals';

import { mapProductoGestion, productoACuerpo } from '@/models/producto.mapper';
import { mapServicioGestion, servicioACuerpo } from '@/models/servicio.mapper';

describe('mapServicioGestion', () => {
  it('conserva activo y ordena los profesionales por nombre', () => {
    expect(
      mapServicioGestion({
        id: 's1',
        nombre: 'Corte clásico',
        descripcion: null,
        duracion_min: 45,
        precio: 35000,
        es_adicional: false,
        activo: false,
        profesionales: [
          { id: 'p2', nombre: 'Mario', activo: true },
          { id: 'p1', nombre: 'Camilo', activo: false },
        ],
      }),
    ).toEqual({
      id: 's1',
      nombre: 'Corte clásico',
      descripcion: '',
      duracionMin: 45,
      precio: 35000,
      esAdicional: false,
      activo: false,
      profesionales: [
        { id: 'p1', nombre: 'Camilo', activo: false },
        { id: 'p2', nombre: 'Mario', activo: true },
      ],
    });
  });

  it('sin relación devuelve una lista vacía', () => {
    const s = mapServicioGestion({
      id: 's1',
      nombre: 'Silla relajante',
      descripcion: 'Masaje',
      duracion_min: 10,
      precio: 10000,
      es_adicional: true,
      activo: true,
      profesionales: null,
    });
    expect(s.profesionales).toEqual([]);
    expect(s.esAdicional).toBe(true);
  });
});

describe('servicioACuerpo (modelo → API)', () => {
  const formulario = {
    nombre: '  Corte clásico ',
    descripcion: '   ',
    duracionMin: 45,
    precio: 35000,
    esAdicional: false,
    profesionales: ['p1', 'p2', 'p1'],
  };

  it('arma los parámetros de guardar_servicio para crear', () => {
    expect(servicioACuerpo(null, formulario)).toEqual({
      p_id: null,
      p_nombre: 'Corte clásico',
      p_descripcion: null,
      p_duracion_min: 45,
      p_precio: 35000,
      p_es_adicional: false,
      p_profesionales: ['p1', 'p2'],
    });
  });

  it('para editar lleva el id y la descripción recortada', () => {
    const cuerpo = servicioACuerpo('s1', { ...formulario, descripcion: ' Con lavado ', esAdicional: true });
    expect(cuerpo.p_id).toBe('s1');
    expect(cuerpo.p_descripcion).toBe('Con lavado');
    expect(cuerpo.p_es_adicional).toBe(true);
  });
});

describe('mapProductoGestion y productoACuerpo', () => {
  it('la gestión conserva activo y aplica los valores por defecto del mapper', () => {
    expect(
      mapProductoGestion({
        id: 'x',
        nombre: 'Cera',
        descripcion: null,
        precio: 25000,
        foto_url: '',
        categoria: 'cabello',
        activo: false,
      }),
    ).toEqual({
      id: 'x',
      nombre: 'Cera',
      descripcion: '',
      precio: 25000,
      foto: null,
      categoria: 'cabello',
      activo: false,
    });
  });

  it('el cuerpo usa snake_case y null para lo vacío', () => {
    expect(
      productoACuerpo({ nombre: ' Aceite ', descripcion: '', categoria: 'barba', precio: 0, foto: '  ' }),
    ).toEqual({ nombre: 'Aceite', descripcion: null, categoria: 'barba', precio: 0, foto_url: null });
  });

  it('conserva la URL de la foto', () => {
    const url = 'https://x.supabase.co/storage/v1/object/public/fotos/productos/a-1.jpg';
    expect(
      productoACuerpo({ nombre: 'Aceite', descripcion: 'Para barba', categoria: 'barba', precio: 18000, foto: url })
        .foto_url,
    ).toBe(url);
  });
});
