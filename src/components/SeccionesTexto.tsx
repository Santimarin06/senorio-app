// Texto por secciones (título y viñetas) para Política de reservas y Privacidad: una sola
// forma de dibujarlas en las dos pantallas.
import { ScrollView, Text, View } from 'react-native';

export interface SeccionTexto {
  titulo: string;
  puntos: string[];
}

interface Props {
  titulo: string;
  introduccion: string;
  secciones: SeccionTexto[];
}

export default function SeccionesTexto({ titulo, introduccion, secciones }: Props) {
  return (
    <ScrollView className="flex-1 bg-fondo" contentContainerStyle={{ padding: 24, paddingBottom: 48 }}>
      <Text className="font-titulo text-2xl text-primary">{titulo}</Text>
      <Text className="mb-6 mt-2 font-texto text-base text-secondary">{introduccion}</Text>
      {secciones.map((s) => (
        <View key={s.titulo} className="mb-6">
          <Text className="mb-2 font-titulo text-lg text-primary">{s.titulo}</Text>
          {s.puntos.map((p) => (
            <Text key={p} className="mb-2 font-texto text-base text-primary">
              • {p}
            </Text>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}
