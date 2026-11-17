// Estado de guarda o vacío con acciones que sí navegan (por ejemplo, "No encontramos esta
// cita" o "Tu bolsa está vacía"). Nunca es relleno de una función: nunca un botón sin efecto.
import type { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import Boton from '@/components/Boton';
import EstadoPantalla, { type AccionEstado } from '@/components/EstadoPantalla';

export type AccionPendiente = AccionEstado;

interface Props {
  mensaje: string;
  titulo?: string;
  icono?: keyof typeof Ionicons.glyphMap;
  acciones?: AccionPendiente[];
}

export default function PantallaPendiente({
  mensaje,
  titulo,
  icono = 'information-circle-outline',
  acciones = [],
}: Props) {
  return (
    <View className="flex-1 bg-fondo">
      <EstadoPantalla tipo="vacio" icono={icono} titulo={titulo} mensaje={mensaje} />
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
