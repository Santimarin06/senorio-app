// Días de trabajo y bloqueos del administrador (RF-24, RN-01, RN-10, D-09, D-24, D-41).
// Funciones puras: reciben las fechas y "ahora" para poder probarlas. Las horas se manejan en
// minutos desde medianoche, hora de Bogotá, sin depender de la zona del teléfono.
import { DISPONIBILIDAD, HORARIO, NEGOCIO } from '@/config/negocio';
import {
  aBogota,
  diaSemana,
  instanteDeFranja,
  sumarDias,
  ventanaDelDia,
  type HorarioEspecial,
  type VentanaDia,
} from '@/lib/disponibilidad';
import { festivosColombia } from '@/lib/festivos';

/** Horario normal en una línea, tomado de HORARIO (mockup "Días laborables"). */
export const TEXTO_HORARIO_NORMAL =
  `Lun–jue ${HORARIO.semana.apertura}–${HORARIO.semana.cierre} · ` +
  `Vie–sáb ${HORARIO.viernesSabado.apertura}–${HORARIO.viernesSabado.cierre}. ` +
  'Domingos y festivos cerrados por defecto. ' +
  `Almuerzo ${HORARIO.almuerzo.inicio}–${HORARIO.almuerzo.fin} bloqueado, incluso en días habilitados.`;

// ---------- Horas ----------

/** "9:00" o "09:00" a minutos desde medianoche; null si no es una hora válida de 00:00 a 23:59. */
export const parsearHora = (texto: string): number | null => {
  const partes = /^(\d{1,2}):(\d{2})$/.exec(texto.trim());
  if (!partes) return null;
  const horas = Number(partes[1]);
  const minutos = Number(partes[2]);
  if (horas > 23 || minutos > 59) return null;
  return horas * 60 + minutos;
};

/** Minutos desde medianoche a "HH:MM" (24 horas), como lo guarda la base y lo escribe el administrador. */
export const horaTexto = (minutos: number): string =>
  `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`;

export type ResultadoHoras =
  | { ok: true; inicioMin: number; finMin: number }
  | { ok: false; error: string };

/**
 * Valida un par de horas escritas por el administrador: formato HH:MM, en pasos de 15 minutos
 * (las franjas van cada 15 min, D-07) y el fin posterior al inicio.
 */
export const validarHoras = (inicioTexto: string, finTexto: string): ResultadoHoras => {
  const inicioMin = parsearHora(inicioTexto);
  const finMin = parsearHora(finTexto);
  if (inicioMin === null || finMin === null) {
    return { ok: false, error: 'Escribe las horas en formato 24 horas, por ejemplo 10:00 o 16:30.' };
  }
  const paso = NEGOCIO.pasoFranjaMinutos;
  if (inicioMin % paso !== 0 || finMin % paso !== 0) {
    return { ok: false, error: `Usa horas en pasos de ${paso} minutos (:00, :15, :30 o :45).` };
  }
  if (finMin <= inicioMin) {
    return { ok: false, error: 'La hora final debe ser posterior a la inicial.' };
  }
  return { ok: true, inicioMin, finMin };
};

/**
 * Horario especial de un día (dias_habilitados): además de validarHoras, la jornada debe dejar
 * tiempo fuera del almuerzo, que sigue bloqueado aunque el día esté habilitado (RN-01, D-09).
 */
export const validarJornada = (aperturaTexto: string, cierreTexto: string): ResultadoHoras => {
  const horas = validarHoras(aperturaTexto, cierreTexto);
  if (!horas.ok) return horas;
  const { inicioMin, finMin } = DISPONIBILIDAD.ALMUERZO;
  if (horas.inicioMin >= inicioMin && horas.finMin <= finMin) {
    return { ok: false, error: 'Ese horario queda dentro del almuerzo (12:00 a 13:00): no habría citas.' };
  }
  return horas;
};

// ---------- Domingos y festivos ----------

export interface DiaCerradoPorDefecto {
  fecha: string;
  /** Nombre del festivo, o null si es un domingo que no es festivo. */
  festivo: string | null;
}

/** Festivos de Colombia de los años que toca el rango, por fecha (D-32). */
export const festivosDelRango = (desde: string, hasta: string): Map<string, string> => {
  const mapa = new Map<string, string>();
  for (let año = Number(desde.slice(0, 4)); año <= Number(hasta.slice(0, 4)); año++) {
    for (const { fecha, nombre } of festivosColombia(año)) mapa.set(fecha, nombre);
  }
  return mapa;
};

/**
 * Domingos y festivos desde una fecha (incluida) durante `dias` días: los días que el local
 * no atiende salvo que el administrador los habilite (RN-10).
 */
