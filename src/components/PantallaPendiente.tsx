// Pantalla del esqueleto cuya función llega en otra entrega. Dice qué requisito falta y,
// si hay una acción, la ofrece con un botón que sí navega: nunca un botón sin efecto.
import type { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import Boton from '@/components/Boton';
import EstadoPantalla from '@/components/EstadoPantalla';

export interface AccionPendiente {
  texto: string;
  onPress: () => void;
}

interface Props {
  mensaje: string;
  icono?: keyof typeof Ionicons.glyphMap;
  acciones?: AccionPendiente[];
}

export default function PantallaPendiente({
  mensaje,
  icono = 'construct-outline',
  acciones = [],
}: Props) {
  return (
    <View className="flex-1 bg-fondo">
      <EstadoPantalla tipo="vacio" icono={icono} mensaje={mensaje} />
      {acciones.length > 0 ? (
        <View className="p-6">
          {acciones.map((accion, i) => (
            <Boton
              key={accion.texto}
              variante={i === 0 ? 'relleno' : 'borde'}
              className="mb-3"
              onPress={accion.onPress}
            >
              {accion.texto}
            </Boton>
          ))}
        </View>
      ) : null}
    </View>
  );
}
