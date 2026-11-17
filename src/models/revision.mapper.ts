// Mappers de la revisión del administrador (RF-25, RF-28): de las filas de Supabase
// (snake_case) a los modelos de la app. Una fila sin su cita (no debería pasar: el
// administrador ve todas) se descarta en lugar de inventar datos.
import { NEGOCIO } from '@/config/negocio';
import { aEstadoCita } from '@/models/cita.mapper';
import type {
  CitaRevisionRespuesta,
  ComprobanteRevisionRespuesta,
  MultaRevisionRespuesta,
} from '@/types/api';
import type {
  CitaRevision,
  ComprobanteRevision,
  DevolucionPendiente,
  EstadoMulta,
  MedioPago,
  MotivoMulta,
  MultaRevision,
} from '@/types/entidades';

const CITA = 'citas(id,inicio,estado,total,profesionales(nombre))';

/** Columnas del comprobante. perfiles!cliente_id: la tabla tiene dos llaves a perfiles. */
export const SELECT_COMPROBANTE_REVISION =
  `id,tipo,monto,metodo,subido_en,archivo_path,cliente:perfiles!cliente_id(nombre,telefono),${CITA}`;

export const SELECT_MULTA_REVISION =
  `id,motivo,monto,estado,resuelta_en,cliente:perfiles!cliente_id(nombre),${CITA}`;

const MEDIOS: readonly MedioPago[] = ['nequi', 'bold', 'bancolombia'];
const ESTADOS_MULTA: readonly EstadoMulta[] = ['pendiente', 'cobrada_anticipo', 'pagada', 'perdonada'];

/** Etiqueta del estado de la multa (D-15). */
export const ETIQUETA_MULTA: Record<EstadoMulta, string> = {
  pendiente: 'Pendiente',
  cobrada_anticipo: 'Cobrada del anticipo',
  pagada: 'Pagada',
  perdonada: 'Perdonada',
};

/** Motivo de la multa en palabras; lo comparten la Revisión y la Cuenta del cliente (RF-15, RF-25). */
export const MOTIVO_MULTA: Record<MotivoMulta, string> = {
  no_asistio: 'No asistió',
  cancelo_tarde: `Canceló con menos de ${NEGOCIO.horasMinimasCancelarSinMulta} h`,
};

const nombreCliente = (c: { nombre: string } | null): string => c?.nombre.trim() || 'Cliente';

const mapCitaRevision = (c: CitaRevisionRespuesta): CitaRevision => ({
  id: c.id,
  inicio: c.inicio,
  estado: aEstadoCita(c.estado),
  total: Math.round(c.total),
  profesional: c.profesionales?.nombre ?? 'Profesional',
});

export const mapComprobanteRevision = (f: ComprobanteRevisionRespuesta): ComprobanteRevision | null =>
  f.citas
    ? {
        id: f.id,
        tipo: f.tipo === 'total' ? 'total' : 'abono',
        monto: Math.round(f.monto),
        metodo: MEDIOS.find((m) => m === f.metodo) ?? null,
        subidoEn: f.subido_en,
        archivoPath: f.archivo_path,
        cliente: nombreCliente(f.cliente),
        cita: mapCitaRevision(f.citas),
      }
    : null;

export const mapMultaRevision = (f: MultaRevisionRespuesta): MultaRevision | null =>
  f.citas
    ? {
        id: f.id,
        motivo: f.motivo === 'cancelo_tarde' ? 'cancelo_tarde' : 'no_asistio',
        monto: Math.round(f.monto),
        // Un estado desconocido se trata como pendiente: es el que pide una acción.
        estado: ESTADOS_MULTA.find((e) => e === f.estado) ?? 'pendiente',
        resueltaEn: f.resuelta_en,
        cliente: nombreCliente(f.cliente),
        cita: mapCitaRevision(f.citas),
      }
    : null;

/** El comprobante aprobado de una cita cancelada o no asistida es la devolución pendiente. */
export const mapDevolucionPendiente = (f: ComprobanteRevisionRespuesta): DevolucionPendiente | null =>
  f.citas
    ? {
        comprobanteId: f.id,
        anticipoAprobado: Math.round(f.monto),
        cliente: nombreCliente(f.cliente),
        telefono: f.cliente?.telefono ?? '',
        cita: mapCitaRevision(f.citas),
      }
    : null;

/** Quita los null de los mappers sin perder el tipo. */
export const sinNulos = <T>(lista: (T | null)[]): T[] => lista.filter((x): x is T => x !== null);
