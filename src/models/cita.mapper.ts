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

/** Columnas que pide la app: la misma consulta sirve para la lista y para el detalle. */
export const SELECT_CITA =
  'id,inicio,fin,estado,total,profesionales(nombre),cita_servicios(nombre,precio,duracion_min),comprobantes(monto,estado)';

export const mapCita = (cita: CitaRespuesta): Cita => ({
  id: cita.id,
  inicio: cita.inicio,
  fin: cita.fin,
  // Un estado desconocido no se inventa como otro: se trata como "Por marcar" para que el
  // local lo revise, que es el estado que pide una acción.
  estado: esEstadoCita(cita.estado) ? cita.estado : 'por_marcar',
  total: Math.round(cita.total),
  profesional: cita.profesionales?.nombre ?? 'Profesional',
  servicios: (cita.cita_servicios ?? []).map((s) => ({
    nombre: s.nombre,
    precio: Math.round(s.precio),
    duracionMin: s.duracion_min,
  })),
  anticipoAprobado: (cita.comprobantes ?? [])
    .filter((c) => c.estado === 'aprobado')
    .reduce((suma, c) => suma + Math.round(c.monto), 0),
});

/** Estados que todavía ocupan agenda y pueden venir: van en "Próximas" (RF-08). */
const PENDIENTES: readonly EstadoCita[] = ['confirmada', 'por_marcar'];

/** RF-08: próximas (de la más cercana a la más lejana) y pasadas (de la más reciente a la más antigua). */
export const separarCitas = (citas: readonly Cita[], ahoraMs: number) => {
  const proximas = citas
    .filter((c) => PENDIENTES.includes(c.estado) && Date.parse(c.fin) > ahoraMs)
    .sort((a, b) => Date.parse(a.inicio) - Date.parse(b.inicio));
  const ids = new Set(proximas.map((c) => c.id));
  const pasadas = citas
    .filter((c) => !ids.has(c.id))
    .sort((a, b) => Date.parse(b.inicio) - Date.parse(a.inicio));
  return { proximas, pasadas };
};
