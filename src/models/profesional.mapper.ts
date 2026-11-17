// Mapper: adapta la respuesta de Supabase al modelo de la app (como movie.mapper.ts).
import { mapServicio } from '@/models/servicio.mapper';
import type {
  CuentaRespuesta,
  GuardarProfesionalCuerpo,
  ProfesionalDetalleRespuesta,
  ProfesionalGestionRespuesta,
  ProfesionalRespuesta,
} from '@/types/api';
import type {
  CuentaUsuario,
  Profesional,
  ProfesionalDetalle,
  ProfesionalFormulario,
  ProfesionalGestion,
} from '@/types/entidades';

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

/** Perfil de usuario para el administrador (RF-29). Correo y teléfono vacíos si faltan. */
export const mapCuenta = (cuenta: CuentaRespuesta): CuentaUsuario => ({
  id: cuenta.id,
  nombre: cuenta.nombre.trim() === '' ? 'Sin nombre' : cuenta.nombre,
  correo: cuenta.correo ?? '',
  telefono: cuenta.telefono ?? '',
});

/** Respuesta de la gestión (RF-29): activo o no, servicios por nombre y cuenta vinculada. */
export const mapProfesionalGestion = (p: ProfesionalGestionRespuesta): ProfesionalGestion => {
  // PostgREST puede embeber la cuenta como objeto (relación uno a uno) o como lista.
  const cuenta = Array.isArray(p.perfiles) ? (p.perfiles[0] ?? null) : p.perfiles;
  return {
    ...mapProfesional(p),
    activo: p.activo,
    cargoGuardado: p.cargo ?? '',
    servicios: (p.servicios ?? [])
      .map((s) => ({ id: s.id, nombre: s.nombre, esAdicional: s.es_adicional, activo: s.activo }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    cuenta: cuenta ? mapCuenta(cuenta) : null,
  };
};

/**
 * Mapper inverso (modelo → API): parámetros de guardar_profesional. Cargo vacío = null;
 * id null crea la ficha. Los servicios van sin repetir.
 */
export const profesionalACuerpo = (
  id: string | null,
  f: ProfesionalFormulario,
): GuardarProfesionalCuerpo => ({
  p_id: id,
  p_nombre: f.nombre.trim(),
  p_cargo: f.cargo.trim() === '' ? null : f.cargo.trim(),
  p_foto_url: f.foto,
  p_servicios: [...new Set(f.servicios)],
  p_usuario: f.usuarioId,
});
