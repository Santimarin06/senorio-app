// Pruebas de la especificación de disponibilidad. Solo se ajustaron los tipos (noUncheckedIndexedAccess
// y @jest/globals): ninguna regla ni valor esperado cambió. Las pruebas nuevas van al final.
import { describe, expect, it } from '@jest/globals';

import {
  agruparPorDia,
  aBogota,
  calcularDia,
  calcularSemana,
  CONFIG,
  instanteDeFranja,
  lunesDe,
  partirPorAlmuerzo,
} from './disponibilidad';
import { etiquetaDia, formatoHora } from './fechas';

const SIN: ReadonlySet<string> = new Set();
const LEJOS = { fecha: '2026-11-01', minutos: 0 }; // "ahora" anterior a todas las fechas de prueba
const base = { festivos: SIN, diasHabilitados: SIN, citas: [], bloqueos: [], ahora: LEJOS };
const hm = (h: number, m = 0): number => h * 60 + m;
const estado = (d: ReturnType<typeof calcularDia>, min: number) => d.franjas.find((f) => f.inicioMin === min)?.estado;

describe('horario (RN-01)', () => {
  it('viernes con 75 min: la última franja empieza 19:15 y termina 20:30 (cierre)', () => {
    const d = calcularDia({ ...base, fecha: '2026-11-06', duracionMin: 75 });
    const ultima = d.franjas[d.franjas.length - 1];
    expect(ultima?.inicioMin).toBe(hm(19, 15));
    expect(ultima?.finMin).toBe(hm(20, 30));
  });

  it('lunes con 40 min: primera 09:00 y última 18:45 (19:25 < cierre 19:30)', () => {
    const d = calcularDia({ ...base, fecha: '2026-11-02', duracionMin: 40 });
    expect(d.franjas[0]?.inicioMin).toBe(hm(9));
    expect(d.franjas[d.franjas.length - 1]?.inicioMin).toBe(hm(18, 45));
  });

  it('ninguna franja cruza el almuerzo, pero una que termina a las 12:00 sí es válida', () => {
    const d = calcularDia({ ...base, fecha: '2026-11-06', duracionMin: 75 });
    for (const f of d.franjas) {
      expect(f.inicioMin < hm(13) && hm(12) < f.finMin).toBe(false);
    }
    expect(estado(d, hm(10, 45))).toBe('libre'); // 10:45 a 12:00
    expect(estado(d, hm(11))).toBeUndefined(); // 11:00 a 12:15 cruza el almuerzo
    expect(estado(d, hm(13))).toBe('libre');
  });
});

describe('domingos y festivos (RN-10)', () => {
  it('domingo cerrado por defecto', () => {
    const d = calcularDia({ ...base, fecha: '2026-11-08', duracionMin: 60 });
    expect(d).toEqual({ fecha: '2026-11-08', abierto: false, franjas: [] });
  });

  it('domingo habilitado: 10:00 a 16:00 con almuerzo bloqueado', () => {
    const d = calcularDia({
      ...base,
      fecha: '2026-11-08',
      duracionMin: 60,
      diasHabilitados: new Set(['2026-11-08']),
    });
    expect(d.abierto).toBe(true);
    expect(d.franjas[0]?.inicioMin).toBe(hm(10));
    expect(d.franjas[d.franjas.length - 1]?.inicioMin).toBe(hm(15));
    expect(estado(d, hm(11))).toBe('libre'); // 11:00 a 12:00
    expect(estado(d, hm(11, 15))).toBeUndefined(); // cruza el almuerzo
  });

  it('un festivo entre semana está cerrado salvo que se habilite', () => {
    const festivos = new Set(['2026-11-16']);
    expect(calcularDia({ ...base, fecha: '2026-11-16', duracionMin: 40, festivos }).abierto).toBe(false);
    const habil = calcularDia({
      ...base,
      fecha: '2026-11-16',
      duracionMin: 40,
      festivos,
      diasHabilitados: new Set(['2026-11-16']),
    });
    expect(habil.abierto).toBe(true);
    expect(habil.franjas[0]?.inicioMin).toBe(hm(10));
  });
});

