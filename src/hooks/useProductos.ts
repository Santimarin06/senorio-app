import { useQuery } from '@tanstack/react-query';

import { getProductos } from '@/services/productos.api';

const unaHora = 1000 * 60 * 60;

/** El catálogo cambia poco: se cachea una hora. */
export const useProductos = () =>
  useQuery({
    queryKey: ['productos'],
    queryFn: getProductos,
    staleTime: unaHora,
  });
