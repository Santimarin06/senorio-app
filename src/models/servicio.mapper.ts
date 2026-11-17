import type {
  GuardarServicioCuerpo,
  ServicioGestionRespuesta,
  ServicioRespuesta,
} from '@/types/api';
import type { Servicio, ServicioFormulario, ServicioGestion } from '@/types/entidades';

export const mapServicio = (servicio: ServicioRespuesta): Servicio => ({
  id: servicio.id,
  nombre: servicio.nombre,
  descripcion: servicio.descripcion ?? '',
  duracionMin: servicio.duracion_min,
  precio: Math.round(servicio.precio),
  esAdicional: servicio.es_adicional,
});

/** Respuesta de la gestión (RF-26): activo o no, con sus profesionales ordenados por nombre. */
export const mapServicioGestion = (servicio: ServicioGestionRespuesta): ServicioGestion => ({
  ...mapServicio(servicio),
  activo: servicio.activo,
  profesionales: (servicio.profesionales ?? [])
    .map((p) => ({ id: p.id, nombre: p.nombre, activo: p.activo }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
});

/**
 * Mapper inverso (modelo → API): parámetros de guardar_servicio. Descripción vacía = null;
 * id null crea el servicio. Los profesionales van sin repetir.
 */
export const servicioACuerpo = (id: string | null, f: ServicioFormulario): GuardarServicioCuerpo => ({
  p_id: id,
  p_nombre: f.nombre.trim(),
  p_descripcion: f.descripcion.trim() === '' ? null : f.descripcion.trim(),
  p_duracion_min: f.duracionMin,
  p_precio: f.precio,
  p_es_adicional: f.esAdicional,
  p_profesionales: [...new Set(f.profesionales)],
});
