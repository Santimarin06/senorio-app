// Guarda la sesión en el teléfono para que siga abierta al cerrar y volver a abrir la app.
// En Android e iOS usa expo-secure-store (cifrado); en web, localStorage, como en la guía de
// autenticación de Expo Router. Tokens y perfil van en claves separadas para no superar el
// tamaño recomendado por valor de SecureStore.
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type { Rol, Tokens, Usuario } from '@/types/sesion';

const CLAVE_TOKENS = 'senorio.sesion.tokens';
const CLAVE_PERFIL = 'senorio.sesion.perfil';

async function leer(clave: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return typeof localStorage === 'undefined' ? null : localStorage.getItem(clave);
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(clave);
}

async function escribir(clave: string, valor: string | null): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      if (valor === null) localStorage.removeItem(clave);
      else localStorage.setItem(clave, valor);
    } catch {
      // Sin almacenamiento en web la sesión dura solo mientras la pestaña esté abierta.
    }
    return;
  }
  if (valor === null) await SecureStore.deleteItemAsync(clave);
  else await SecureStore.setItemAsync(clave, valor);
}

const esTokens = (v: unknown): v is Tokens =>
  typeof v === 'object' &&
  v !== null &&
  typeof (v as Tokens).accessToken === 'string' &&
  typeof (v as Tokens).refreshToken === 'string' &&
  typeof (v as Tokens).expiraEn === 'number';

const ROLES: readonly Rol[] = ['cliente', 'profesional', 'administrador'];
const esUsuario = (v: unknown): v is Usuario =>
  typeof v === 'object' &&
  v !== null &&
  typeof (v as Usuario).id === 'string' &&
  typeof (v as Usuario).nombre === 'string' &&
  ROLES.includes((v as Usuario).rol) &&
  // Una sesión guardada antes de existir profesionalId se descarta: se vuelve a iniciar sesión.
  (typeof (v as Usuario).profesionalId === 'string' || (v as Usuario).profesionalId === null);

const parsear = (texto: string | null): unknown => {
  if (!texto) return null;
  try {
    return JSON.parse(texto);
  } catch {
    return null;
  }
};

export async function guardarSesion(tokens: Tokens, usuario: Usuario): Promise<void> {
  await escribir(CLAVE_TOKENS, JSON.stringify(tokens));
  await escribir(CLAVE_PERFIL, JSON.stringify(usuario));
}

export async function guardarTokens(tokens: Tokens): Promise<void> {
  await escribir(CLAVE_TOKENS, JSON.stringify(tokens));
}

/** Sesión guardada, o null si no hay o está dañada. */
export async function leerSesion(): Promise<{ tokens: Tokens; usuario: Usuario } | null> {
  const [tokens, usuario] = await Promise.all([leer(CLAVE_TOKENS), leer(CLAVE_PERFIL)]).then(
    ([t, u]) => [parsear(t), parsear(u)] as const,
  );
  return esTokens(tokens) && esUsuario(usuario) ? { tokens, usuario } : null;
}

export async function borrarSesion(): Promise<void> {
  await Promise.all([escribir(CLAVE_TOKENS, null), escribir(CLAVE_PERFIL, null)]);
}
