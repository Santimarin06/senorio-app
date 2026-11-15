// Token vigente para las peticiones a Supabase. Si está por vencer lo renueva una sola vez
// aunque varias peticiones lo pidan a la vez. Si Supabase rechaza la renovación (sesión
// revocada), cierra la sesión local; si solo falta conexión, deja la sesión como está.
import { isAxiosError } from 'axios';

import { debeRefrescar } from '@/lib/sesion';
import { borrarSesion, guardarTokens } from '@/services/almacenamientoSesion';
import { renovar } from '@/services/auth.api';
import { useSesionStore } from '@/store/useSesionStore';

let renovacionEnCurso: Promise<string | null> | null = null;

async function renovarUnaVez(refreshToken: string): Promise<string | null> {
  try {
    const tokens = await renovar(refreshToken);
    useSesionStore.getState().actualizarTokens(tokens);
    await guardarTokens(tokens);
    return tokens.accessToken;
  } catch (error) {
    if (isAxiosError(error) && error.response && error.response.status < 500) {
      await borrarSesion();
      useSesionStore.getState().limpiar();
      return null;
    }
    // Sin conexión: se usa el token que hay; la petición fallará con su propio mensaje.
    return useSesionStore.getState().tokens?.accessToken ?? null;
  } finally {
    renovacionEnCurso = null;
  }
}

/** Access token para el encabezado Authorization, o null si no hay sesión. */
export async function tokenVigente(): Promise<string | null> {
  const { tokens } = useSesionStore.getState();
  if (!tokens) return null;
  if (!debeRefrescar(tokens.expiraEn, Date.now())) return tokens.accessToken;
  renovacionEnCurso ??= renovarUnaVez(tokens.refreshToken);
  return renovacionEnCurso;
}
