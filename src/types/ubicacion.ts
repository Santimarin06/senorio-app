// Igual que en el proyecto Mapas (infrastructure/interfaces).

export interface LatLng {
  latitude: number;
  longitude: number;
}

/** Estado del permiso de ubicación en primer plano. */
export enum EstadoPermiso {
  VERIFICANDO = 'VERIFICANDO',
  CONCEDIDO = 'CONCEDIDO',
  /** Se puede volver a pedir con el diálogo del sistema. */
  DENEGADO = 'DENEGADO',
  /** El sistema ya no muestra el diálogo: solo desde Ajustes. */
  BLOQUEADO = 'BLOQUEADO',
  SIN_PREGUNTAR = 'SIN_PREGUNTAR',
}
