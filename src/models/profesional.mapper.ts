// Mapper: adapta la respuesta de Supabase al modelo de la app (como movie.mapper.ts).
import { mapServicio } from '@/models/servicio.mapper';
import type { ProfesionalDetalleRespuesta, ProfesionalRespuesta } from '@/types/api';
import type { Profesional, ProfesionalDetalle } from '@/types/entidades';

const fotoOAlternativa = (url: string | null): string | null =>
  url && url.trim() !== '' ? url : null;

export const mapProfesional = (profesional: ProfesionalRespuesta): Profesional => ({
  id: profesional.id,
  nombre: profesional.nombre,
  cargo: profesional.cargo ?? 'Profesional',
  foto: fotoOAlternativa(profesional.foto_url),
});

export const mapProfesionalDetalle = (
  profesional: ProfesionalDetalleRespuesta,
): ProfesionalDetalle => ({
  ...mapProfesional(profesional),
  servicios: (profesional.servicios ?? []).filter((s) => s.activo).map(mapServicio),
});
