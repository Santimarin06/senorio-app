// Aviso cuando falla una escritura (reservar, cancelar, reagendar, anticipo, datos, avisos).
// Sin conexión muestra el bloque "Sin conexión" del mockup: nada quedó registrado y lo que la
// persona eligió sigue en pantalla para reintentar (RN-12, RN-14). Otro error: texto en rojo.
import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

import { esSinConexion } from '@/lib/errores';

interface Props {
  error: unknown;
  /** Mensaje de la acción, de src/lib/errores.ts (por ejemplo mensajeDeReserva). */
  mensaje: string;
  className?: string;
}

export default function AvisoEscritura({ error, mensaje, className = 'mb-3' }: Props) {
  if (!esSinConexion(error)) {
    return (
      <View className={`rounded-lg border border-peligro p-3 ${className}`}>
        <Text className="font-texto text-sm text-peligro">{mensaje}</Text>
      </View>
    );
  }

  return (
    <View className={`flex-row rounded-lg border border-peligro p-3 ${className}`} accessibilityRole="alert">
      <Ionicons name="cloud-offline-outline" size={22} color="#6B6B6B" />
      <View className="ml-3 flex-1">
        <Text className="font-titulo text-base text-primary">Sin conexión</Text>
        <Text className="font-texto text-sm text-secondary">
          {mensaje} Conservamos tu selección.
        </Text>
      </View>
    </View>
  );
}
