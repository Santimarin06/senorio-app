// Hook propio para cerrar sesión desde el Drawer, la tab Cuenta y el Perfil.
// Además de la sesión borra el borrador de reserva y el carrito, para que el siguiente
// usuario del teléfono no vea lo que dejó el anterior.
import { router } from 'expo-router';
import { useCallback } from 'react';

import { useCarritoStore } from '@/store/useCarritoStore';
import { useReservaStore } from '@/store/useReservaStore';
import { useSesionStore } from '@/store/useSesionStore';

export const useCerrarSesion = () => {
  const cerrarSesion = useSesionStore((s) => s.cerrarSesion);
  const reiniciarReserva = useReservaStore((s) => s.reiniciar);
  const vaciarCarrito = useCarritoStore((s) => s.vaciar);

  return useCallback(() => {
    reiniciarReserva();
    vaciarCarrito();
    cerrarSesion();
    router.replace('/login');
  }, [cerrarSesion, reiniciarReserva, vaciarCarrito]);
};
