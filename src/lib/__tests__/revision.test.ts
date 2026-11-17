import { describe, expect, it } from '@jest/globals';

import {
  desgloseDevolucion,
  efectoRevision,
  NOTA_RECHAZO_MAX,
  plazoNoAsistida,
  tieneDevolucion,
  validarNotaRechazo,
} from '@/lib/revision';

describe('efectoRevision (RN-09)', () => {
  it('ejemplo del mockup: total $65.000, abono $20.000', () => {
    expect(efectoRevision(65_000, 0, 20_000)).toEqual({
      anticipoSiAprueba: 20_000,
      saldoSiAprueba: 45_000,
      saldoSiRechaza: 65_000,
    });
  });

  it('el pago total deja el saldo en 0', () => {
    expect(efectoRevision(35_000, 0, 35_000).saldoSiAprueba).toBe(0);
  });
});

describe('validarNotaRechazo', () => {
  it('exige un motivo sin espacios sobrantes', () => {
    expect(validarNotaRechazo('   ')).toEqual({ ok: false, error: 'Escribe el motivo del rechazo.' });
    expect(validarNotaRechazo('  No llegó el ingreso ')).toEqual({ ok: true, nota: 'No llegó el ingreso' });
  });

  it('limita el largo', () => {
    expect(validarNotaRechazo('a'.repeat(NOTA_RECHAZO_MAX)).ok).toBe(true);
    expect(validarNotaRechazo('a'.repeat(NOTA_RECHAZO_MAX + 1)).ok).toBe(false);
  });
});

describe('desgloseDevolucion (RN-15, RN-16, D-27)', () => {
  it('cancelada a tiempo: anticipo − $2.000', () => {
    expect(desgloseDevolucion('cancelada_a_tiempo', 20_000)).toEqual({
      multaDescontada: 0,
      costoDevolucion: 2_000,
      devolucion: 18_000,
    });
  });

  it('cancelada tarde: anticipo − multa − $2.000', () => {
    expect(desgloseDevolucion('cancelada_tarde', 20_000)).toEqual({
      multaDescontada: 10_000,
      costoDevolucion: 2_000,
      devolucion: 8_000,
    });
  });

  it('no asistida: sobrante − $2.000', () => {
    expect(desgloseDevolucion('no_asistida', 15_000)).toEqual({
      multaDescontada: 10_000,
      costoDevolucion: 2_000,
      devolucion: 3_000,
    });
  });

  it('nunca devuelve menos de 0', () => {
    expect(desgloseDevolucion('no_asistida', 11_000).devolucion).toBe(0);
    expect(desgloseDevolucion('no_asistida', 10_000)).toEqual({
      multaDescontada: 10_000,
      costoDevolucion: 0,
      devolucion: 0,
    });
    expect(desgloseDevolucion('cancelada_tarde', 10_000).devolucion).toBe(0);
  });
});

describe('tieneDevolucion', () => {
  it('solo canceladas y no asistidas', () => {
    expect(tieneDevolucion('cancelada_a_tiempo')).toBe(true);
    expect(tieneDevolucion('no_asistida')).toBe(true);
    expect(tieneDevolucion('asistida')).toBe(false);
    expect(tieneDevolucion('reagendada')).toBe(false);
  });
});

describe('plazoNoAsistida (RN-16, D-27)', () => {
  // Cita el martes 17 nov 2026 a las 9:00 p. m. de Bogotá = 18 nov 02:00 UTC.
  const inicio = '2026-11-18T02:00:00Z';

  it('el plazo se cuenta en fechas de Bogotá, no en UTC', () => {
    expect(plazoNoAsistida(inicio, Date.parse('2026-11-18T03:00:00Z')).hasta).toBe('2026-11-19');
  });

  it('dentro de los 2 días sigue en plazo; al tercero vence', () => {
    // 19 nov, 11:00 p. m. de Bogotá.
    expect(plazoNoAsistida(inicio, Date.parse('2026-11-20T04:00:00Z')).enPlazo).toBe(true);
    // 20 nov, 12:30 a. m. de Bogotá.
    expect(plazoNoAsistida(inicio, Date.parse('2026-11-20T05:30:00Z')).enPlazo).toBe(false);
  });
});
