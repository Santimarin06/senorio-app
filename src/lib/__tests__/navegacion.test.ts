import { describe, expect, it } from '@jest/globals';

import { formatoFechaHoraBogota } from '@/lib/fechas';
import { entradaActiva, entradasDrawer, puedeEntrar, rutaInicial } from '@/lib/navegacion';
import { mapCita, separarCitas } from '@/models/cita.mapper';
import type { Cita } from '@/types/entidades';

describe('navegación por rol', () => {
  it('cada rol llega a su primera tab', () => {
    expect(rutaInicial('cliente')).toBe('/inicio');
    expect(rutaInicial('profesional')).toBe('/panel/mi-agenda');
    expect(rutaInicial('administrador')).toBe('/panel/agenda');
  });

  it('el Drawer muestra la sección del rol y los accesos complementarios, sin las de otros roles', () => {
    const claves = (rol: Parameters<typeof entradasDrawer>[0]) =>
      entradasDrawer(rol).map((e) => e.clave);

    expect(claves('cliente')).toEqual(['inicio', 'mapa', 'politica', 'privacidad']);
    expect(claves('profesional')).toEqual(['mi-agenda', 'mapa', 'politica', 'privacidad']);
    expect(claves('administrador')).toEqual(['agenda', 'mapa', 'politica', 'privacidad']);
    expect(claves('cliente')).not.toContain('agenda');
  });

  it('resalta el acceso complementario en su ruta y la sección principal en el resto', () => {
    const entradas = entradasDrawer('cliente');
    expect(entradaActiva(entradas, '/mapa')).toBe('mapa');
    expect(entradaActiva(entradas, '/cita/abc/cancelar')).toBe('inicio');
    expect(entradaActiva(entradas, '/productos')).toBe('inicio');
    expect(entradaActiva([], '/mapa')).toBeNull();
  });

  it('solo entra a una sección quien tiene ese rol', () => {
    expect(puedeEntrar('cliente', 'cliente')).toBe(true);
    expect(puedeEntrar('cliente', 'administrador')).toBe(false);
    expect(puedeEntrar(undefined, 'cliente')).toBe(false);
  });
});

describe('formatoFechaHoraBogota', () => {
  it('convierte de UTC a hora de Bogotá (UTC-5)', () => {
    expect(formatoFechaHoraBogota('2026-11-16T20:30:00Z')).toBe('lunes 16 de noviembre, 3:30 p. m.');
    // 02:00 UTC del martes sigue siendo lunes en Bogotá.
    expect(formatoFechaHoraBogota('2026-11-17T02:00:00Z')).toBe('lunes 16 de noviembre, 9:00 p. m.');
    expect(formatoFechaHoraBogota('2026-11-16T17:00:00Z')).toBe('lunes 16 de noviembre, 12:00 m.');
  });

  it('devuelve texto vacío si la fecha no es válida', () => {
    expect(formatoFechaHoraBogota('no-es-fecha')).toBe('');
  });
});

describe('mapCita', () => {
  const base = {
    id: '1',
    inicio: '2026-11-16T20:30:00Z',
    fin: '2026-11-16T21:10:00Z',
    estado: 'confirmada',
    total: 25000.4,
    profesionales: { nombre: 'Mario' },
  };

  it('convierte la respuesta al modelo interno con el total entero', () => {
    expect(mapCita(base)).toEqual({
      id: '1',
      inicio: '2026-11-16T20:30:00Z',
      fin: '2026-11-16T21:10:00Z',
      estado: 'confirmada',
      total: 25000,
      profesional: 'Mario',
      servicios: [],
      anticipoAprobado: 0,
    });
  });

  it('un estado desconocido queda por marcar y sin profesional se usa un nombre genérico', () => {
    const cita = mapCita({ ...base, estado: 'otro', profesionales: null });
    expect(cita.estado).toBe('por_marcar');
    expect(cita.profesional).toBe('Profesional');
  });

  it('trae los servicios y solo suma los anticipos aprobados (RN-09)', () => {
    const cita = mapCita({
      ...base,
      cita_servicios: [{ nombre: 'Corte', precio: 25000, duracion_min: 40 }],
      comprobantes: [
        { monto: 10000, estado: 'aprobado' },
        { monto: 15000, estado: 'pendiente' },
        { monto: 5000, estado: 'rechazado' },
      ],
    });
    expect(cita.servicios).toEqual([{ nombre: 'Corte', precio: 25000, duracionMin: 40 }]);
    expect(cita.anticipoAprobado).toBe(10000);
  });
});

describe('separarCitas (RF-08)', () => {
  const cita = (id: string, inicio: string, estado: Cita['estado']): Cita => ({
    id,
    inicio,
    fin: new Date(Date.parse(inicio) + 40 * 60_000).toISOString(),
    estado,
    total: 25000,
    profesional: 'Mario',
    servicios: [],
    anticipoAprobado: 0,
  });
  const ahora = Date.parse('2026-11-17T15:00:00Z');

  it('próximas en orden de llegada; pasadas y canceladas de la más reciente a la más antigua', () => {
    const { proximas, pasadas } = separarCitas(
      [
        cita('futura-lejana', '2026-11-20T15:00:00Z', 'confirmada'),
        cita('futura-cercana', '2026-11-18T15:00:00Z', 'confirmada'),
        cita('en-curso', '2026-11-17T14:45:00Z', 'confirmada'),
        cita('cancelada', '2026-11-19T15:00:00Z', 'cancelada_a_tiempo'),
        cita('vieja', '2026-11-10T15:00:00Z', 'asistida'),
        cita('ayer', '2026-11-16T15:00:00Z', 'no_asistida'),
      ],
      ahora,
    );
    expect(proximas.map((c) => c.id)).toEqual(['en-curso', 'futura-cercana', 'futura-lejana']);
    expect(pasadas.map((c) => c.id)).toEqual(['cancelada', 'ayer', 'vieja']);
  });
});
