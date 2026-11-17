// Hooks de la gestión del catálogo (RF-26, RF-27, RF-29). Las listas del administrador usan claves
// hijas de ['servicios'] y ['productos'] para que una sola invalidación las refresque junto con
// lo que ve el cliente.
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';

import {
  cambiarActivoProfesional,
  cambiarActivoServicio,
  getCuentasSinFicha,
  getProfesionalesGestion,
  getServiciosGestion,
  guardarProfesional,
  guardarServicio,
} from '@/services/profesionales.api';
import {
  cambiarActivoProducto,
  getProductosGestion,
  guardarProducto,
  subirFoto,
} from '@/services/productos.api';
import { rutaFotoProducto, rutaFotoProfesional } from '@/lib/gestion';
import type {
  ImagenComprobante,
  ProductoFormulario,
  ProfesionalFormulario,
  ServicioFormulario,
} from '@/types/entidades';

const unMinuto = 60_000;

/**
 * Lo que cambia al guardar: el catálogo de servicios y productos, el listado de profesionales,
 * el detalle de cada profesional (['profesional', id]), que muestra sus servicios al cliente, y
 * las cuentas sin ficha (['perfiles']), que cambian al vincular una cuenta (RF-29).
 */
const refrescarCatalogo = (queryClient: QueryClient) =>
  Promise.all(
    [['servicios'], ['productos'], ['profesionales'], ['profesional'], ['perfiles']].map((queryKey) =>
      queryClient.invalidateQueries({ queryKey }),
    ),
  );

/** El administrador ve el estado real: un minuto de caché y se refresca al guardar. */
export const useServiciosGestion = () =>
  useQuery({
    queryKey: ['servicios', 'gestion'],
    queryFn: getServiciosGestion,
    staleTime: unMinuto,
  });

export const useProductosGestion = () =>
  useQuery({
    queryKey: ['productos', 'gestion'],
    queryFn: getProductosGestion,
    staleTime: unMinuto,
  });

export const useGuardarServicio = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, formulario }: { id: string | null; formulario: ServicioFormulario }) =>
      guardarServicio(id, formulario),
    onSettled: () => refrescarCatalogo(queryClient),
  });
};

export const useCambiarActivoServicio = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, activo }: { id: string; activo: boolean }) => cambiarActivoServicio(id, activo),
    onSettled: () => refrescarCatalogo(queryClient),
  });
};

/**
 * Guarda un producto. Si hay foto nueva, primero la sube y luego guarda la fila con su URL:
 * si la subida falla, el producto queda como estaba.
 */
export const useGuardarProducto = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      formulario,
      fotoNueva,
    }: {
      id: string | null;
      formulario: ProductoFormulario;
      fotoNueva: ImagenComprobante | null;
    }) => {
      const foto = fotoNueva
        ? await subirFoto(rutaFotoProducto(id, Date.now(), fotoNueva.mime), fotoNueva)
        : formulario.foto;
      return guardarProducto(id, { ...formulario, foto });
    },
    onSettled: () => refrescarCatalogo(queryClient),
  });
};

export const useCambiarActivoProducto = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, activo }: { id: string; activo: boolean }) => cambiarActivoProducto(id, activo),
    onSettled: () => refrescarCatalogo(queryClient),
  });
};

/** Fichas de profesionales para el administrador (RF-29), activas e inactivas. */
export const useProfesionalesGestion = () =>
  useQuery({
    queryKey: ['profesionales', 'gestion'],
    queryFn: getProfesionalesGestion,
    staleTime: unMinuto,
  });

/** Usuarios registrados como clientes: los que se pueden vincular a una ficha (D-13). */
export const useCuentasSinFicha = (habilitado: boolean) =>
  useQuery({
    queryKey: ['perfiles', 'sin-ficha'],
    queryFn: getCuentasSinFicha,
    enabled: habilitado,
    staleTime: unMinuto,
  });

/**
 * Guarda una ficha de profesional. Igual que el producto: si hay foto nueva, primero la sube
 * y luego guarda; si la subida falla, nada cambia.
 */
export const useGuardarProfesional = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      formulario,
      fotoNueva,
    }: {
      id: string | null;
      formulario: ProfesionalFormulario;
      fotoNueva: ImagenComprobante | null;
    }) => {
      const foto = fotoNueva
        ? await subirFoto(rutaFotoProfesional(id, Date.now(), fotoNueva.mime), fotoNueva)
        : formulario.foto;
      return guardarProfesional(id, { ...formulario, foto });
    },
    onSettled: () => refrescarCatalogo(queryClient),
  });
};

export const useCambiarActivoProfesional = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, activo }: { id: string; activo: boolean }) => cambiarActivoProfesional(id, activo),
    onSettled: () => refrescarCatalogo(queryClient),
  });
};
