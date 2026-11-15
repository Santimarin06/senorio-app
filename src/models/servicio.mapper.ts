import type { ServicioRespuesta } from '@/types/api';
import type { Servicio } from '@/types/entidades';

export const mapServicio = (servicio: ServicioRespuesta): Servicio => ({
  id: servicio.id,
  nombre: servicio.nombre,
  descripcion: servicio.descripcion ?? '',
  duracionMin: servicio.duracion_min,
  precio: Math.round(servicio.precio),
  esAdicional: servicio.es_adicional,
});
