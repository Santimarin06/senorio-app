// Registro del cliente (RF-01): nombre, celular, correo y contraseña con validación por campo.
// Supabase pide confirmar el correo antes de entrar: la pantalla lo dice en vez de fingir
// una sesión abierta.
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Boton from '@/components/Boton';
import CampoTexto from '@/components/CampoTexto';
import PantallaPendiente from '@/components/PantallaPendiente';
import { mensajeDeAuth } from '@/lib/errores';
import { rutaInicial } from '@/lib/navegacion';
import { CONTRASENA_MINIMA, hayErrores, validarRegistro, type DatosRegistro, type ErroresFormulario } from '@/lib/sesion';
import { registrarCliente } from '@/services/sesion';

const VACIO: DatosRegistro = { nombre: '', telefono: '', correo: '', contrasena: '' };

export default function RegistroScreen() {
  const [datos, setDatos] = useState<DatosRegistro>(VACIO);
  const [errores, setErrores] = useState<ErroresFormulario<DatosRegistro>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [confirmarCorreo, setConfirmarCorreo] = useState(false);

  if (confirmarCorreo) {
    return (
      <SafeAreaView className="flex-1 bg-fondo">
        <PantallaPendiente
          icono="mail-unread-outline"
          mensaje={`Creamos tu cuenta. Abre el enlace que enviamos a ${datos.correo.trim()} para confirmarla y luego inicia sesión.`}
          acciones={[{ texto: 'Ir a iniciar sesión', onPress: () => router.replace('/login') }]}
        />
      </SafeAreaView>
    );
  }

  const cambiar = (campo: keyof DatosRegistro) => (valor: string) => {
    setDatos((d) => ({ ...d, [campo]: valor }));
    setErrores((e) => ({ ...e, [campo]: undefined }));
  };

  const enviar = async () => {
    const encontrados = validarRegistro(datos);
    setErrores(encontrados);
    setErrorGeneral(null);
    if (hayErrores(encontrados)) return;
    setEnviando(true);
    try {
      const resultado = await registrarCliente(datos);
      if (resultado === 'confirmar-correo') setConfirmarCorreo(true);
      else router.replace(rutaInicial('cliente'));
    } catch (error) {
      setErrorGeneral(mensajeDeAuth(error));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-fondo">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 24 }} keyboardShouldPersistTaps="handled">
          <Text className="font-titulo text-2xl text-primary">Hagamos la presentación</Text>
          <Text className="mb-6 font-texto text-base text-secondary">
            Con tu cuenta reservas y ves tus citas.
          </Text>

          <CampoTexto
            etiqueta="Nombre"
            value={datos.nombre}
            onChangeText={cambiar('nombre')}
            error={errores.nombre}
            autoComplete="name"
            textContentType="name"
          />
          <CampoTexto
            etiqueta="Celular"
            value={datos.telefono}
            onChangeText={cambiar('telefono')}
            error={errores.telefono}
            placeholder="300 123 4567"
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
          />
          <CampoTexto
            etiqueta="Correo"
            value={datos.correo}
            onChangeText={cambiar('correo')}
            error={errores.correo}
            placeholder="nombre@correo.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
          />
          <CampoTexto
            etiqueta={`Contraseña (mínimo ${CONTRASENA_MINIMA} caracteres)`}
            value={datos.contrasena}
            onChangeText={cambiar('contrasena')}
            error={errores.contrasena}
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
          />

          {errorGeneral ? (
            <View className="mb-4 rounded-lg border border-peligro p-3">
              <Text className="font-texto text-sm text-peligro">{errorGeneral}</Text>
            </View>
          ) : null}

          <Boton onPress={enviar} cargando={enviando}>
            Crear cuenta
          </Boton>
          <Boton variante="texto" className="mt-2" onPress={() => router.replace('/login')}>
            Ya tengo cuenta
          </Boton>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
