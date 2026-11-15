import type { CitaRespuesta } from '@/types/api';
import type { Cita, EstadoCita } from '@/types/entidades';

const ESTADOS: readonly EstadoCita[] = [
  'confirmada',
  'por_marcar',
  'asistida',
  'no_asistida',
  'cancelada_a_tiempo',
  'cancelada_tarde',
  'reagendada',
];

const esEstadoCita = (valor: string): valor is EstadoCita =>
  (ESTADOS as readonly string[]).includes(valor);

/** Etiqueta para mostrar el estado (D-15). */
export const ETIQUETA_ESTADO: Record<EstadoCita, string> = {
  confirmada: 'Confirmada',
  por_marcar: 'Por marcar',
  asistida: 'Asistida',
  no_asistida: 'No asistida',
  cancelada_a_tiempo: 'Cancelada a tiempo',
  cancelada_tarde: 'Cancelada tarde',
  reagendada: 'Reagendada',
};

export const mapCita = (cita: CitaRespuesta): Cita => ({
  id: cita.id,
  inicio: cita.inicio,
  fin: cita.fin,
  // Un estado desconocido no se inventa como otro: se trata como "Por marcar" para que el
  // local lo revise, que es el estado que pide una acción.
  estado: esEstadoCita(cita.estado) ? cita.estado : 'por_marcar',
  total: Math.round(cita.total),
  profesional: cita.profesionales?.nombre ?? 'Profesional',
});
