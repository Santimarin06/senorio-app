import { describe, expect, it } from '@jest/globals';

import { mapCitaAgenda } from '@/models/agenda.mapper';
import type { CitaAgendaRespuesta } from '@/types/api';

const fila: CitaAgendaRespuesta = {
  id: 'c1',
  inicio: '2026-11-17T15:30:00+00:00',
  fin: '2026-11-17T16:45:00+00:00',
  estado: 'confirmada',
  total: 55000,
  profesional_id: 'p1',
  profesionales: { nombre: 'Mario' },
  cliente: { nombre: 'Tomás Rojas', telefono: '3105550142' },
  cita_servicios: [{ nombre: 'Corte', precio: 35000, duracion_min: 45 }],
  comprobantes: [
    { monto: 20000, estado: 'aprobado' },
    { monto: 15000, estado: 'rechazado' },
  ],
};

describe('mapCitaAgenda (RF-21)', () => {
  it('trae cliente, servicios y solo el anticipo aprobado', () => {
    expect(mapCitaAgenda(fila)).toEqual({
      id: 'c1',
      inicio: fila.inicio,
      fin: fila.fin,
      estado: 'confirmada',
      total: 55000,
      profesionalId: 'p1',
      profesional: 'Mario',
      cliente: { nombre: 'Tomás Rojas', telefono: '3105550142' },
      servicios: [{ nombre: 'Corte', precio: 35000, duracionMin: 45 }],
      anticipoAprobado: 20000,
    });
  });

  it('sin perfil visible, sin comprobantes y con estado desconocido', () => {
    const cita = mapCitaAgenda({
      ...fila,
      estado: 'raro',
      cliente: null,
      comprobantes: null,
      cita_servicios: null,
    });
    expect(cita.cliente).toEqual({ nombre: 'Cliente', telefono: '' });
    expect(cita.anticipoAprobado).toBe(0);
    expect(cita.servicios).toEqual([]);
    expect(cita.estado).toBe('por_marcar');
  });
});
