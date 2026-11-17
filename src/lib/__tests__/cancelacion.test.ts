import { describe, expect, it } from '@jest/globals';

import { horasHasta, limiteSinMulta, puedeCancelar, textoTiempoRestante } from '@/lib/cancelacion';
import { consecuenciaCancelacion } from '@/lib/finanzas';

// Viernes 20 nov 2026, 3:00 p. m. en Bogotá = 20:00 UTC.
const INICIO = '2026-11-20T20:00:00.000Z';
const inicioMs = Date.parse(INICIO);
const HORA = 60 * 60 * 1000;

describe('puedeCancelar (RF-09)', () => {
  it('solo confirmada o por marcar, antes de empezar', () => {
    expect(puedeCancelar({ estado: 'confirmada', inicio: INICIO }, inicioMs - HORA)).toBe(true);
    expect(puedeCancelar({ estado: 'por_marcar', inicio: INICIO }, inicioMs - 1)).toBe(true);
    expect(puedeCancelar({ estado: 'confirmada', inicio: INICIO }, inicioMs)).toBe(false);
    expect(puedeCancelar({ estado: 'cancelada_a_tiempo', inicio: INICIO }, inicioMs - HORA)).toBe(false);
    expect(puedeCancelar({ estado: 'asistida', inicio: INICIO }, inicioMs - HORA)).toBe(false);
    expect(puedeCancelar({ estado: 'reagendada', inicio: INICIO }, inicioMs - HORA)).toBe(false);
  });
});

describe('horasHasta y límite sin multa', () => {
  it('cuenta horas con instantes absolutos', () => {
    expect(horasHasta(INICIO, inicioMs - 3 * HORA)).toBe(3);
    expect(horasHasta(INICIO, inicioMs + HORA)).toBe(-1);
  });

  it('el límite es 4 horas antes del inicio (11:00 a. m. en Bogotá)', () => {
    expect(limiteSinMulta(INICIO)).toBe('2026-11-20T16:00:00.000Z');
  });
});

describe('textoTiempoRestante', () => {
  it('muestra días, horas y minutos', () => {
    expect(textoTiempoRestante(3 + 20 / 60)).toBe('Faltan 3 h 20 min');
    expect(textoTiempoRestante(3)).toBe('Faltan 3 h');
    expect(textoTiempoRestante(0.75)).toBe('Faltan 45 min');
    expect(textoTiempoRestante(28)).toBe('Faltan 1 día y 4 h');
    expect(textoTiempoRestante(48)).toBe('Faltan 2 días');
    expect(textoTiempoRestante(0)).toBe('La cita ya empezó');
  });
});

describe('consecuenciaCancelacion con el resultado de la base (RN-15, D-28)', () => {
  it('tardía con anticipo de $20.000: recibe $8.000 y la multa queda cubierta', () => {
    const r = consecuenciaCancelacion({ anticipoAprobado: 20000, tardia: true, reagenda: false });
    expect(r).toMatchObject({ multa: 10000, multaPendiente: 0, costoDevolucion: 2000, devolucion: 8000 });
  });

  it('tardía sin anticipo: queda la multa pendiente', () => {
    const r = consecuenciaCancelacion({ anticipoAprobado: 0, tardia: true, reagenda: false });
    expect(r).toMatchObject({ multa: 10000, multaPendiente: 10000, devolucion: 0 });
  });

  it('a tiempo con anticipo: anticipo − $2.000', () => {
    const r = consecuenciaCancelacion({ anticipoAprobado: 20000, tardia: false, reagenda: false });
    expect(r).toMatchObject({ multa: 0, costoDevolucion: 2000, devolucion: 18000 });
  });
});
