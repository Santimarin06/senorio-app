// Hooks de TanStack Query (como useMovies / useMovie en 06-Peliculas).
// queryKey identifica el recurso; staleTime es el criterio de caché.
import { useQuery } from '@tanstack/react-query';

import { getProfesionalById, getProfesionales } from '@/services/profesionales.api';

const cincoMinutos = 1000 * 60 * 5;

export const useProfesionales = () =>
  useQuery({
    queryKey: ['profesionales'],
    queryFn: getProfesionales,
    staleTime: cincoMinutos,
  });

export const useProfesional = (id: string) =>
  useQuery({
    queryKey: ['profesional', id],
    queryFn: () => getProfesionalById(id),
    enabled: id !== '',
    staleTime: cincoMinutos,
  });
