import { describe, expect, it } from '@jest/globals';

import {
  coincideServicio,
  entradaDeServicio,
  ordenarGestion,
  resumenServicio,
  rutaFotoProducto,
  validarDuracion,
  validarPrecio,
  validarProducto,
  validarServicio,
  type EntradaServicio,
} from '@/lib/gestion';
import type { ServicioGestion } from '@/types/entidades';

const activos = new Set(['p1', 'p2']);

const base: EntradaServicio = {
  nombre: 'Corte clásico',
  descripcion: '',
  duracion: '45',
  precio: '35.000',
  esAdicional: false,
  profesionales: ['p1'],
};

describe('validarDuracion', () => {
  it('acepta enteros mayores que 0', () => {
    expect(validarDuracion(' 45 ')).toEqual({ ok: true, valor: 45 });
  });
  it.each([
    ['', 'Escribe la duración en minutos.'],
    ['0', 'La duración debe ser mayor que 0 minutos.'],
    ['45,5', 'La duración debe ser un número entero de minutos, por ejemplo 45.'],
    ['-10', 'La duración debe ser un número entero de minutos, por ejemplo 45.'],
    ['481', 'La duración no puede pasar de 480 minutos.'],
  ])('rechaza %p con un mensaje específico', (texto, error) => {
    expect(validarDuracion(texto)).toEqual({ ok: false, error });
  });
});

describe('validarPrecio', () => {
  it('acepta 0 y miles con punto', () => {
    expect(validarPrecio('0')).toEqual({ ok: true, valor: 0 });
    expect(validarPrecio('$ 35.000')).toEqual({ ok: true, valor: 35000 });
  });
  it('rechaza vacío, negativos y decimales', () => {
    expect(validarPrecio('')).toEqual({ ok: false, error: 'Escribe el precio en pesos.' });
    expect(validarPrecio('-5000')).toEqual({ ok: false, error: 'El precio no puede ser negativo.' });
    expect(validarPrecio('35000,5')).toMatchObject({ ok: false });
  });
});

describe('validarServicio', () => {
  it('devuelve el formulario limpio cuando todo es válido', () => {
    expect(validarServicio({ ...base, nombre: '  Corte ', profesionales: ['p1', 'p1'] }, activos)).toEqual({
      ok: true,
      valor: {
        nombre: 'Corte',
        descripcion: '',
        duracionMin: 45,
        precio: 35000,
        esAdicional: false,
        profesionales: ['p1'],
      },
    });
  });

  it('marca cada campo con su error', () => {
    const r = validarServicio({ ...base, nombre: ' ', duracion: '0', precio: '-1', profesionales: [] }, activos);
    expect(r).toEqual({
      ok: false,
      errores: {
        nombre: 'El nombre es obligatorio.',
        duracion: 'La duración debe ser mayor que 0 minutos.',
        precio: 'El precio no puede ser negativo.',
        profesionales: 'Elige al menos un profesional que preste el servicio.',
      },
    });
  });

  it('un profesional inactivo solo no basta, pero se conserva junto a uno activo', () => {
    expect(validarServicio({ ...base, profesionales: ['inactivo'] }, activos)).toMatchObject({ ok: false });
    const r = validarServicio({ ...base, profesionales: ['inactivo', 'p2'] }, activos);
    expect(r.ok && r.valor.profesionales).toEqual(['inactivo', 'p2']);
  });

  it('el adicional también exige duración mayor que 0', () => {
    expect(validarServicio({ ...base, esAdicional: true, duracion: '0' }, activos)).toMatchObject({
      ok: false,
      errores: { duracion: 'La duración debe ser mayor que 0 minutos.' },
    });
  });
});

describe('validarProducto', () => {
  it('exige categoría y acepta la foto vacía', () => {
    expect(
      validarProducto({ nombre: 'Cera', descripcion: '', precio: '25000', categoria: null }, null),
    ).toEqual({ ok: false, errores: { categoria: 'Elige la categoría: cabello o barba.' } });
    expect(
      validarProducto({ nombre: 'Cera', descripcion: ' Mate ', precio: '25.000', categoria: 'cabello' }, null),
    ).toEqual({
      ok: true,
      valor: { nombre: 'Cera', descripcion: 'Mate', categoria: 'cabello', precio: 25000, foto: null },
    });
  });

  it('rechaza un nombre demasiado largo', () => {
    expect(
      validarProducto({ nombre: 'x'.repeat(61), descripcion: '', precio: '1', categoria: 'barba' }, null),
    ).toMatchObject({ ok: false, errores: { nombre: 'El nombre admite hasta 60 caracteres.' } });
  });
});

const servicio: ServicioGestion = {
  id: 's1',
  nombre: 'Diseño de barba',
  descripcion: '',
  duracionMin: 20,
  precio: 20000,
  esAdicional: false,
  activo: true,
  profesionales: [
    { id: 'p1', nombre: 'Camilo', activo: true },
    { id: 'p3', nombre: 'Ana', activo: false },
    { id: 'p2', nombre: 'Mario', activo: true },
  ],
};

describe('apoyo de la lista y el formulario', () => {
  it('resume duración y profesionales activos', () => {
    expect(resumenServicio(servicio)).toBe('20 min · Camilo, Mario');
    expect(resumenServicio({ ...servicio, profesionales: [] })).toBe('20 min · Sin profesional activo');
  });

  it('busca sin tildes por nombre o profesional', () => {
    expect(coincideServicio(servicio, 'diseno')).toBe(true);
    expect(coincideServicio(servicio, 'mario')).toBe(true);
    expect(coincideServicio(servicio, 'color')).toBe(false);
  });

  it('el formulario de edición parte de los datos guardados, con los inactivos incluidos', () => {
    expect(entradaDeServicio(servicio)).toEqual({
      nombre: 'Diseño de barba',
      descripcion: '',
      duracion: '20',
      precio: '20000',
      esAdicional: false,
      profesionales: ['p1', 'p3', 'p2'],
    });
  });

  it('ordena activos primero y luego por nombre', () => {
    const lista = [
      { nombre: 'B', activo: false },
      { nombre: 'C', activo: true },
      { nombre: 'A', activo: true },
    ];
    expect(ordenarGestion(lista).map((e) => e.nombre)).toEqual(['A', 'C', 'B']);
  });

  it('la ruta de la foto queda en la carpeta productos con la extensión del tipo real', () => {
    expect(rutaFotoProducto('abc', 1700, 'image/png')).toBe('productos/abc-1700.png');
    expect(rutaFotoProducto(null, 5, 'image/jpeg')).toBe('productos/nuevo-5.jpg');
  });
});
