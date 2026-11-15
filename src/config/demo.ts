// Usuarios del modo demostración (D-19, D-20). No son cuentas reales: no tienen contraseña
// ni existen en Supabase. Sirven para recorrer la navegación de cada rol hasta que exista RF-01.
import type { Rol, Usuario } from '@/types/sesion';

export const USUARIOS_DEMO: Record<Rol, Usuario> = {
  cliente: { id: 'demo-cliente', nombre: 'Cliente de prueba', rol: 'cliente' },
  profesional: { id: 'demo-profesional', nombre: 'Profesional de prueba', rol: 'profesional' },
  administrador: { id: 'demo-administrador', nombre: 'Administrador de prueba', rol: 'administrador' },
};

export const ETIQUETA_ROL: Record<Rol, string> = {
  cliente: 'cliente',
  profesional: 'profesional',
  administrador: 'administrador',
};
