import { describe, expect, it } from '@jest/globals';

import {
  avisosPorMostrar,
  haceCuanto,
  idRecordatorio,
  momentoRecordatorio,
  planRecordatorios,
  textoAviso,
  type CitaParaRecordar,
} from '@/lib/recordatorios';
import type { Aviso } from '@/types/entidades';

const MINUTO = 60 * 1000;
const HORA = 60 * MINUTO;

// Martes 17 nov 2026, 10:30 a. m. en Bogotá = 15:30 UTC.
const INICIO = '2026-11-17T15:30:00.000Z';
const inicioMs = Date.parse(INICIO);

const cita = (cambios: Partial<CitaParaRecordar> = {}): CitaParaRecordar => ({
  id: 'c1',
  inicio: INICIO,
  estado: 'confirmada',
  cliente: { nombre: 'Andrés' },
  servicios: [{ nombre: 'Corte' }, { nombre: 'Barba' }],
  ...cambios,
});

describe('planRecordatorios (RF-30)', () => {
  it('programa el recordatorio 30 minutos antes, con hora de Bogotá', () => {
    const plan = planRecordatorios([cita()], [], inicioMs - 2 * HORA);
    expect(plan.cancelar).toEqual([]);
    expect(plan.programar).toEqual([
      {
        id: idRecordatorio('c1', INICIO),
        fechaMs: inicioMs - 30 * MINUTO,
        titulo: 'Cita a las 10:30 a. m.',
        cuerpo: 'Andrés llega en 30 minutos · Corte, Barba.',
      },
    ]);
    expect(momentoRecordatorio(INICIO)).toBe(inicioMs - 30 * MINUTO);
  });

  it('no duplica un recordatorio que ya está programado', () => {
    const plan = planRecordatorios([cita()], [idRecordatorio('c1', INICIO)], inicioMs - 2 * HORA);
    expect(plan).toEqual({ programar: [], cancelar: [] });
  });

  it('no programa si el momento del recordatorio ya pasó', () => {
    expect(planRecordatorios([cita()], [], inicioMs - 30 * MINUTO).programar).toEqual([]);
    expect(planRecordatorios([cita()], [], inicioMs - 31 * MINUTO).programar).toHaveLength(1);
  });

  it('cancela el recordatorio de una cita que ya no está (cancelada o reagendada)', () => {
    const viejo = idRecordatorio('c9', INICIO);
    const plan = planRecordatorios([], [viejo, 'aviso:a1'], inicioMs - 2 * HORA);
    expect(plan.cancelar).toEqual([viejo]);
  });

  it('solo recuerda citas confirmadas', () => {
    const plan = planRecordatorios(
      [cita({ estado: 'cancelada_a_tiempo' })],
      [idRecordatorio('c1', INICIO)],
      inicioMs - 2 * HORA,
    );
    expect(plan.programar).toEqual([]);
    expect(plan.cancelar).toEqual([idRecordatorio('c1', INICIO)]);
  });

  it('si la cita cambió de hora, cancela el viejo y programa el nuevo', () => {
    const nuevaHora = '2026-11-17T17:00:00.000Z';
    const plan = planRecordatorios(
      [cita({ inicio: nuevaHora })],
      [idRecordatorio('c1', INICIO)],
      inicioMs - 2 * HORA,
    );
    expect(plan.cancelar).toEqual([idRecordatorio('c1', INICIO)]);
    expect(plan.programar.map((r) => r.id)).toEqual([idRecordatorio('c1', nuevaHora)]);
  });
});

const aviso = (cambios: Partial<Aviso> = {}): Aviso => ({
  id: 'a1',
  tipo: 'cita_nueva',
  creadaEn: INICIO,
  mostrada: false,
  leida: false,
  cita: { id: 'c1', inicio: INICIO, cliente: 'Andrés', servicios: ['Corte'] },
  ...cambios,
});

describe('textoAviso', () => {
  it('arma el texto con el cliente, la fecha de Bogotá y los servicios', () => {
    expect(textoAviso(aviso())).toEqual({
      titulo: 'Cita nueva',
      cuerpo: 'Andrés · Martes 17 de noviembre, 10:30 a. m. · Corte',
    });
    expect(textoAviso(aviso({ tipo: 'cita_cancelada' })).titulo).toBe('Cita cancelada');
  });

  it('sin cita visible no inventa datos', () => {
    expect(textoAviso(aviso({ tipo: 'cita_reagendada', cita: null }))).toEqual({
      titulo: 'Cita reagendada',
      cuerpo: 'Abre tu agenda para ver el detalle.',
    });
  });
});

describe('avisosPorMostrar', () => {
  it('notifica los recientes no mostrados y marca los viejos sin notificar', () => {
    const ahora = inicioMs + 25 * HORA;
    const reciente = aviso({ id: 'r', creadaEn: new Date(ahora - HORA).toISOString() });
    const viejo = aviso({ id: 'v', creadaEn: INICIO });
    const mostrado = aviso({ id: 'm', creadaEn: new Date(ahora - HORA).toISOString(), mostrada: true });
    const r = avisosPorMostrar([reciente, viejo, mostrado], ahora);
    expect(r.notificar.map((a) => a.id)).toEqual(['r']);
    expect(r.marcarSinNotificar.map((a) => a.id)).toEqual(['v']);
  });
});

describe('haceCuanto', () => {
  it('describe el tiempo transcurrido', () => {
    expect(haceCuanto(INICIO, inicioMs + 20 * 1000)).toBe('Ahora');
    expect(haceCuanto(INICIO, inicioMs + 5 * MINUTO)).toBe('Hace 5 min');
    expect(haceCuanto(INICIO, inicioMs + 3 * HORA)).toBe('Hace 3 h');
    expect(haceCuanto(INICIO, inicioMs + 24 * HORA)).toBe('Hace 1 día');
    expect(haceCuanto(INICIO, inicioMs + 72 * HORA)).toBe('Hace 3 días');
  });
});
