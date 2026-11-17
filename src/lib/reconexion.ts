// Recuperar la app cuando vuelve la conexión (RN-14, lineamientos §6). Sin NetInfo no se sabe
// cuándo vuelve internet, así que una consulta que falló se vuelve a pedir cada cierto tiempo
// mientras su pantalla esté abierta. Al primer acierto deja de repetirse y la pantalla se ve normal.

/** Cada cuánto se reintenta una consulta con error mientras su pantalla está abierta. */
export const REINTENTO_SIN_CONEXION_MS = 15_000;

/** Intervalo de refresco según el estado de la consulta: solo se repite si falló. */
export const intervaloDeReintento = (estado: 'pending' | 'error' | 'success'): number | false =>
  estado === 'error' ? REINTENTO_SIN_CONEXION_MS : false;

