import { describe, expect, it } from '@jest/globals';

import { filtrarPorTexto, normalizar } from '@/lib/busqueda';
import { limitarCantidad } from '@/lib/cantidad';
import { formatoCOP } from '@/lib/dinero';
import { esUuid } from '@/lib/ids';
import { calcularTotalCita, faltaServicioPrincipal } from '@/lib/reserva';
import type { Servicio } from '@/types/entidades';

const servicio = (parcial: Partial<Servicio>): Servicio => ({
  id: 'x',
  nombre: 'Servicio',
  descripcion: '',
  duracionMin: 0,
  precio: 0,
  esAdicional: false,
  ...parcial,
});

describe('formatoCOP', () => {
  it('pone puntos de miles y no usa decimales', () => {
    expect(formatoCOP(25000)).toBe('$25.000');
    expect(formatoCOP(1500000)).toBe('$1.500.000');
    expect(formatoCOP(0)).toBe('$0');
    expect(formatoCOP(-2000)).toBe('-$2.000');
  });
});

describe('limitarCantidad (1 a 10)', () => {
  it('respeta los límites', () => {
    expect(limitarCantidad(0)).toBe(1);
    expect(limitarCantidad(11)).toBe(10);
    expect(limitarCantidad(5)).toBe(5);
    expect(limitarCantidad(3.7)).toBe(3);
  });
  it('un valor no numérico queda en el mínimo', () => {
    expect(limitarCantidad(Number.NaN)).toBe(1);
    expect(limitarCantidad(Number('abc'))).toBe(1);
  });
});

describe('calcularTotalCita', () => {
  it('suma duración y precio de servicios y adicionales', () => {
    const total = calcularTotalCita([
      servicio({ duracionMin: 40, precio: 25000 }),
      servicio({ duracionMin: 0, precio: 15000, esAdicional: true }),
    ]);
    expect(total).toEqual({ duracionMin: 40, precio: 40000 });
  });
  it('sin servicios es cero', () => {
    expect(calcularTotalCita([])).toEqual({ duracionMin: 0, precio: 0 });
  });
  it('ignora valores negativos', () => {
    expect(calcularTotalCita([servicio({ duracionMin: -5, precio: -100 })])).toEqual({
      duracionMin: 0,
      precio: 0,
    });
  });
});

describe('faltaServicioPrincipal', () => {
  it('detecta un adicional elegido solo', () => {
    expect(faltaServicioPrincipal([servicio({ esAdicional: true })])).toBe(true);
    expect(faltaServicioPrincipal([servicio({ esAdicional: true }), servicio({})])).toBe(false);
    expect(faltaServicioPrincipal([])).toBe(false);
  });
});

describe('búsqueda', () => {
  it('ignora mayúsculas y tildes', () => {
    expect(normalizar('  Uñas ÁRBOL ')).toBe('unas arbol');
    const lista = [{ n: 'Rosmery' }, { n: 'Mario' }];
    expect(filtrarPorTexto(lista, 'rosmery', (e) => [e.n])).toEqual([{ n: 'Rosmery' }]);
    expect(filtrarPorTexto(lista, '', (e) => [e.n])).toHaveLength(2);
    expect(filtrarPorTexto(lista, 'zzz', (e) => [e.n])).toHaveLength(0);
  });
});

describe('esUuid', () => {
  it('acepta uuid y rechaza otros textos', () => {
    expect(esUuid('3f2b8c1e-9a4d-4c7e-8b1a-2d5e6f7a8b9c')).toBe(true);
    expect(esUuid('no-existe')).toBe(false);
    expect(esUuid('')).toBe(false);
  });
});
