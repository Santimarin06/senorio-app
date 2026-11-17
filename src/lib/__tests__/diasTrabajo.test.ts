import { describe, expect, it } from '@jest/globals';

import {
  citasEnBloqueo,
  citasFueraDeHorario,
  domingosYFestivos,
  esFechaValida,
  horaTexto,
  horarioNormal,
  horarioVigente,
  parsearHora,
  textoVentana,
  validarBloqueo,
  validarHoras,
  validarJornada,
} from '@/lib/diasTrabajo';

// Martes 17 nov 2026, 10:00 a. m. en Bogotá = 15:00 UTC.
const AHORA = Date.parse('2026-11-17T15:00:00.000Z');

describe('parsearHora y horaTexto', () => {
  it('lee horas de 24 horas con o sin cero inicial', () => {
    expect(parsearHora('9:00')).toBe(540);
    expect(parsearHora(' 16:30 ')).toBe(990);
    expect(parsearHora('00:00')).toBe(0);
  });

  it('rechaza textos que no son horas', () => {
    expect(parsearHora('24:00')).toBeNull();
    expect(parsearHora('10:60')).toBeNull();
    expect(parsearHora('10')).toBeNull();
    expect(parsearHora('diez')).toBeNull();
  });

  it('escribe HH:MM con ceros', () => {
    expect(horaTexto(540)).toBe('09:00');
    expect(horaTexto(1230)).toBe('20:30');
  });
});

describe('validarHoras y validarJornada (RF-24, D-07)', () => {
  it('acepta un horario válido', () => {
    expect(validarHoras('10:00', '16:00')).toEqual({ ok: true, inicioMin: 600, finMin: 960 });
  });

  it('exige que el cierre sea posterior a la apertura', () => {
    expect(validarHoras('16:00', '10:00').ok).toBe(false);
    expect(validarHoras('10:00', '10:00').ok).toBe(false);
  });

  it('exige pasos de 15 minutos', () => {
    expect(validarHoras('10:10', '16:00').ok).toBe(false);
  });

  it('rechaza una jornada que cabe entera en el almuerzo', () => {
    expect(validarJornada('12:00', '13:00').ok).toBe(false);
    expect(validarJornada('12:15', '12:45').ok).toBe(false);
    expect(validarJornada('11:00', '13:00').ok).toBe(true);
  });
});

describe('domingosYFestivos (RN-10, D-09)', () => {
  it('lista domingos y festivos con su nombre', () => {
    // Del lunes 16 nov 2026 (Independencia de Cartagena) al domingo 22.
    expect(domingosYFestivos('2026-11-16', 7)).toEqual([
      { fecha: '2026-11-16', festivo: 'Independencia de Cartagena' },
      { fecha: '2026-11-22', festivo: null },
    ]);
  });

  it('cruza el cambio de año con los festivos de ambos años', () => {
    const fechas = domingosYFestivos('2026-12-24', 14).map((d) => d.fecha);
    expect(fechas).toContain('2026-12-25');
    expect(fechas).toContain('2027-01-01');
  });
});

describe('horarioNormal y horarioVigente (D-24)', () => {
  const festivos = new Set(['2026-12-08']);

  it('sin excepción: horario normal, domingos y festivos cerrados', () => {
    expect(horarioNormal('2026-11-17', festivos)).toEqual({ abreMin: 540, cierraMin: 1170 });
    expect(horarioNormal('2026-11-20', festivos)).toEqual({ abreMin: 540, cierraMin: 1230 });
    expect(horarioNormal('2026-11-22', festivos)).toBeNull();
    expect(horarioNormal('2026-12-08', festivos)).toBeNull();
  });

  it('la excepción manda: habilita, cambia o cierra', () => {
    const habilitado = { abierto: true, abreMin: 600, cierraMin: 960 };
    expect(horarioVigente('2026-11-22', festivos, habilitado)).toBe(habilitado);
    expect(
      horarioVigente('2026-11-17', festivos, { abierto: false, abreMin: 600, cierraMin: 960 }),
    ).toBeNull();
    expect(textoVentana(horarioVigente('2026-11-22', festivos, habilitado))).toBe('10:00–16:00');
    expect(textoVentana(null)).toBe('Cerrado');
  });
});

