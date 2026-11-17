// Genera el SQL de la tabla public.festivos desde festivosColombia (D-09, D-32).
// Sin dependencias: Node 22.18 o más nuevo carga el .ts quitando los tipos.
//
//   node scripts/generar-festivos.mjs          reescribe el bloque de festivos de supabase/seed.sql
//   node scripts/generar-festivos.mjs --sql    imprime el insert (para una migración nueva)
//
// Al cambiar los años, corre el script, crea una migración nueva con la salida de --sql
// (las migraciones aplicadas no se editan) y corre las pruebas.
import { readFileSync, writeFileSync } from 'node:fs';

import { festivosColombia } from '../src/lib/festivos.ts';

const DESDE = 2026;
const HASTA = 2030;
const INICIO = '-- festivos:inicio';
const FIN = '-- festivos:fin';

const filas = [];
for (let año = DESDE; año <= HASTA; año++) {
  for (const { fecha, nombre } of festivosColombia(año)) {
    filas.push(`  ('${fecha}', '${nombre.replaceAll("'", "''")}')`);
  }
}

const insert = [
  `-- Festivos de Colombia ${DESDE} a ${HASTA}, generados con scripts/generar-festivos.mjs desde`,
  '-- festivosColombia (src/lib/festivos.ts). No se editan a mano.',
  'insert into public.festivos (fecha, nombre) values',
  filas.join(',\n'),
  'on conflict (fecha) do nothing;',
].join('\n');

if (process.argv.includes('--sql')) {
  process.stdout.write(`${insert}\n`);
} else {
  const ruta = new URL('../supabase/seed.sql', import.meta.url);
  const seed = readFileSync(ruta, 'utf8');
  const i = seed.indexOf(INICIO);
  const f = seed.indexOf(FIN);
  if (i < 0 || f < i) throw new Error(`seed.sql no tiene las marcas "${INICIO}" y "${FIN}".`);
  writeFileSync(ruta, `${seed.slice(0, i)}${INICIO}\n${insert}\n${seed.slice(f)}`);
  console.log(`seed.sql: ${filas.length} festivos de ${DESDE} a ${HASTA}.`);
}
