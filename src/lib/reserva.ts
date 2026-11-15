// Cálculo del total de una cita (RN-03): duración y precio son la suma de servicios y adicionales.
import type { Servicio } from '@/types/entidades';

export interface TotalCita {
  duracionMin: number;
  precio: number;
}

export const calcularTotalCita = (servicios: readonly Servicio[]): TotalCita =>
  servicios.reduce<TotalCita>(
    (total, s) => ({
      duracionMin: total.duracionMin + Math.max(0, s.duracionMin),
      precio: total.precio + Math.max(0, s.precio),
    }),
    { duracionMin: 0, precio: 0 },
  );

/** Un adicional (silla relajante) solo vale junto a un servicio principal (D-02). */
export const faltaServicioPrincipal = (servicios: readonly Servicio[]): boolean =>
  servicios.length > 0 && servicios.every((s) => s.esAdicional);
