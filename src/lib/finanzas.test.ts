// Pruebas de la especificación de multas y devoluciones. Solo se ajustaron los tipos (@jest/globals y
// parámetros de it.each): ninguna regla ni valor esperado cambió.
import { describe, expect, it } from '@jest/globals';

import {
  calcularCancelacion,
  calcularNoAsistencia,
  calcularSaldo,
  calcularTotalCita,
  formatoCOP,
  PARAMS,
  puedeReagendarNoAsistida,
  puedeReservar,
  validarAbono,
} from './finanzas';

describe('formatoCOP', () => {
  it('usa punto de miles', () => {
    expect(formatoCOP(65_000)).toBe('$65.000');
    expect(formatoCOP(0)).toBe('$0');
    expect(formatoCOP(1_250_000)).toBe('$1.250.000');
  });
});

describe('calcularTotalCita', () => {
  it('suma servicios y adicionales (caso del mockup: $65.000 y 75 min)', () => {
    const r = calcularTotalCita([
      { precio: 35_000, duracionMin: 45 },
      { precio: 20_000, duracionMin: 20 },
      { precio: 10_000, duracionMin: 10 },
    ]);
    expect(r).toEqual({ total: 65_000, duracionMin: 75 });
  });
  it('un adicional sin cambio de duración suma 0 minutos', () => {
    expect(calcularTotalCita([{ precio: 15_000, duracionMin: 30 }, { precio: 15_000, duracionMin: 0 }])).toEqual({
      total: 30_000,
      duracionMin: 30,
    });
  });
  it('rechaza lista vacía y valores inválidos', () => {
    expect(() => calcularTotalCita([])).toThrow(RangeError);
    expect(() => calcularTotalCita([{ precio: -1, duracionMin: 10 }])).toThrow(RangeError);
    expect(() => calcularTotalCita([{ precio: 1000.5, duracionMin: 10 }])).toThrow(RangeError);
  });
});

describe('validarAbono (RN-08)', () => {
  const total = 65_000;
  it.each([
    ['20.000', 20_000],
    ['$ 20.000', 20_000],
    ['10000', 10_000],
    [' 15.000 ', 15_000],
    [65_000, 65_000],
  ])('acepta %p', (entrada: string | number, esperado: number) => {
    expect(validarAbono(entrada, total)).toEqual({ ok: true, valor: esperado });
  });

  it.each([[''], ['   '], ['abc'], ['-5000'], ['9.999'], ['9999'], ['65.001'], ['20.5'], [null], [undefined], [NaN], [-1]])(
    'rechaza %p',
    (entrada: unknown) => {
      expect(validarAbono(entrada, total).ok).toBe(false);
    },
  );

  it('da mensajes específicos', () => {
    expect(validarAbono('9.999', total)).toEqual({ ok: false, error: 'El abono mínimo es $10.000.' });
    expect(validarAbono('70.000', total)).toEqual({
      ok: false,
      error: 'El abono no puede superar el total de la cita ($65.000).',
    });
  });

  it('rechaza un total de cita inválido', () => {
    expect(validarAbono('20.000', 0).ok).toBe(false);
    expect(validarAbono('20.000', -5).ok).toBe(false);
  });
});

describe('calcularSaldo', () => {
  it('descuenta solo el anticipo aprobado y nunca baja de cero', () => {
    expect(calcularSaldo(65_000, 20_000)).toBe(45_000);
    expect(calcularSaldo(65_000, 0)).toBe(65_000);
    expect(calcularSaldo(10_000, 20_000)).toBe(0);
  });
});

