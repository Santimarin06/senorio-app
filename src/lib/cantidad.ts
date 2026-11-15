// Contador del cotizador: cada producto de 1 a 10 unidades (RN-11).
import { NEGOCIO } from '@/config/negocio';

/** Ajusta una cantidad a los límites válidos. Valores no numéricos o vacíos quedan en el mínimo. */
export const limitarCantidad = (valor: number): number => {
  if (!Number.isFinite(valor)) return NEGOCIO.cantidadMinima;
  const entero = Math.trunc(valor);
  return Math.min(NEGOCIO.cantidadMaxima, Math.max(NEGOCIO.cantidadMinima, entero));
};
