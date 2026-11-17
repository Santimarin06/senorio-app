// Contenedor de formulario que el teclado no tapa (RF-26, RF-27). En Android las apps de Expo
// van de borde a borde y la ventana ya no se encoge con el teclado, así que KeyboardAvoidingView
// necesita un `behavior` en ambas plataformas; el desplazamiento descuenta la cabecera del Stack.
// Lo usan todos los formularios con campos de texto: login, registro, Cuenta, gestión, anticipo,
// horario del día, nuevo bloqueo y Revisión (motivo de rechazo).
import { useHeaderHeight } from 'expo-router/react-navigation';
import type { ReactElement, ReactNode } from 'react';
import { KeyboardAvoidingView, ScrollView, type RefreshControlProps } from 'react-native';

interface Props {
  children: ReactNode;
  /** Relleno del contenido en puntos (16 por defecto). */
  relleno?: number;
  /** Deslizar para refrescar, si la pantalla lo necesita. */
  refreshControl?: ReactElement<RefreshControlProps>;
}

export default function FormularioConTeclado({ children, relleno = 16, refreshControl }: Props) {
  const alturaCabecera = useHeaderHeight();
  return (
    <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={alturaCabecera} className="flex-1 bg-fondo">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: relleno, paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={refreshControl}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
