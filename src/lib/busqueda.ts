// Búsqueda sin distinguir mayúsculas ni tildes: "rosmery" encuentra "Rosmery", "unas" encuentra "Uñas".
export const normalizar = (texto: string): string =>
  texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

export const filtrarPorTexto = <T>(
  elementos: readonly T[],
  consulta: string,
  campos: (elemento: T) => string[],
): T[] => {
  const buscado = normalizar(consulta);
  if (buscado === '') return [...elementos];
  return elementos.filter((e) => campos(e).some((campo) => normalizar(campo).includes(buscado)));
};
