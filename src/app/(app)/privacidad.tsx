import { ScrollView, Text } from 'react-native';

import { NEGOCIO } from '@/config/negocio';

export default function PrivacidadScreen() {
  return (
    <ScrollView className="flex-1 bg-fondo" contentContainerStyle={{ padding: 24 }}>
      <Text className="mb-4 font-texto text-base text-primary">
        {NEGOCIO.nombre} guarda tu nombre, teléfono y correo para gestionar tus citas, y los
        comprobantes de anticipo para que el local los revise.
      </Text>
      <Text className="mb-4 font-texto text-base text-primary">
        Tu ubicación solo se usa mientras ves el mapa del local y no se guarda.
      </Text>
      <Text className="font-texto text-base text-primary">
        Los mensajes de WhatsApp los envías tú desde tu teléfono; la app solo prepara el texto.
      </Text>
    </ScrollView>
  );
}
