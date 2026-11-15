// Acciones de ubicación (como core/actions/location/location.ts en Mapas).
import * as Location from 'expo-location';

import type { LatLng } from '@/types/ubicacion';

/** true si el GPS / servicios de ubicación del teléfono están encendidos. */
export const gpsEncendido = (): Promise<boolean> => Location.hasServicesEnabledAsync();

export const obtenerUbicacionActual = async (): Promise<LatLng> => {
  const { coords } = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });
  return { latitude: coords.latitude, longitude: coords.longitude };
};

/**
 * Empieza a seguir la posición. Devuelve la suscripción: quien la crea
 * debe llamar a .remove() para liberarla.
 */
export const seguirUbicacion = (
  alMoverse: (ubicacion: LatLng) => void,
): Promise<Location.LocationSubscription> =>
  Location.watchPositionAsync(
    { accuracy: Location.Accuracy.High, timeInterval: 2000, distanceInterval: 5 },
    ({ coords }) => alMoverse({ latitude: coords.latitude, longitude: coords.longitude }),
  );
