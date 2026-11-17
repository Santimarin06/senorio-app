// Contenedor de formulario que el teclado no tapa (RF-26, RF-27). En Android las apps de Expo
// van de borde a borde y la ventana ya no se encoge con el teclado, así que KeyboardAvoidingView
// necesita un `behavior` en ambas plataformas; el desplazamiento descuenta la cabecera del Stack.
import { useHeaderHeight } from 'expo-router/react-navigation';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, ScrollView } from 'react-native';

export default function FormularioConTeclado({ children }: { children: ReactNode }) {
  const alturaCabecera = useHeaderHeight();
  return (
    <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={alturaCabecera} className="flex-1 bg-fondo">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
