import { describe, expect, it } from '@jest/globals';

import {
  citasPorDia,
  estadoVisible,
  estaPorMarcar,
  fechasDelRango,
  filasDelDia,
  horaBogota,
  moverFecha,
  puedeMarcarAsistida,
  puedeMarcarNoAsistida,
  rangoAgenda,
} from '@/lib/agenda';

// Martes 17 nov 2026, 10:30 a. m. en Bogotá = 15:30 UTC.
const INICIO = '2026-11-17T15:30:00.000Z';
const inicioMs = Date.parse(INICIO);
const MINUTO = 60 * 1000;

describe('estaPorMarcar y estadoVisible (RN-05, D-31)', () => {
  it('una confirmada pasa a Por marcar justo al vencer los 10 minutos', () => {
    const cita = { estado: 'confirmada' as const, inicio: INICIO };
    expect(estaPorMarcar(cita, inicioMs + 10 * MINUTO - 1)).toBe(false);
    expect(estaPorMarcar(cita, inicioMs + 10 * MINUTO)).toBe(true);
    expect(estadoVisible(cita, inicioMs + 9 * MINUTO)).toBe('confirmada');
    expect(estadoVisible(cita, inicioMs + 11 * MINUTO)).toBe('por_marcar');
  });

  it('una por marcar guardada en la base sigue por marcar', () => {
    expect(estaPorMarcar({ estado: 'por_marcar', inicio: INICIO }, inicioMs - MINUTO)).toBe(true);
  });

  it('los demás estados no cambian aunque haya pasado la hora', () => {
    const despues = inicioMs + 60 * MINUTO;
    for (const estado of ['asistida', 'no_asistida', 'cancelada_tarde', 'reagendada'] as const) {
      expect(estadoVisible({ estado, inicio: INICIO }, despues)).toBe(estado);
    }
  });
});

describe('asistencia (RF-23, D-08)', () => {
  const cita = { estado: 'confirmada' as const, inicio: INICIO };

  it('Asistió se habilita desde la hora de inicio', () => {
    expect(puedeMarcarAsistida(cita, inicioMs - 1)).toBe(false);
    expect(puedeMarcarAsistida(cita, inicioMs)).toBe(true);
  });

  it('No asistió solo cuando venció la tolerancia', () => {
    expect(puedeMarcarNoAsistida(cita, inicioMs + 5 * MINUTO)).toBe(false);
    expect(puedeMarcarNoAsistida(cita, inicioMs + 10 * MINUTO)).toBe(true);
    expect(puedeMarcarNoAsistida({ estado: 'por_marcar', inicio: INICIO }, inicioMs + 10 * MINUTO)).toBe(true);
  });

  it('una cita ya marcada o cancelada no se vuelve a marcar', () => {
    const tarde = inicioMs + 30 * MINUTO;
    for (const estado of ['asistida', 'no_asistida', 'cancelada_a_tiempo'] as const) {
      expect(puedeMarcarAsistida({ estado, inicio: INICIO }, tarde)).toBe(false);
      expect(puedeMarcarNoAsistida({ estado, inicio: INICIO }, tarde)).toBe(false);
    }
  });
});

describe('rango de la agenda (RF-21)', () => {
  it('el día va de la fecha a la siguiente; la semana, de lunes a lunes', () => {
    expect(rangoAgenda('dia', '2026-11-17')).toEqual({ desde: '2026-11-17', hasta: '2026-11-18' });
    expect(rangoAgenda('semana', '2026-11-19')).toEqual({ desde: '2026-11-16', hasta: '2026-11-23' });
    expect(rangoAgenda('semana', '2026-11-22')).toEqual({ desde: '2026-11-16', hasta: '2026-11-23' });
  });

  it('mover cruza meses y años', () => {
    expect(moverFecha('dia', '2026-11-30', 1)).toBe('2026-12-01');
    expect(moverFecha('semana', '2026-12-28', 1)).toBe('2027-01-04');
    expect(moverFecha('semana', '2026-11-17', -1)).toBe('2026-11-10');
  });

  it('fechasDelRango lista los siete días de la semana', () => {
    const fechas = fechasDelRango(rangoAgenda('semana', '2026-11-17'));
    expect(fechas).toHaveLength(7);
    expect(fechas[0]).toBe('2026-11-16');
    expect(fechas[6]).toBe('2026-11-22');
  });
});

describe('filas del día', () => {
  // 9:00, 13:00 y 10:30 en Bogotá.
  const a = { id: 'a', inicio: '2026-11-17T14:00:00.000Z' };
  const b = { id: 'b', inicio: '2026-11-17T18:00:00.000Z' };
  const c = { id: 'c', inicio: '2026-11-17T15:30:00.000Z' };

  it('ordena por hora y pone el almuerzo entre la mañana y la tarde', () => {
    const filas = filasDelDia([b, a, c]);
    expect(filas.map((f) => (f.tipo === 'cita' ? f.cita.id : 'almuerzo'))).toEqual([
      'a',
      'c',
      'almuerzo',
      'b',
    ]);
  });

  it('un día sin citas muestra solo el almuerzo', () => {
    expect(filasDelDia([])).toEqual([{ tipo: 'almuerzo' }]);
  });

  it('la hora y el día se leen en Bogotá, no en UTC', () => {
    expect(horaBogota(INICIO)).toBe('10:30 a. m.');
    // 8:00 p. m. del 17 en Bogotá es 01:00 UTC del 18.
    const noche = { id: 'n', inicio: '2026-11-18T01:00:00.000Z' };
    const grupos = citasPorDia([noche], ['2026-11-17', '2026-11-18']);
    expect(grupos[0]?.citas).toEqual([noche]);
    expect(grupos[1]?.citas).toEqual([]);
  });
});
