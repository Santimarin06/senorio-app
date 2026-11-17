// Festivos de Colombia (D-09, D-32): la función, y que el seed y la migración coincidan con ella.
// La prueba lee los .sql con fs: los tipos de Node ya vienen con Jest (no es dependencia nueva).
/// <reference types="node" />
import { describe, expect, it } from '@jest/globals';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

import { festivosColombia, pascua, type Festivo } from '../festivos';

const RAIZ = join(__dirname, '..', '..', '..');

/** Filas ('YYYY-MM-DD', 'nombre') del insert en public.festivos de un archivo SQL. */
const filasDelSql = (sql: string): Festivo[] => {
  const bloque = sql.split('insert into public.festivos')[1]?.split(';')[0] ?? '';
  return [...bloque.matchAll(/\('(\d{4}-\d{2}-\d{2})', '((?:[^']|'')*)'\)/g)].map((m) => ({
    fecha: m[1] ?? '',
    nombre: (m[2] ?? '').replaceAll("''", "'"),
  }));
};

/** Compara las filas con festivosColombia en cada año que aparece en ellas. */
const revisarContraFuncion = (filas: Festivo[]): number[] => {
  const años = [...new Set(filas.map((f) => Number(f.fecha.slice(0, 4))))].sort();
  for (const año of años) {
    expect(filas.filter((f) => f.fecha.startsWith(`${año}-`))).toEqual(festivosColombia(año));
  }
  return años;
};

describe('pascua', () => {
  it('2026 es el 5 de abril y 2027 el 28 de marzo', () => {
    expect(pascua(2026)).toBe('2026-04-05');
    expect(pascua(2027)).toBe('2027-03-28');
  });
});

describe('festivosColombia', () => {
  it('2026 tiene los 18 festivos oficiales', () => {
    expect(festivosColombia(2026).map((f) => f.fecha)).toEqual(
      [
        '01-01', '01-12', '03-23', '04-02', '04-03', '05-01', '05-18', '06-08', '06-15',
        '06-29', '07-20', '08-07', '08-17', '10-12', '11-02', '11-16', '12-08', '12-25',
      ].map((md) => `2026-${md}`),
    );
  });

  it('un trasladable que ya cae en lunes se queda (12 oct 2026 es lunes)', () => {
    expect(festivosColombia(2026)).toContainEqual({ fecha: '2026-10-12', nombre: 'Día de la Raza' });
  });

  it('Jueves y Viernes Santo no se trasladan', () => {
    const f = festivosColombia(2027);
    expect(f).toContainEqual({ fecha: '2027-03-25', nombre: 'Jueves Santo' });
    expect(f).toContainEqual({ fecha: '2027-03-26', nombre: 'Viernes Santo' });
  });

  it('dos festivos el mismo día quedan en una sola fecha (1 jul 2030, D-40)', () => {
    const f = festivosColombia(2030);
    expect(f).toHaveLength(17);
    expect(f).toContainEqual({ fecha: '2030-07-01', nombre: 'San Pedro y San Pablo / Sagrado Corazón' });
  });
});

describe('la base coincide con la función (D-32)', () => {
  it('seed.sql tiene exactamente los festivos de 2026 a 2030', () => {
    const filas = filasDelSql(readFileSync(join(RAIZ, 'supabase', 'seed.sql'), 'utf8'));
    expect(revisarContraFuncion(filas)).toEqual([2026, 2027, 2028, 2029, 2030]);
  });

  it('las migraciones que insertan festivos coinciden con la función', () => {
    const carpeta = join(RAIZ, 'supabase', 'migrations');
    const conFestivos = readdirSync(carpeta)
      .map((nombre) => readFileSync(join(carpeta, nombre), 'utf8'))
      .filter((sql) => sql.includes('insert into public.festivos'));
    expect(conFestivos.length).toBeGreaterThan(0);
    for (const sql of conFestivos) revisarContraFuncion(filasDelSql(sql));
  });
});
