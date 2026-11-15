// Acciones de permisos (como core/actions/permissions/location.ts en Mapas).
// A diferencia de clase, distingue "denegado" (se puede volver a pedir) de "bloqueado" (solo Ajustes).
import * as Location from 'expo-location';
import { Linking } from 'react-native';

import { EstadoPermiso } from '@/types/ubicacion';

const traducir = (respuesta: Location.LocationPermissionResponse): EstadoPermiso => {
  if (respuesta.status === Location.PermissionStatus.GRANTED) return EstadoPermiso.CONCEDIDO;
  if (respuesta.status === Location.PermissionStatus.UNDETERMINED) return EstadoPermiso.SIN_PREGUNTAR;
  return respuesta.canAskAgain ? EstadoPermiso.DENEGADO : EstadoPermiso.BLOQUEADO;
};

/** Muestra el diálogo del sistema (si todavía se puede) y devuelve el resultado. */
export const pedirPermisoUbicacion = async (): Promise<EstadoPermiso> =>
  traducir(await Location.requestForegroundPermissionsAsync());

/** Consulta el permiso sin mostrar nada. Se usa al abrir el mapa y al volver de Ajustes. */
export const revisarPermisoUbicacion = async (): Promise<EstadoPermiso> =>
  traducir(await Location.getForegroundPermissionsAsync());

export const abrirAjustes = (): Promise<void> => Linking.openSettings();
