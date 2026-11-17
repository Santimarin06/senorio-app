// Estado de los permisos (como usePermissionsStore en Mapas): ubicación (RF-12) y
// notificaciones (RF-30).
import { create } from 'zustand';

import {
  pedirPermisoNotificaciones,
  revisarPermisoNotificaciones,
} from '@/services/notificaciones';
import { pedirPermisoUbicacion, revisarPermisoUbicacion } from '@/services/ubicacion/permisos';
import { EstadoPermiso } from '@/types/ubicacion';

interface PermisosState {
  estadoUbicacion: EstadoPermiso;
  pedirPermiso: () => Promise<EstadoPermiso>;
  revisarPermiso: () => Promise<EstadoPermiso>;

  estadoNotificaciones: EstadoPermiso;
  pedirNotificaciones: () => Promise<EstadoPermiso>;
  revisarNotificaciones: () => Promise<EstadoPermiso>;
}

export const usePermisosStore = create<PermisosState>()((set) => ({
  estadoUbicacion: EstadoPermiso.VERIFICANDO,

  pedirPermiso: async () => {
    const estado = await pedirPermisoUbicacion();
    set({ estadoUbicacion: estado });
    return estado;
  },

  revisarPermiso: async () => {
    const estado = await revisarPermisoUbicacion();
    set({ estadoUbicacion: estado });
    return estado;
  },

  estadoNotificaciones: EstadoPermiso.VERIFICANDO,

  pedirNotificaciones: async () => {
    const estado = await pedirPermisoNotificaciones();
    set({ estadoNotificaciones: estado });
    return estado;
  },

  revisarNotificaciones: async () => {
    const estado = await revisarPermisoNotificaciones();
    set({ estadoNotificaciones: estado });
    return estado;
  },
}));