export const domingosYFestivos = (desde: string, dias: number): DiaCerradoPorDefecto[] => {
  const hasta = sumarDias(desde, dias);
  const festivos = festivosDelRango(desde, hasta);
  const lista: DiaCerradoPorDefecto[] = [];
  for (let fecha = desde; fecha < hasta; fecha = sumarDias(fecha, 1)) {
    const festivo = festivos.get(fecha) ?? null;
    if (festivo !== null || diaSemana(fecha) === 0) lista.push({ fecha, festivo });
  }
  return lista;
};

/** Horario de un día sin excepciones: el normal, o null si es domingo o festivo (RN-01, RN-10). */
export const horarioNormal = (fecha: string, festivos: ReadonlySet<string>): VentanaDia | null =>
  ventanaDelDia(fecha, festivos, new Set());

/** Horario que rige ese día: la excepción de dias_habilitados manda sobre el normal (D-24). */
export const horarioVigente = (
  fecha: string,
  festivos: ReadonlySet<string>,
  especial: HorarioEspecial | undefined,
): VentanaDia | null => (especial ? (especial.abierto ? especial : null) : horarioNormal(fecha, festivos));

/** "09:00–19:30" o "Cerrado". */
export const textoVentana = (ventana: VentanaDia | null): string =>
  ventana ? `${horaTexto(ventana.abreMin)}–${horaTexto(ventana.cierraMin)}` : 'Cerrado';

// ---------- Avisos de citas ----------

type CitaConHoras = { inicio: string; fin: string };

/**
 * Citas que quedarían fuera de un nuevo horario del día (todas, si el día se cierra). No se
 * cancelan: la pantalla solo avisa para que el administrador las resuelva con el cliente.
 */
export const citasFueraDeHorario = <T extends CitaConHoras>(
  citas: readonly T[],
  fecha: string,
  ventana: VentanaDia | null,
): T[] =>
  citas.filter((cita) => {
    const inicio = aBogota(new Date(cita.inicio));
    if (inicio.fecha !== fecha) return false;
    if (!ventana) return true;
    const finMin = inicio.minutos + (Date.parse(cita.fin) - Date.parse(cita.inicio)) / 60_000;
    return inicio.minutos < ventana.abreMin || finMin > ventana.cierraMin;
  });

export interface RangoBloqueo {
  /** Instantes UTC (ISO). */
  inicio: string;
  fin: string;
  /** null = todo el local. */
  profesionalId: string | null;
}

/** Citas que caen dentro de un bloqueo: del mismo profesional (o de todos) y que se solapan. */
export const citasEnBloqueo = <T extends CitaConHoras & { profesionalId: string }>(
  citas: readonly T[],
  bloqueo: RangoBloqueo,
): T[] => {
  const ini = Date.parse(bloqueo.inicio);
  const fin = Date.parse(bloqueo.fin);
  return citas.filter(
    (c) =>
      (bloqueo.profesionalId === null || c.profesionalId === bloqueo.profesionalId) &&
      Date.parse(c.inicio) < fin &&
      ini < Date.parse(c.fin),
  );
};

// ---------- Bloqueos ----------

export const MOTIVO_MAXIMO = 120;

export type ResultadoBloqueo =
  | { ok: true; inicio: string; fin: string; motivo: string }
  | { ok: false; error: string };

/**
 * Valida un bloqueo escrito por el administrador: fecha de hoy en adelante, horas válidas en
 * el mismo día, que no haya terminado ya y con motivo. Devuelve los instantes UTC a guardar.
 */
export const validarBloqueo = (
  datos: { fecha: string; inicio: string; fin: string; motivo: string },
  ahoraMs: number,
): ResultadoBloqueo => {
  const hoy = aBogota(new Date(ahoraMs)).fecha;
  if (datos.fecha < hoy) return { ok: false, error: 'Esa fecha ya pasó.' };
  const horas = validarHoras(datos.inicio, datos.fin);
  if (!horas.ok) return horas;
  const motivo = datos.motivo.trim();
  if (motivo === '') return { ok: false, error: 'Escribe el motivo, por ejemplo "Día libre".' };
  if (motivo.length > MOTIVO_MAXIMO) {
    return { ok: false, error: `El motivo admite hasta ${MOTIVO_MAXIMO} caracteres.` };
  }
  const fin = instanteDeFranja(datos.fecha, horas.finMin);
  if (Date.parse(fin) <= ahoraMs) return { ok: false, error: 'Ese horario ya pasó.' };
  return { ok: true, inicio: instanteDeFranja(datos.fecha, horas.inicioMin), fin, motivo };
};

/** ¿Es una fecha 'YYYY-MM-DD' que existe? (rechaza 2026-02-30 y textos sueltos de la ruta). */
export const esFechaValida = (fecha: string): boolean =>
  /^\d{4}-\d{2}-\d{2}$/.test(fecha) && sumarDias(fecha, 0) === fecha;
