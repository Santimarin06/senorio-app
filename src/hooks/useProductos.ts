import { useQuery } from '@tanstack/react-query';

import { getProductos } from '@/services/productos.api';

const cincoMinutos = 1000 * 60 * 5;

/**
 * Catálogo de productos del cliente. Antes se cacheaba una hora; desde que el administrador
 * edita precios, fotos y productos activos desde la app (RF-27), una hora dejaría al cliente
 * cotizando con un precio viejo. Cinco minutos es el mismo criterio de profesionales y servicios:
 * la lista es corta, pedirla de nuevo cuesta poco y, si hace falta ya, el cliente desliza hacia
 * abajo para refrescar. El dispositivo del administrador no espera: invalida ['productos'] al
 * guardar (useGestion).
 */
export const useProductos = () =>
  useQuery({
    queryKey: ['productos'],
    queryFn: getProductos,
    staleTime: cincoMinutos,
  });
