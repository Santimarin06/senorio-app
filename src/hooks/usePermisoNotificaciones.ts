// Hook propio: estado del permiso de notificaciones (RF-30) con re-chequeo al volver de Ajustes.
// Mismo patrón que usePermisoUbicacion.
//
// Entradas: ninguna. Estado: estadoNotificaciones (store de Zustand).
// Efectos: revisa al montar y cada vez que la app vuelve a primer plano.
// Resultado: { estado, pedirPermiso }.
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { usePermisosStore } from '@/store/usePermisosStore';

export const usePermisoNotificaciones = () => {
  const estado = usePermisosStore((s) => s.estadoNotificaciones);
  const revisar = usePermisosStore((s) => s.revisarNotificaciones);
  const pedirPermiso = usePermisosStore((s) => s.pedirNotificaciones);

  useEffect(() => {
    void revisar().catch(() => undefined);
    const suscripcion = AppState.addEventListener('change', (siguiente) => {
      if (siguiente === 'active') void revisar().catch(() => undefined);
    });
    return () => suscripcion.remove();
  }, [revisar]);

  return { estado, pedirPermiso };
};
