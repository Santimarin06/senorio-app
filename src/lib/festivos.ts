// Festivos de Colombia (D-09, D-32, RN-10). Se calculan, no se escriben a mano.
// - Fijos: no se mueven.
// - Ley Emiliani: pasan al lunes siguiente; si ya caen en lunes, se quedan.
// - Móviles según la Pascua: Jueves y Viernes Santo sin trasladar; Ascensión, Corpus Christi y
//   Sagrado Corazón trasladados al lunes siguiente.
// Las fechas se manejan con Date.UTC y getUTC*, así no dependen de la zona del teléfono.
// Este archivo no importa nada: scripts/generar-festivos.mjs lo carga directo con Node.

export interface Festivo {
  /** 'YYYY-MM-DD' */
  fecha: string;
  nombre: string;
}

const DIA_MS = 24 * 60 * 60 * 1000;

const FIJOS: readonly [number, number, string][] = [
  [1, 1, 'Año Nuevo'],
  [5, 1, 'Día del Trabajo'],
  [7, 20, 'Día de la Independencia'],
  [8, 7, 'Batalla de Boyacá'],
  [12, 8, 'Inmaculada Concepción'],
  [12, 25, 'Navidad'],
];

const TRASLADABLES: readonly [number, number, string][] = [
  [1, 6, 'Reyes Magos'],
  [3, 19, 'San José'],
  [6, 29, 'San Pedro y San Pablo'],
  [8, 15, 'Asunción de la Virgen'],
  [10, 12, 'Día de la Raza'],
  [11, 1, 'Todos los Santos'],
  [11, 11, 'Independencia de Cartagena'],
];

/** Días desde la Pascua, y si se trasladan al lunes siguiente. */
const SEGUN_PASCUA: readonly [number, boolean, string][] = [
  [-3, false, 'Jueves Santo'],
  [-2, false, 'Viernes Santo'],
  [39, true, 'Ascensión del Señor'],
  [60, true, 'Corpus Christi'],
  [68, true, 'Sagrado Corazón'],
];

/** Milisegundos UTC de la medianoche de esa fecha (mes de 1 a 12). */
const utc = (año: number, mes: number, dia: number): number => Date.UTC(año, mes - 1, dia);

const aTexto = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

/** El mismo día si es lunes; si no, el lunes siguiente. */
const alLunes = (ms: number): number => {
  const dow = new Date(ms).getUTCDay(); // 0 domingo, 1 lunes
  return ms + ((8 - dow) % 7) * DIA_MS;
};

/** Domingo de Pascua, 'YYYY-MM-DD' (algoritmo gregoriano anónimo, de Meeus/Jones/Butcher). */
export function pascua(año: number): string {
  const a = año % 19;
  const b = Math.floor(año / 100);
  const c = año % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return aTexto(utc(año, mes, dia));
}

/**
 * Festivos de Colombia del año, ordenados por fecha, uno por fecha. Si dos caen el mismo día
 * (en 2030, Sagrado Corazón y San Pedro y San Pablo el 1 de julio) se unen con " / " (D-40),
 * porque en la base la fecha es la clave.
 */
export function festivosColombia(año: number): Festivo[] {
  const lista: Festivo[] = [];

  for (const [mes, dia, nombre] of FIJOS) {
    lista.push({ fecha: aTexto(utc(año, mes, dia)), nombre });
  }
  for (const [mes, dia, nombre] of TRASLADABLES) {
    lista.push({ fecha: aTexto(alLunes(utc(año, mes, dia))), nombre });
  }
  const domingoPascua = Date.parse(`${pascua(año)}T00:00:00Z`);
  for (const [dias, trasladar, nombre] of SEGUN_PASCUA) {
    const ms = domingoPascua + dias * DIA_MS;
    lista.push({ fecha: aTexto(trasladar ? alLunes(ms) : ms), nombre });
  }

  const porFecha = new Map<string, string>();
  for (const { fecha, nombre } of lista) {
    const previo = porFecha.get(fecha);
    porFecha.set(fecha, previo ? `${previo} / ${nombre}` : nombre);
  }
  return [...porFecha.keys()].sort().map((fecha) => ({ fecha, nombre: porFecha.get(fecha) ?? '' }));
}
