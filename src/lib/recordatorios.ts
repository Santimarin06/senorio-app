// Recordatorios y avisos del profesional (RF-30, D-10, D-47). Funciones puras: reciben "ahora"
// en milisegundos y lo que ya está programado en el teléfono, y devuelven qué hacer. El hook
// useRecordatorios ejecuta el plan con expo-notifications.
import { RECORDATORIOS } from '@/config/negocio';
import { formatoFechaHoraBogota, mayuscula } from '@/lib/fechas';
import { horaBogota } from '@/lib/agenda';
import type { Aviso, EstadoCita, TipoAviso } from '@/types/entidades';

const MS_MINUTO = 60 * 1000;
const MS_HORA = 60 * MS_MINUTO;

/** Prefijo de los identificadores de los recordatorios programados. */
export const PREFIJO_RECORDATORIO = 'recordatorio:';

/**
 * Identificador estable del recordatorio de una cita: si la cita cambia de hora, cambia el id,
 * así el viejo se cancela y el nuevo se programa sin duplicar.
 */
export const idRecordatorio = (citaId: string, inicioIso: string): string =>
  `${PREFIJO_RECORDATORIO}${citaId}:${Date.parse(inicioIso)}`;

/** Identificador de la notificación local de un aviso: Android reemplaza en vez de repetir. */
export const idAviso = (avisoId: string): string => `aviso:${avisoId}`;

/** Lo que el plan necesita de una cita de la agenda. */
export interface CitaParaRecordar {
  id: string;
  inicio: string;
  estado: EstadoCita;
  cliente: { nombre: string };
  servicios: { nombre: string }[];
}

export interface RecordatorioPorProgramar {
  id: string;
  /** Instante en que debe sonar (ms). */
  fechaMs: number;
  titulo: string;
  cuerpo: string;
}

export interface PlanRecordatorios {
  programar: RecordatorioPorProgramar[];
  /** Identificadores de recordatorios que ya no corresponden. */
  cancelar: string[];
}

const listaServicios = (servicios: { nombre: string }[]): string =>
  servicios.map((s) => s.nombre).join(', ');

/** Instante en que suena el recordatorio de una cita: 30 minutos antes. */
export const momentoRecordatorio = (inicioIso: string): number =>
  Date.parse(inicioIso) - RECORDATORIOS.minutosAntes * MS_MINUTO;

/**
 * Compara las citas futuras con los recordatorios programados en el teléfono:
 * - programa las citas confirmadas cuyo recordatorio aún no ha pasado y que no estén ya;
 * - cancela los recordatorios cuya cita ya no está (cancelada, reagendada) o cambió de hora.
 * Los identificadores que no son recordatorios (por ejemplo, avisos) no se tocan.
 */
export const planRecordatorios = (
  citas: readonly CitaParaRecordar[],
  programados: readonly string[],
  ahoraMs: number,
): PlanRecordatorios => {
  const deseados = new Map<string, RecordatorioPorProgramar>();
  for (const cita of citas) {
    const fechaMs = momentoRecordatorio(cita.inicio);
    if (cita.estado !== 'confirmada' || fechaMs <= ahoraMs) continue;
    const servicios = listaServicios(cita.servicios);
    deseados.set(idRecordatorio(cita.id, cita.inicio), {
      id: idRecordatorio(cita.id, cita.inicio),
      fechaMs,
      titulo: `Cita a las ${horaBogota(cita.inicio)}`,
      cuerpo: `${cita.cliente.nombre} llega en ${RECORDATORIOS.minutosAntes} minutos${servicios ? ` · ${servicios}` : ''}.`,
    });
  }

  const yaProgramados = new Set(programados);
  return {
    programar: [...deseados.values()].filter((r) => !yaProgramados.has(r.id)),
    cancelar: programados.filter((id) => id.startsWith(PREFIJO_RECORDATORIO) && !deseados.has(id)),
  };
};

const TITULO_AVISO: Record<TipoAviso, string> = {
  cita_nueva: 'Cita nueva',
  cita_reagendada: 'Cita reagendada',
  cita_cancelada: 'Cita cancelada',
};

/** Título y texto de un aviso, armados con su cita en hora de Bogotá. */
export const textoAviso = (aviso: Aviso): { titulo: string; cuerpo: string } => {
  const titulo = TITULO_AVISO[aviso.tipo];
  if (!aviso.cita) return { titulo, cuerpo: 'Abre tu agenda para ver el detalle.' };
  const servicios = aviso.cita.servicios.join(', ');
  const cuando = mayuscula(formatoFechaHoraBogota(aviso.cita.inicio));
  return {
    titulo,
    cuerpo: `${aviso.cita.cliente} · ${cuando}${servicios ? ` · ${servicios}` : ''}`,
  };
};

/**
 * Avisos que el teléfono aún no ha mostrado. Solo se notifican los recientes (24 h); los más
 * viejos (por ejemplo, al iniciar sesión tras días sin abrir la app) se marcan como mostrados
 * sin notificar, para no llenar la bandeja. Todos siguen en la lista de la tab.
 */
export const avisosPorMostrar = (
  avisos: readonly Aviso[],
  ahoraMs: number,
): { notificar: Aviso[]; marcarSinNotificar: Aviso[] } => {
  const limite = ahoraMs - RECORDATORIOS.horasAvisoReciente * MS_HORA;
  const pendientes = avisos.filter((a) => !a.mostrada);
  return {
    notificar: pendientes.filter((a) => Date.parse(a.creadaEn) >= limite),
    marcarSinNotificar: pendientes.filter((a) => Date.parse(a.creadaEn) < limite),
  };
};

/** "Hace 5 min", "Hace 3 h", "Hace 2 días" (o "Ahora"). */
export const haceCuanto = (iso: string, ahoraMs: number): string => {
  const minutos = Math.max(0, Math.floor((ahoraMs - Date.parse(iso)) / MS_MINUTO));
  if (minutos < 1) return 'Ahora';
  if (minutos < 60) return `Hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `Hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  return `Hace ${dias} ${dias === 1 ? 'día' : 'días'}`;
};
