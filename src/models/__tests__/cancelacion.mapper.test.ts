import { describe, expect, it } from '@jest/globals';

import { mapCancelacion } from '@/models/cancelacion.mapper';

describe('mapCancelacion (RF-09)', () => {
  it('convierte la respuesta de cancelar_cita', () => {
    expect(
      mapCancelacion({ estado: 'cancelada_tarde', anticipo_aprobado: 20000, multa_estado: 'cobrada_anticipo' }),
    ).toEqual({ estado: 'cancelada_tarde', anticipoAprobado: 20000, multaEstado: 'cobrada_anticipo' });
  });

  it('sin multa queda null', () => {
    expect(
      mapCancelacion({ estado: 'cancelada_a_tiempo', anticipo_aprobado: 0, multa_estado: null }).multaEstado,
    ).toBeNull();
  });

  it('una multa con estado desconocido se trata como pendiente', () => {
    expect(
      mapCancelacion({ estado: 'cancelada_tarde', anticipo_aprobado: 0, multa_estado: 'otro' }).multaEstado,
    ).toBe('pendiente');
  });

  it('si la base no dejó la cita cancelada, lanza error', () => {
    expect(() =>
      mapCancelacion({ estado: 'confirmada', anticipo_aprobado: 0, multa_estado: null }),
    ).toThrow();
  });
});
