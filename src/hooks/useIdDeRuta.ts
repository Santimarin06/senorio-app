// Lee un parámetro de ruta dinámica como texto. Si llega repetido (arreglo) o no llega,
// devuelve '' y la pantalla muestra su mensaje de id inexistente.
import { useLocalSearchParams } from 'expo-router';

export const useIdDeRuta = (nombre: string): string => {
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  const valor = params[nombre];
  return typeof valor === 'string' ? valor : '';
};