describe('solapamientos y bloqueos (RN-02, RF-24)', () => {
  it('marca ocupadas las que chocan con una cita y respeta los bordes', () => {
    const d = calcularDia({
      ...base,
      fecha: '2026-11-06',
      duracionMin: 75,
      citas: [{ inicioMin: hm(10, 30), finMin: hm(11, 45) }],
    });
    expect(estado(d, hm(9, 15))).toBe('libre'); // termina 10:30 justo cuando empieza la cita
    expect(estado(d, hm(9, 30))).toBe('ocupada');
    expect(estado(d, hm(10, 30))).toBe('ocupada');
    expect(estado(d, hm(13))).toBe('libre');
  });

  it('una cita que termina a las 14:00 no bloquea la franja de las 14:00', () => {
    const d = calcularDia({
      ...base,
      fecha: '2026-11-06',
      duracionMin: 60,
      citas: [{ inicioMin: hm(13), finMin: hm(14) }],
    });
    expect(estado(d, hm(13))).toBe('ocupada');
    expect(estado(d, hm(14))).toBe('libre');
  });

  it('los bloqueos del administrador dejan de ofrecerse', () => {
    const d = calcularDia({
      ...base,
      fecha: '2026-11-06',
      duracionMin: 60,
      bloqueos: [{ inicioMin: hm(15), finMin: hm(17) }],
    });
    expect(estado(d, hm(14))).toBe('libre');
    expect(estado(d, hm(14, 15))).toBe('bloqueada');
    expect(estado(d, hm(16, 45))).toBe('bloqueada');
    expect(estado(d, hm(17))).toBe('libre');
  });
});

describe('franjas pasadas (RF-04)', () => {
  it('las que empiezan antes de ahora están pasadas; la de ahora mismo sigue libre', () => {
    const d = calcularDia({
      ...base,
      fecha: '2026-11-06',
      duracionMin: 75,
      ahora: { fecha: '2026-11-06', minutos: hm(10) },
    });
    expect(estado(d, hm(9, 45))).toBe('pasada');
    expect(estado(d, hm(10))).toBe('libre');
  });

  it('un día anterior queda todo pasado', () => {
    const d = calcularDia({
      ...base,
      fecha: '2026-11-05',
      duracionMin: 75,
      ahora: { fecha: '2026-11-06', minutos: 0 },
    });
    expect(d.franjas.every((f) => f.estado === 'pasada')).toBe(true);
  });
});

describe('validación', () => {
  it.each([[0], [-5], [1.5], [NaN]])('rechaza duración %p', (duracionMin: number) => {
    expect(() => calcularDia({ ...base, fecha: '2026-11-06', duracionMin })).toThrow(RangeError);
  });
});

describe('semana (RF-04)', () => {
  const entrada = {
    lunes: '2026-11-02',
    duracionMin: 75,
    festivos: SIN,
    diasHabilitados: SIN,
    ahora: LEJOS,
    citasPorDia: {},
    bloqueosPorDia: {},
  };
  it('devuelve siete días de lunes a domingo, con el domingo cerrado', () => {
    const s = calcularSemana(entrada);
    expect(s).toHaveLength(7);
    expect(s[0]?.fecha).toBe('2026-11-02');
    expect(s[4]).toMatchObject({ fecha: '2026-11-06', abierto: true });
    expect(s[6]).toMatchObject({ fecha: '2026-11-08', abierto: false });
  });
  it('exige que empiece en lunes', () => {
    expect(() => calcularSemana({ ...entrada, lunes: '2026-11-03' })).toThrow(RangeError);
  });
});

describe('zona horaria de Bogotá', () => {
  it('convierte instantes UTC a fecha y minutos de Bogotá, también al cruzar de día', () => {
    expect(aBogota(new Date('2026-11-06T20:00:00Z'))).toEqual({ fecha: '2026-11-06', minutos: hm(15) });
    expect(aBogota(new Date('2026-11-07T03:00:00Z'))).toEqual({ fecha: '2026-11-06', minutos: hm(22) });
    expect(aBogota(new Date('2026-11-07T05:30:00Z'))).toEqual({ fecha: '2026-11-07', minutos: 30 });
  });
  it('lunesDe devuelve el lunes de cualquier día de la semana', () => {
    expect(lunesDe('2026-11-02')).toBe('2026-11-02');
    expect(lunesDe('2026-11-06')).toBe('2026-11-02');
    expect(lunesDe('2026-11-08')).toBe('2026-11-02');
  });
});

// ---------- Pruebas agregadas en el proyecto ----------

