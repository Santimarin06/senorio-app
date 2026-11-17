import { describe, expect, it } from '@jest/globals';

import { mapBloqueo, mapDiaEspecial } from '@/models/diasTrabajo.mapper';

describe('mapDiaEspecial', () => {
  it('convierte las horas de Postgres a minutos y limpia la nota', () => {
    expect(
      mapDiaEspecial({ fecha: '2026-11-22', abierto: true, apertura: '10:00:00', cierre: '16:00:00', nota: '  ' }),
    ).toEqual({ fecha: '2026-11-22', abierto: true, abreMin: 600, cierraMin: 960, nota: null });
  });
});

describe('mapBloqueo', () => {
  const fila = {
    id: 'b1',
    profesional_id: 'p1',
    inicio: '2026-11-18T19:00:00+00:00',
    fin: '2026-11-18T21:00:00+00:00',
    motivo: 'Cita médica',
    profesionales: { nombre: 'Mario' },
  };

  it('trae el nombre del profesional', () => {
    expect(mapBloqueo(fila)).toEqual({
      id: 'b1',
      profesionalId: 'p1',
      profesional: 'Mario',
      inicio: fila.inicio,
      fin: fila.fin,
      motivo: 'Cita médica',
    });
  });

  it('sin profesional es de todo el local; sin motivo dice "Sin motivo"', () => {
    const local = mapBloqueo({ ...fila, profesional_id: null, profesionales: null, motivo: null });
    expect(local.profesional).toBeNull();
    expect(local.motivo).toBe('Sin motivo');
  });
});
