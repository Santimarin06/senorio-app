// Tab Cuenta del cliente, "Tu espacio personal" (RF-15, D-16): datos, Editar mis datos,
// multa pendiente (RN-07) y los accesos a Política, Privacidad y Cerrar sesión.
import { useState } from 'react';
import { Text } from 'react-native';

import AccesosCuenta from '@/components/cuenta/AccesosCuenta';
import DatosUsuario from '@/components/cuenta/DatosUsuario';
import EditarDatos from '@/components/cuenta/EditarDatos';
import MultasCuenta from '@/components/cuenta/MultasCuenta';
import FormularioConTeclado from '@/components/FormularioConTeclado';
import { useSesionStore } from '@/store/useSesionStore';

export default function Cuenta() {
  const usuario = useSesionStore((s) => s.usuario);
  const [editando, setEditando] = useState(false);

  // El Drawer redirige al inicio de sesión si no hay usuario; aquí no se dibuja nada.
  if (!usuario) return null;

  return (
    <FormularioConTeclado>
      <Text className="mb-4 font-titulo text-2xl text-primary">Tu espacio personal.</Text>
      {editando ? (
        <EditarDatos usuario={usuario} onTerminar={() => setEditando(false)} />
      ) : (
        <DatosUsuario usuario={usuario} onEditar={() => setEditando(true)} />
      )}
      <MultasCuenta />
      <AccesosCuenta />
    </FormularioConTeclado>
  );
}
