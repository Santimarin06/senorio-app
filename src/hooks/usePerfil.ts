// Hook de "Editar mis datos" (RF-15). La mutación guarda en la base y, solo si responde,
// actualiza la sesión; la pantalla no muestra nada como guardado antes (RN-14).
import { useMutation } from '@tanstack/react-query';

import type { DatosPerfil } from '@/lib/sesion';
import { guardarMisDatos } from '@/services/sesion';

export const useGuardarMisDatos = () =>
  useMutation({
    mutationFn: (datos: DatosPerfil) => guardarMisDatos(datos),
  });