describe('citasFueraDeHorario', () => {
  // Martes 17 nov: 9:00–9:45 y 17:00–18:00 en Bogotá.
  const temprano = { id: 'a', inicio: '2026-11-17T14:00:00.000Z', fin: '2026-11-17T14:45:00.000Z' };
  const tarde = { id: 'b', inicio: '2026-11-17T22:00:00.000Z', fin: '2026-11-17T23:00:00.000Z' };
  const otroDia = { id: 'c', inicio: '2026-11-18T14:00:00.000Z', fin: '2026-11-18T14:45:00.000Z' };
  const citas = [temprano, tarde, otroDia];

  it('avisa de las citas que quedan fuera de la nueva jornada', () => {
    expect(citasFueraDeHorario(citas, '2026-11-17', { abreMin: 600, cierraMin: 1170 })).toEqual([
      temprano,
    ]);
    expect(citasFueraDeHorario(citas, '2026-11-17', { abreMin: 540, cierraMin: 1050 })).toEqual([
      tarde,
    ]);
  });

  it('si el día se cierra, todas las de ese día quedan fuera', () => {
    expect(citasFueraDeHorario(citas, '2026-11-17', null)).toEqual([temprano, tarde]);
  });

  it('una cita que termina justo al cierre no queda fuera', () => {
    expect(citasFueraDeHorario(citas, '2026-11-17', { abreMin: 540, cierraMin: 1080 })).toEqual([]);
  });
});

describe('citasEnBloqueo', () => {
  const mario = { id: 'm', profesionalId: 'mario', inicio: '2026-11-17T15:00:00.000Z', fin: '2026-11-17T15:45:00.000Z' };
  const camilo = { id: 'c', profesionalId: 'camilo', inicio: '2026-11-17T15:00:00.000Z', fin: '2026-11-17T15:45:00.000Z' };

  it('solo cuenta las del profesional bloqueado que se solapan', () => {
    const bloqueo = { inicio: '2026-11-17T15:30:00.000Z', fin: '2026-11-17T17:00:00.000Z', profesionalId: 'mario' };
    expect(citasEnBloqueo([mario, camilo], bloqueo)).toEqual([mario]);
  });

  it('un bloqueo de todo el local toca a todos; uno que empieza al terminar la cita, no', () => {
    expect(
      citasEnBloqueo([mario, camilo], { inicio: '2026-11-17T15:00:00.000Z', fin: '2026-11-17T16:00:00.000Z', profesionalId: null }),
    ).toEqual([mario, camilo]);
    expect(
      citasEnBloqueo([mario], { inicio: '2026-11-17T15:45:00.000Z', fin: '2026-11-17T16:00:00.000Z', profesionalId: null }),
    ).toEqual([]);
  });
});

describe('validarBloqueo (RF-24)', () => {
  const base = { fecha: '2026-11-18', inicio: '14:00', fin: '16:00', motivo: 'Día libre' };

  it('devuelve los instantes UTC del bloqueo', () => {
    expect(validarBloqueo(base, AHORA)).toEqual({
      ok: true,
      inicio: '2026-11-18T19:00:00.000Z',
      fin: '2026-11-18T21:00:00.000Z',
      motivo: 'Día libre',
    });
  });

  it('rechaza fechas pasadas, horarios ya terminados y horas al revés', () => {
    expect(validarBloqueo({ ...base, fecha: '2026-11-16' }, AHORA).ok).toBe(false);
    expect(validarBloqueo({ ...base, fecha: '2026-11-17', inicio: '08:00', fin: '09:30' }, AHORA).ok).toBe(false);
    expect(validarBloqueo({ ...base, inicio: '16:00', fin: '14:00' }, AHORA).ok).toBe(false);
  });

  it('acepta hoy si aún no termina', () => {
    expect(validarBloqueo({ ...base, fecha: '2026-11-17', inicio: '09:00', fin: '11:00' }, AHORA).ok).toBe(true);
  });

  it('exige motivo de hasta 120 caracteres', () => {
    expect(validarBloqueo({ ...base, motivo: '   ' }, AHORA).ok).toBe(false);
    expect(validarBloqueo({ ...base, motivo: 'x'.repeat(121) }, AHORA).ok).toBe(false);
  });
});

describe('esFechaValida', () => {
  it('acepta fechas reales y rechaza el resto', () => {
    expect(esFechaValida('2026-11-22')).toBe(true);
    expect(esFechaValida('2026-02-30')).toBe(false);
    expect(esFechaValida('22-11-2026')).toBe(false);
    expect(esFechaValida('abc')).toBe(false);
  });
});
