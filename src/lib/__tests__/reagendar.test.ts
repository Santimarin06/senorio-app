import { describe, expect, it } from '@jest/globals';

import { estadoEleccionNoAsistencia, opcionReagendar, type CitaReagendable } from '@/lib/reagendar';

// Martes 17 de noviembre de 2026, 10:00 a. m. en Bogotá (15:00 UTC).
const AHORA = Date.parse('2026-11-17T15:00:00Z');

const cita = (c: Partial<CitaReagendable>): CitaReagendable => ({
  estado: 'confirmada',
  inicio: '2026-11-18T15:00:00Z',
  anticipoAprobado: 20_000,
  devolucionElegidaEn: null,
  devolucionRegistrada: false,
  ...c,
});

describe('opcionReagendar: cita futura (RF-14, RN-15)', () => {
  it('con 4 h o más pasa todo el anticipo', () => {
    expect(opcionReagendar(cita({}), AHORA, 0)).toEqual({
      puede: true,
      caso: 'futura',
      trasladado: 20_000,
      diferencia: 0,
    });
    expect(opcionReagendar(cita({ inicio: '2026-11-17T19:00:00Z' }), AHORA, 0).puede).toBe(true);
  });

  it('con menos de 4 h no se reagenda', () => {
    expect(opcionReagendar(cita({ inicio: '2026-11-17T18:59:00Z' }), AHORA, 0).puede).toBe(false);
  });

  it('con multa pendiente no se reagenda (RN-07)', () => {
    expect(opcionReagendar(cita({}), AHORA, 10_000).puede).toBe(false);
  });

  it('una cita ya reagendada o cancelada no se reagenda', () => {
    expect(opcionReagendar(cita({ estado: 'reagendada' }), AHORA, 0).puede).toBe(false);
    expect(opcionReagendar(cita({ estado: 'cancelada_a_tiempo' }), AHORA, 0).puede).toBe(false);
  });
});

describe('opcionReagendar: no asistida (RN-16, D-05, D-26)', () => {
  // Domingo 15 de noviembre, 9:00 a. m. en Bogotá: hoy (martes) es el último día del plazo.
  const noAsistida = (c: Partial<CitaReagendable>) =>
    cita({ estado: 'no_asistida', inicio: '2026-11-15T14:00:00Z', anticipoAprobado: 15_000, ...c });

  it('anticipo $15.000: pasan $5.000 y faltan $5.000', () => {
    expect(opcionReagendar(noAsistida({}), AHORA, 0)).toEqual({
      puede: true,
      caso: 'no_asistida',
      trasladado: 5_000,
      diferencia: 5_000,
      hasta: '2026-11-17',
    });
  });

  it('sin anticipo y con la multa pendiente no se reagenda (D-26)', () => {
    expect(opcionReagendar(noAsistida({ anticipoAprobado: 0 }), AHORA, 10_000)).toEqual({
      puede: false,
      motivo: 'Tienes una multa pendiente de $10.000. Págala o habla con el local para reagendar.',
    });
  });

  it('sin anticipo y con la multa ya resuelta se reagenda pagando $10.000', () => {
    expect(opcionReagendar(noAsistida({ anticipoAprobado: 0 }), AHORA, 0)).toMatchObject({
      puede: true,
      trasladado: 0,
      diferencia: 10_000,
    });
  });

  it('vencido el plazo, con devolución elegida o registrada no se reagenda', () => {
    expect(opcionReagendar(noAsistida({ inicio: '2026-11-14T14:00:00Z' }), AHORA, 0).puede).toBe(false);
    expect(
      opcionReagendar(noAsistida({ devolucionElegidaEn: '2026-11-16T10:00:00Z' }), AHORA, 0).puede,
    ).toBe(false);
    expect(opcionReagendar(noAsistida({ devolucionRegistrada: true }), AHORA, 0).puede).toBe(false);
  });
});

describe('estadoEleccionNoAsistencia (RN-16, D-27)', () => {
  const base = {
    inicio: '2026-11-15T14:00:00Z',
    devolucionElegidaEn: null,
    devolucionRegistrada: false,
  };

  it('en plazo y sin elegir: por elegir', () => {
    expect(estadoEleccionNoAsistencia(base, AHORA)).toBe('por_elegir');
  });

  it('sin elegir en 2 días: devolución pendiente', () => {
    // Miércoles 18 de noviembre, 0:00 en Bogotá.
    expect(estadoEleccionNoAsistencia(base, Date.parse('2026-11-18T05:00:00Z'))).toBe(
      'devolucion_pendiente',
    );
  });

  it('elegida y registrada', () => {
    expect(estadoEleccionNoAsistencia({ ...base, devolucionElegidaEn: 'x' }, AHORA)).toBe(
      'devolucion_elegida',
    );
    expect(estadoEleccionNoAsistencia({ ...base, devolucionRegistrada: true }, AHORA)).toBe(
      'devolucion_registrada',
    );
  });
});