describe('configuración desde src/config/negocio.ts', () => {
  it('da los mismos valores que la especificación', () => {
    expect(CONFIG).toEqual({
      PASO_MIN: 15,
      ANTICIPACION_MIN: 0,
      ALMUERZO: { inicioMin: hm(12), finMin: hm(13) },
      HABILITADO: { abreMin: hm(10), cierraMin: hm(16) },
      LUN_JUE: { abreMin: hm(9), cierraMin: hm(19, 30) },
      VIE_SAB: { abreMin: hm(9), cierraMin: hm(20, 30) },
      OFFSET_BOGOTA_MIN: -300,
    });
  });
});

describe('horarios especiales por fecha (D-09, dias_habilitados)', () => {
  it('un domingo habilitado con horario propio usa ese horario', () => {
    const especiales = new Map([['2026-11-08', { abierto: true, abreMin: hm(14), cierraMin: hm(18) }]]);
    const d = calcularDia({ ...base, fecha: '2026-11-08', duracionMin: 60, especiales });
    expect(d.franjas[0]?.inicioMin).toBe(hm(14));
    expect(d.franjas[d.franjas.length - 1]?.inicioMin).toBe(hm(17));
  });

  it('un día normal puede cerrarse o cambiar de horario, y el almuerzo sigue bloqueado', () => {
    const especiales = new Map([
      ['2026-11-05', { abierto: false, abreMin: hm(10), cierraMin: hm(16) }],
      ['2026-11-06', { abierto: true, abreMin: hm(11), cierraMin: hm(15) }],
    ]);
    expect(calcularDia({ ...base, fecha: '2026-11-05', duracionMin: 40, especiales }).abierto).toBe(false);
    const viernes = calcularDia({ ...base, fecha: '2026-11-06', duracionMin: 60, especiales });
    expect(viernes.franjas[0]?.inicioMin).toBe(hm(11));
    expect(estado(viernes, hm(11, 30))).toBeUndefined(); // cruza el almuerzo
    expect(viernes.franjas[viernes.franjas.length - 1]?.inicioMin).toBe(hm(14));
  });
});

describe('agruparPorDia', () => {
  it('agrupa intervalos UTC por fecha de Bogotá, también de noche', () => {
    expect(
      agruparPorDia([
        { inicio: '2026-11-06T15:00:00Z', fin: '2026-11-06T16:15:00Z' }, // 10:00 a 11:15
        { inicio: '2026-11-07T01:00:00Z', fin: '2026-11-07T01:30:00Z' }, // 20:00 a 20:30 del viernes
        { inicio: '2026-11-07T14:00:00Z', fin: '2026-11-07T15:00:00Z' }, // sábado 9:00
      ]),
    ).toEqual({
      '2026-11-06': [
        { inicioMin: hm(10), finMin: hm(11, 15) },
        { inicioMin: hm(20), finMin: hm(20, 30) },
      ],
      '2026-11-07': [{ inicioMin: hm(9), finMin: hm(10) }],
    });
  });
});

describe('apoyo para la pantalla de horario', () => {
  it('instanteDeFranja es lo inverso de aBogota', () => {
    expect(instanteDeFranja('2026-11-17', hm(10))).toBe('2026-11-17T15:00:00.000Z');
    expect(instanteDeFranja('2026-11-06', hm(20))).toBe('2026-11-07T01:00:00.000Z');
    expect(aBogota(new Date(instanteDeFranja('2026-11-06', hm(19, 15))))).toEqual({
      fecha: '2026-11-06',
      minutos: hm(19, 15),
    });
  });

  it('partirPorAlmuerzo deja antes las que terminan a las 12:00 o antes', () => {
    const d = calcularDia({ ...base, fecha: '2026-11-06', duracionMin: 75 });
    const { antes, despues } = partirPorAlmuerzo(d.franjas);
    expect(antes[antes.length - 1]?.inicioMin).toBe(hm(10, 45));
    expect(despues[0]?.inicioMin).toBe(hm(13));
    expect(antes.length + despues.length).toBe(d.franjas.length);
  });

  it('formatoHora y etiquetaDia', () => {
    expect(formatoHora(hm(9, 15))).toBe('9:15 a. m.');
    expect(formatoHora(hm(12))).toBe('12:00 m.');
    expect(formatoHora(hm(12, 30))).toBe('12:30 p. m.');
    expect(formatoHora(hm(19, 30))).toBe('7:30 p. m.');
    expect(etiquetaDia('2026-11-17')).toEqual({ corto: 'mar', numero: 17, largo: 'martes 17 de noviembre' });
  });
});
