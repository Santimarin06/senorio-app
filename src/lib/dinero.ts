// Formato de pesos colombianos sin decimales: 25000 -> "$25.000".
// Se hace a mano (sin Intl ni toFixed) para que el resultado no dependa del teléfono.
export const formatoCOP = (valor: number): string => {
  const entero = Math.round(valor);
  const signo = entero < 0 ? '-' : '';
  const conPuntos = String(Math.abs(entero)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${signo}$${conPuntos}`;
};
