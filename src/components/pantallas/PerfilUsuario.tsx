// Tab Perfil del profesional (D-16): sus datos, Política, Privacidad y Cerrar sesión.
// La Cuenta del cliente (Cuenta.tsx) reutiliza las mismas piezas y suma la multa y la edición.
import { ScrollView } from 'react-native';

import AccesosCuenta from '@/components/cuenta/AccesosCuenta';
import DatosUsuario from '@/components/cuenta/DatosUsuario';
import { useSesionStore } from '@/store/useSesionStore';

export default function PerfilUsuario() {
  const usuario = useSesionStore((s) => s.usuario);
  return (
    <ScrollView className="flex-1 bg-fondo" contentContainerStyle={{ padding: 24 }}>
      {usuario ? <DatosUsuario usuario={usuario} /> : null}
      <AccesosCuenta />
    </ScrollView>
  );
}
