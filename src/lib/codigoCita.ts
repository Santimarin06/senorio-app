// Código visible de una cita (D-35): "SB-" + los 6 primeros caracteres del id en mayúsculas.
// No hay columna nueva: sale del uuid de la base. Sirve para nombrar la cita en la
// cotización, la cancelación y los comprobantes. Es una referencia para leer, no un id:
// las búsquedas en la base siempre usan el uuid completo.
const LARGO_CODIGO = 6;

export const codigoCita = (id: string): string =>
  `SB-${id.replace(/-/g, '').slice(0, LARGO_CODIGO).toUpperCase()}`;
