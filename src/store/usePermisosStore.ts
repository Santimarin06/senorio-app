// Estado del permiso de ubicación (como usePermissionsStore en Mapas).
import { create } from 'zustand';

import { pedirPermisoUbicacion, revisarPermisoUbicacion } from '@/services/ubicacion/permisos';
import { EstadoPermiso } from '@/types/ubicacion';

interface PermisosState {
  estadoUbicacion: EstadoPermiso;
  pedirPermiso: () => Promise<EstadoPermiso>;
  revisarPermiso: () => Promise<EstadoPermiso>;
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
}));
