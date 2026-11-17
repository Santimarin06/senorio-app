// Mapper de la agenda del panel (RF-21, RF-22): de la fila de Supabase (snake_case) al modelo
// de la app. El anticipo solo cuenta lo aprobado (RN-09).
import { aEstadoCita } from '@/models/cita.mapper';
import type { CitaAgendaRespuesta } from '@/types/api';
import type { CitaAgenda } from '@/types/entidades';

/** Columnas de la agenda. cliente:perfiles!cliente_id trae el perfil por la llave cliente_id. */
export const SELECT_AGENDA =
  'id,inicio,fin,estado,total,profesional_id,profesionales(nombre),' +
  'cliente:perfiles!cliente_id(nombre,telefono),' +
  'cita_servicios(nombre,precio,duracion_min),comprobantes(monto,estado)';

export const mapCitaAgenda = (cita: CitaAgendaRespuesta): CitaAgenda => ({
  id: cita.id,
  inicio: cita.inicio,
  fin: cita.fin,
  estado: aEstadoCita(cita.estado),
  total: Math.round(cita.total),
  profesionalId: cita.profesional_id,
  profesional: cita.profesionales?.nombre ?? 'Profesional',
  cliente: {
    // Sin perfil visible (RLS) o sin nombre, se muestra "Cliente" en vez de un texto vacío.
    nombre: cita.cliente?.nombre.trim() || 'Cliente',
    telefono: cita.cliente?.telefono ?? '',
  },
  servicios: (cita.cita_servicios ?? []).map((s) => ({
    nombre: s.nombre,
    precio: Math.round(s.precio),
    duracionMin: s.duracion_min,
  })),
  anticipoAprobado: (cita.comprobantes ?? [])
    .filter((c) => c.estado === 'aprobado')
    .reduce((suma, c) => suma + Math.round(c.monto), 0),
});
