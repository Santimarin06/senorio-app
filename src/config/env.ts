// Lectura tipada de las variables EXPO_PUBLIC_* (ver .env.template).
// Estas variables viajan dentro de la app: no son secretos. Solo la anon key, protegida con RLS.

const leer = (valor: string | undefined): string => valor?.trim() ?? '';

export const env = {
  supabaseUrl: leer(process.env.EXPO_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: leer(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY),
};

/** true cuando falta configurar Supabase en .env; las pantallas lo muestran como error. */
export const faltaConfiguracion = env.supabaseUrl === '' || env.supabaseAnonKey === '';
