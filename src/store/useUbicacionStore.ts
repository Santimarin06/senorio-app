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

  obtenerUbicacion: () => Promise<LatLng>;
  iniciarSeguimiento: () => Promise<void>;
  detenerSeguimiento: () => void;
}

export const useUbicacionStore = create<UbicacionState>()((set, get) => ({
  ultimaUbicacion: null,
  suscripcion: null,

  obtenerUbicacion: async () => {
    const ubicacion = await obtenerUbicacionActual();
    set({ ultimaUbicacion: ubicacion });
    return ubicacion;
  },

  iniciarSeguimiento: async () => {
    get().suscripcion?.remove(); // nunca dos suscripciones a la vez
    const suscripcion = await seguirUbicacion((ubicacion) => set({ ultimaUbicacion: ubicacion }));
    set({ suscripcion });
  },

  detenerSeguimiento: () => {
    get().suscripcion?.remove();
    set({ suscripcion: null });
  },
}));
