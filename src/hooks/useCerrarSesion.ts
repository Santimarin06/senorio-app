// Hook propio para cerrar sesión desde el Drawer, la tab Cuenta y el Perfil.
// Además de la sesión borra el borrador de reserva, el carrito y la caché de TanStack Query,
// para que el siguiente usuario del teléfono no vea lo que dejó el anterior. También cancela los
// recordatorios de citas programados en el teléfono (RF-30), para que no reciba los ajenos.
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback } from 'react';

import { cancelarRecordatorios } from '@/services/notificaciones';
import { salir } from '@/services/sesion';
import { useCarritoStore } from '@/store/useCarritoStore';
import { useReservaStore } from '@/store/useReservaStore';

export const useCerrarSesion = () => {
  const queryClient = useQueryClient();
  const reiniciarReserva = useReservaStore((s) => s.reiniciar);
  const vaciarCarrito = useCarritoStore((s) => s.vaciar);

  return useCallback(() => {
    reiniciarReserva();
    vaciarCarrito();
    queryClient.clear();
    router.replace('/login');
    void salir();
    void cancelarRecordatorios().catch(() => undefined);
  }, [queryClient, reiniciarReserva, vaciarCarrito]);
};
