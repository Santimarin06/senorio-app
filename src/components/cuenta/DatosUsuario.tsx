// Cabecera de la Cuenta y del Perfil (RF-15, D-16): nombre, rol, correo y teléfono del usuario
// con sesión. "Editar mis datos" aparece solo si la pantalla lo ofrece.
import { Pressable, Text, View } from 'react-native';

import type { Usuario } from '@/types/sesion';

const ROL: Record<Usuario['rol'], string> = {
  cliente: 'Cliente',
  profesional: 'Profesional',
  administrador: 'Administrador',
};

/** Iniciales para el círculo: "Santiago Ruiz" → "SR". */
const iniciales = (nombre: string): string =>
  nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join('');

interface Props {
  usuario: Usuario;
  onEditar?: () => void;
}

export default function DatosUsuario({ usuario, onEditar }: Props) {
  return (
    <View className="mb-6">
      <View className="flex-row items-center">
        <View className="h-14 w-14 items-center justify-center rounded-full bg-primary">
          <Text className="font-titulo text-lg text-white">{iniciales(usuario.nombre)}</Text>
        </View>
        <View className="ml-3 flex-1">
          <Text className="font-titulo text-xl text-primary" numberOfLines={1}>
            {usuario.nombre}
          </Text>
          <View className="flex-row items-center">
            <Text className="font-texto text-sm text-secondary">{ROL[usuario.rol]}</Text>
            {onEditar ? (
              <Pressable onPress={onEditar} accessibilityRole="button" hitSlop={8}>
                <Text className="font-texto text-sm text-primary underline"> · Editar mis datos →</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
      <Text className="mt-3 font-texto text-base text-secondary">{usuario.correo}</Text>
      <Text className="font-texto text-base text-secondary">{usuario.telefono || 'Sin teléfono'}</Text>
    </View>
  );
}
