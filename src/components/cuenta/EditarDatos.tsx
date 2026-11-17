// "Editar mis datos" (RF-15): solo nombre y teléfono, con las mismas validaciones del registro
// (src/lib/sesion.ts). El correo no se edita: la base solo deja cambiar esos dos campos.
// Nada se muestra como guardado hasta que la base responde (RN-14).
import { useState } from 'react';
import { Alert, Text, View } from 'react-native';

import Boton from '@/components/Boton';
import CampoTexto from '@/components/CampoTexto';
import { useGuardarMisDatos } from '@/hooks/usePerfil';
import { mensajeDePerfil } from '@/lib/errores';
import {
  hayCambiosPerfil,
  hayErrores,
  validarDatosPerfil,
  type DatosPerfil,
  type ErroresFormulario,
} from '@/lib/sesion';
import type { Usuario } from '@/types/sesion';

interface Props {
  usuario: Usuario;
  onTerminar: () => void;
}

export default function EditarDatos({ usuario, onTerminar }: Props) {
  const [datos, setDatos] = useState<DatosPerfil>({ nombre: usuario.nombre, telefono: usuario.telefono });
  const [errores, setErrores] = useState<ErroresFormulario<DatosPerfil>>({});
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null);
  const guardar = useGuardarMisDatos();

  const cambiar = (campo: keyof DatosPerfil) => (valor: string) => {
    setDatos((d) => ({ ...d, [campo]: valor }));
    setErrores((e) => ({ ...e, [campo]: undefined }));
  };

  const enviar = () => {
    setErrorGuardar(null);
    const encontrados = validarDatosPerfil(datos);
    setErrores(encontrados);
    if (hayErrores(encontrados)) return;
    if (!hayCambiosPerfil(usuario, datos)) {
      onTerminar();
      return;
    }
    guardar.mutate(datos, {
      onSuccess: () => {
        Alert.alert('Datos guardados', 'Tu nombre y tu teléfono quedaron actualizados.');
        onTerminar();
      },
      onError: (e) => setErrorGuardar(mensajeDePerfil(e)),
    });
  };

  return (
    <View className="mb-6 rounded-xl border border-borde p-4">
      <Text className="mb-3 font-titulo text-lg text-primary">Editar mis datos</Text>
      <CampoTexto
        etiqueta="Nombre y apellido"
        value={datos.nombre}
        onChangeText={cambiar('nombre')}
        error={errores.nombre}
        autoCapitalize="words"
        autoComplete="name"
        maxLength={80}
      />
      <CampoTexto
        etiqueta="Teléfono celular"
        value={datos.telefono}
        onChangeText={cambiar('telefono')}
        error={errores.telefono}
        keyboardType="phone-pad"
        autoComplete="tel"
        maxLength={16}
      />
      <Text className="mb-4 font-texto text-sm text-secondary">
        El correo es tu usuario para entrar y no se cambia desde la app.
      </Text>

      {errorGuardar ? (
        <View className="mb-4 rounded-lg border border-peligro p-3">
          <Text className="font-texto text-sm text-peligro">{errorGuardar}</Text>
        </View>
      ) : null}

      <Boton onPress={enviar} cargando={guardar.isPending}>
        Guardar
      </Boton>
      <Boton variante="borde" className="mt-3" onPress={onTerminar} disabled={guardar.isPending}>
        Cancelar
      </Boton>
    </View>
  );
}
