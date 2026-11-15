// Hook propio: estado del permiso de ubicación con re-chequeo al volver de Ajustes.
// Es el mismo patrón de PermissionsCheckerProvider (Mapas), pero solo actúa en la pantalla
// que lo usa: no redirige toda la app, así las secciones sin GPS siguen funcionando.
//
// Entradas: ninguna. Estado: estadoUbicacion (store de Zustand).
// Efectos: revisa al montar y cada vez que la app vuelve a primer plano.
// Resultado: { estado, pedirPermiso }.
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { usePermisosStore } from '@/store/usePermisosStore';

export const usePermisoUbicacion = () => {
  const estado = usePermisosStore((s) => s.estadoUbicacion);
  const revisarPermiso = usePermisosStore((s) => s.revisarPermiso);
  const pedirPermiso = usePermisosStore((s) => s.pedirPermiso);

  useEffect(() => {
    void revisarPermiso();
  }, [revisarPermiso]);

  useEffect(() => {
    const suscripcion = AppState.addEventListener('change', (siguiente) => {
      if (siguiente === 'active') void revisarPermiso();
    });
    return () => suscripcion.remove();
  }, [revisarPermiso]);

  return { estado, pedirPermiso };
};