describe('calcularCancelacion (RN-06, RN-15)', () => {
  it('tardía sin reagendar con anticipo $20.000 devuelve $8.000 (caso SB-1038 del mockup)', () => {
    expect(calcularCancelacion({ anticipoAprobado: 20_000, horasAntes: 3, reagenda: false })).toEqual({
      multa: 10_000,
      multaCubierta: 10_000,
      multaPendiente: 0,
      costoDevolucion: 2_000,
      devolucion: 8_000,
      anticipoTrasladado: 0,
    });
  });

  it('con 4 h o más sin reagendar devuelve el anticipo menos $2.000', () => {
    const r = calcularCancelacion({ anticipoAprobado: 20_000, horasAntes: 29, reagenda: false });
    expect(r.multa).toBe(0);
    expect(r.devolucion).toBe(18_000);
  });

  it('exactamente 4 h no genera multa', () => {
    expect(calcularCancelacion({ anticipoAprobado: 20_000, horasAntes: 4, reagenda: false }).multa).toBe(0);
    expect(calcularCancelacion({ anticipoAprobado: 20_000, horasAntes: 3.99, reagenda: false }).multa).toBe(10_000);
  });

  it('tardía sin anticipo deja la multa pendiente y no devuelve nada', () => {
    expect(calcularCancelacion({ anticipoAprobado: 0, horasAntes: 1, reagenda: false })).toEqual({
      multa: 10_000,
      multaCubierta: 0,
      multaPendiente: 10_000,
      costoDevolucion: 0,
      devolucion: 0,
      anticipoTrasladado: 0,
    });
  });

  it('la devolución nunca es negativa', () => {
    expect(calcularCancelacion({ anticipoAprobado: 10_000, horasAntes: 1, reagenda: false }).devolucion).toBe(0);
    expect(calcularCancelacion({ anticipoAprobado: 11_000, horasAntes: 1, reagenda: false })).toMatchObject({
      costoDevolucion: 1_000,
      devolucion: 0,
    });
    expect(calcularCancelacion({ anticipoAprobado: 1_500, horasAntes: 10, reagenda: false }).devolucion).toBe(0);
  });

  it('reagendar a tiempo traslada todo el anticipo (mockup: $20.000 pasan completos)', () => {
    expect(calcularCancelacion({ anticipoAprobado: 20_000, horasAntes: 29, reagenda: true })).toEqual({
      multa: 0,
      multaCubierta: 0,
      multaPendiente: 0,
      costoDevolucion: 0,
      devolucion: 0,
      anticipoTrasladado: 20_000,
    });
  });

  it('no permite reagendar con menos de 4 h', () => {
    expect(() => calcularCancelacion({ anticipoAprobado: 20_000, horasAntes: 2, reagenda: true })).toThrow(RangeError);
  });

  it.each([[-1], [1.5], [NaN]])('rechaza anticipo inválido %p', (anticipo: number) => {
    expect(() => calcularCancelacion({ anticipoAprobado: anticipo, horasAntes: 10, reagenda: false })).toThrow(RangeError);
  });

  it('rechaza horas no numéricas', () => {
    expect(() => calcularCancelacion({ anticipoAprobado: 0, horasAntes: NaN, reagenda: false })).toThrow(RangeError);
  });
});

describe('calcularNoAsistencia (RN-05, RN-06)', () => {
  it('sin anticipo: multa pendiente completa', () => {
    expect(calcularNoAsistencia(0)).toEqual({ multa: 10_000, multaCubierta: 0, multaPendiente: 10_000, anticipoRestante: 0 });
  });
  it('con anticipo suficiente: se descuenta y el resto queda disponible', () => {
    expect(calcularNoAsistencia(20_000)).toEqual({
      multa: 10_000,
      multaCubierta: 10_000,
      multaPendiente: 0,
      anticipoRestante: 10_000,
    });
  });
  it('anticipo menor que la multa: queda un pendiente parcial', () => {
    expect(calcularNoAsistencia(4_000)).toEqual({ multa: 10_000, multaCubierta: 4_000, multaPendiente: 6_000, anticipoRestante: 0 });
  });
});

describe('puedeReservar (RN-07)', () => {
  it('bloquea solo si hay multa pendiente', () => {
    expect(puedeReservar(0)).toBe(true);
    expect(puedeReservar(10_000)).toBe(false);
  });
});

describe('puedeReagendarNoAsistida (RF-14)', () => {
  it('permite hasta 2 días desde la fecha de la cita', () => {
    expect(puedeReagendarNoAsistida('2026-10-30', '2026-10-30')).toBe(true);
    expect(puedeReagendarNoAsistida('2026-10-30', '2026-11-01')).toBe(true);
    expect(puedeReagendarNoAsistida('2026-10-30', '2026-11-02')).toBe(false);
  });
  it('no aplica a fechas futuras', () => {
    expect(puedeReagendarNoAsistida('2026-11-10', '2026-11-09')).toBe(false);
  });
});

// ---------- Prueba agregada en el proyecto ----------

describe('parámetros desde src/config/negocio.ts', () => {
  it('dan los mismos valores que la especificación', () => {
    expect(PARAMS).toEqual({
      MULTA: 10_000,
      COSTO_DEVOLUCION: 2_000,
      ABONO_MINIMO: 10_000,
      HORAS_SIN_MULTA: 4,
      PLAZO_REAGENDAR_NO_ASISTIDA_DIAS: 2,
    });
  });
});
