// Ubicación del dispositivo (como useLocationStore en Mapas).
// En clase faltaban watchLocation / clearWatchLocation: aquí son iniciarSeguimiento / detenerSeguimiento,
// que guardan la suscripción y la liberan con .remove().
import type { LocationSubscription } from 'expo-location';
import { create } from 'zustand';

import { obtenerUbicacionActual, seguirUbicacion } from '@/services/ubicacion/ubicacion';
import type { LatLng } from '@/types/ubicacion';

interface UbicacionState {
  ultimaUbicacion: LatLng | null;
  suscripcion: LocationSubscription | null;
  /**
   * Sube con cada iniciar o detener. Pedir la suscripción tarda (es una promesa): si mientras
   * tanto alguien detuvo o volvió a iniciar, la suscripción que llega ya no sirve y se libera.
   */
  generacion: number;

  obtenerUbicacion: () => Promise<LatLng>;
  /** true si el seguimiento quedó activo; false si se detuvo antes de que llegara la suscripción. */
  iniciarSeguimiento: () => Promise<boolean>;
  detenerSeguimiento: () => void;
}

export const useUbicacionStore = create<UbicacionState>()((set, get) => ({
  ultimaUbicacion: null,
  suscripcion: null,
  generacion: 0,

  obtenerUbicacion: async () => {
    const ubicacion = await obtenerUbicacionActual();
    set({ ultimaUbicacion: ubicacion });
    return ubicacion;
  },

  iniciarSeguimiento: async () => {
    get().suscripcion?.remove(); // nunca dos suscripciones a la vez
    const miGeneracion = get().generacion + 1;
    set({ suscripcion: null, generacion: miGeneracion });
    const suscripcion = await seguirUbicacion((ubicacion) => set({ ultimaUbicacion: ubicacion }));
    // Se salió del mapa (o se pausó) mientras llegaba la suscripción: no queda viva.
    if (get().generacion !== miGeneracion) {
      suscripcion.remove();
      return false;
    }
    set({ suscripcion });
    return true;
  },

  detenerSeguimiento: () => {
    get().suscripcion?.remove();
    set((s) => ({ suscripcion: null, generacion: s.generacion + 1 }));
  },
}));
