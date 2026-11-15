// Reglas de la selección de servicios (RN-03, D-02). El total sale de calcularTotalCita de
// src/lib/finanzas.ts (multas y devoluciones): un solo lugar para la cuenta.
import { calcularTotalCita } from '@/lib/finanzas';
import type { Servicio } from '@/types/entidades';

export interface TotalSeleccion {
  total: number;
  duracionMin: number;
}

/**
 * Total y duración de los servicios elegidos. Mientras no hay ninguno es cero (la pantalla
 * de servicios lo muestra así); con servicios usa calcularTotalCita, que rechaza valores inválidos.
 */
export const totalSeleccion = (servicios: readonly Servicio[]): TotalSeleccion =>
  servicios.length === 0 ? { total: 0, duracionMin: 0 } : calcularTotalCita([...servicios]);

/** Un adicional (silla relajante) solo vale junto a un servicio principal (D-02). */
export const faltaServicioPrincipal = (servicios: readonly Servicio[]): boolean =>
  servicios.length > 0 && servicios.every((s) => s.esAdicional);
