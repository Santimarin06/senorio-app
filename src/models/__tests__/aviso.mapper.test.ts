import { describe, expect, it } from '@jest/globals';

import { mapAviso } from '@/models/aviso.mapper';
import type { NotificacionRespuesta } from '@/types/api';

const fila: NotificacionRespuesta = {
  id: 'n1',
  tipo: 'cita_reagendada',
  creada_en: '2026-11-17T15:00:00+00:00',
  mostrada_en: '2026-11-17T15:01:00+00:00',
  leida_en: null,
  citas: {
    id: 'c1',
    inicio: '2026-11-18T15:30:00+00:00',
    cliente: { nombre: ' Tomás Rojas ' },
    cita_servicios: [{ nombre: 'Corte' }, { nombre: 'Barba' }],
  },
};

describe('mapAviso (RF-30)', () => {
  it('trae el tipo, si se mostró o leyó y la cita con cliente y servicios', () => {
    expect(mapAviso(fila)).toEqual({
      id: 'n1',
      tipo: 'cita_reagendada',
      creadaEn: '2026-11-17T15:00:00+00:00',
      mostrada: true,
      leida: false,
      cita: {
        id: 'c1',
        inicio: '2026-11-18T15:30:00+00:00',
        cliente: 'Tomás Rojas',
        servicios: ['Corte', 'Barba'],
      },
    });
  });

  it('sin cita visible, sin cliente o con un tipo desconocido no falla', () => {
    expect(mapAviso({ ...fila, tipo: 'otro', citas: null })).toMatchObject({
      tipo: 'cita_nueva',
      cita: null,
    });
    expect(mapAviso({ ...fila, citas: { ...fila.citas!, cliente: null } }).cita?.cliente).toBe(
      'Cliente',
    );
  });
});
