import { estadoAnticipo, montoTrasladado } from '@/lib/comprobante';
import type { CitaRespuesta, ComprobanteRespuesta, ReagendarRespuesta } from '@/types/api';
import type {
  Cita,
  Comprobante,
  EstadoAnticipo,
  EstadoCita,
  EstadoComprobante,
  MedioPago,
  ResultadoReagendar,
} from '@/types/entidades';

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

/**
 * Un estado desconocido no se inventa como otro: se trata como "Por marcar" para que el
 * local lo revise, que es el estado que pide una acción.
 */
export const aEstadoCita = (valor: string): EstadoCita => (esEstadoCita(valor) ? valor : 'por_marcar');

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

/** Etiqueta del estado del anticipo (D-15). */
export const ETIQUETA_ANTICIPO: Record<EstadoAnticipo, string> = {
  sin_anticipo: 'Sin anticipo',
  pendiente: 'Pendiente de revisión',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
};

/** Columnas que pide la app: la misma consulta sirve para la lista y para el detalle. */
export const SELECT_CITA =
  'id,inicio,fin,estado,total,profesional_id,reagendada_desde,devolucion_elegida_en,' +
  'profesionales(nombre),cita_servicios(nombre,precio,duracion_min),' +
  'comprobantes(id,tipo,monto,estado,nota_rechazo,archivo_path,metodo,subido_en,' +
  'trasladado_desde,devolucion_monto)';

const ESTADOS_COMPROBANTE: readonly EstadoComprobante[] = ['pendiente', 'aprobado', 'rechazado'];
const MEDIOS: readonly MedioPago[] = ['nequi', 'bold', 'bancolombia'];

export const mapComprobante = (c: ComprobanteRespuesta): Comprobante => ({
  id: c.id,
  tipo: c.tipo === 'total' ? 'total' : 'abono',
  monto: Math.round(c.monto),
  // Un estado desconocido no cuenta como pagado: se trata como pendiente (RN-09).
  estado: ESTADOS_COMPROBANTE.find((e) => e === c.estado) ?? 'pendiente',
  notaRechazo: c.nota_rechazo?.trim() || null,
  archivoPath: c.archivo_path,
  metodo: MEDIOS.find((m) => m === c.metodo) ?? null,
  subidoEn: c.subido_en,
  trasladado: c.trasladado_desde != null,
  devolucionMonto: c.devolucion_monto == null ? null : Math.round(c.devolucion_monto),
});

export const mapCita = (cita: CitaRespuesta): Cita => {
  const comprobantes = (cita.comprobantes ?? []).map(mapComprobante);
  return {
    id: cita.id,
    inicio: cita.inicio,
    fin: cita.fin,
    estado: aEstadoCita(cita.estado),
    total: Math.round(cita.total),
    profesional: cita.profesionales?.nombre ?? 'Profesional',
    servicios: (cita.cita_servicios ?? []).map((s) => ({
      nombre: s.nombre,
      precio: Math.round(s.precio),
      duracionMin: s.duracion_min,
    })),
    anticipoAprobado: comprobantes
      .filter((c) => c.estado === 'aprobado')
      .reduce((suma, c) => suma + c.monto, 0),
    anticipo: estadoAnticipo(comprobantes),
    profesionalId: cita.profesional_id,
    anticipoTrasladado: montoTrasladado(comprobantes),
    reagendadaDesde: cita.reagendada_desde ?? null,
    devolucionElegidaEn: cita.devolucion_elegida_en ?? null,
    devolucionRegistrada: comprobantes.some(
      (c) => c.estado === 'aprobado' && c.devolucionMonto !== null,
    ),
  };
};

/**
 * Respuesta de reagendar_cita (RF-14). Sin id de la cita nueva o con un caso desconocido se
 * lanza un error: nunca se muestra como reagendada una cita que la base no confirmó (RN-14).
 */
export const mapReagendar = (r: ReagendarRespuesta): ResultadoReagendar => {
  if (!r.cita_id || (r.caso !== 'futura' && r.caso !== 'no_asistida')) {
    throw new Error('La base no confirmó el reagendamiento.');
  }
  return {
    citaId: r.cita_id,
    caso: r.caso,
    anticipoTrasladado: Math.round(r.anticipo_trasladado),
    diferencia: Math.round(r.diferencia),
  };
};

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
