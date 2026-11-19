// Inicio de sesión (RF-01) con Supabase Auth. "Olvidé mi contraseña" no se muestra (D-14).
// Estructura del mockup: encabezado, título, logo (D-52), nombre del local y formulario.
import { Image } from 'expo-image';
import { Link, Redirect, router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Boton from '@/components/Boton';
import CampoTexto from '@/components/CampoTexto';
import { NEGOCIO } from '@/config/negocio';
import { mensajeDeAuth } from '@/lib/errores';
import { rutaInicial } from '@/lib/navegacion';
import { hayErrores, validarInicioSesion, type ErroresFormulario } from '@/lib/sesion';
import { entrar } from '@/services/sesion';
import { useSesionStore } from '@/store/useSesionStore';

type Campos = { correo: string; contrasena: string };

export default function LoginScreen() {
  const usuario = useSesionStore((s) => s.usuario);
  const [datos, setDatos] = useState<Campos>({ correo: '', contrasena: '' });
  const [errores, setErrores] = useState<ErroresFormulario<Campos>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Con sesión abierta (por ejemplo, al volver a abrir la app) se va directo a su sección.
  if (usuario) return <Redirect href={rutaInicial(usuario.rol)} />;

  const cambiar = (campo: keyof Campos) => (valor: string) => {
    setDatos((d) => ({ ...d, [campo]: valor }));
    setErrores((e) => ({ ...e, [campo]: undefined }));
  };

  const enviar = async () => {
    const encontrados = validarInicioSesion(datos);
    setErrores(encontrados);
    setErrorGeneral(null);
    if (hayErrores(encontrados)) return;
    setEnviando(true);
    try {
      const u = await entrar(datos.correo, datos.contrasena);
      router.replace(rutaInicial(u.rol));
    } catch (error) {
      setErrorGeneral(mensajeDeAuth(error));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-fondo">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24 }}>
          <Text className="font-texto text-xs uppercase tracking-widest text-secondary">
            {NEGOCIO.nombre}
          </Text>
          <Text className="mt-2 font-titulo text-3xl text-primary">El cuidado tiene su lugar.</Text>

          <View className="my-6 items-center rounded-2xl bg-borde/40 py-6">
            <Image
              source={require('../../assets/images/logo.png')}
              style={{ width: 190, height: 190 }}
              contentFit="contain"
              accessibilityLabel={`Logo de ${NEGOCIO.nombre}`}
            />
          </View>

          <View className="flex-row items-end justify-between border-b border-borde pb-3">
            <Text className="font-titulo text-2xl text-primary">{NEGOCIO.nombre}</Text>
            <Text className="mb-1 font-texto text-xs uppercase tracking-widest text-secondary">
              Barbería
            </Text>
          </View>
          <Text className="mb-6 mt-3 font-texto text-base text-secondary">
            Tu tiempo, tu estilo. Entra para reservar con quienes ya conoces.
          </Text>

          <CampoTexto
            etiqueta="Correo electrónico"
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
            etiqueta="Contraseña"
            value={datos.contrasena}
            onChangeText={cambiar('contrasena')}
            error={errores.contrasena}
            secureTextEntry
            autoComplete="password"
            textContentType="password"
            onSubmitEditing={enviar}
          />

          {errorGeneral ? (
            <View className="mb-4 rounded-lg border border-peligro p-3">
              <Text className="font-texto text-sm text-peligro">{errorGeneral}</Text>
            </View>
          ) : null}

          <Boton onPress={enviar} cargando={enviando}>
            Iniciar sesión
          </Boton>

          <Link href="/registro" asChild>
            <Boton variante="texto" className="mt-2">
              ¿Primera visita? Crear una cuenta
            </Boton>
          </Link>
          <Text className="mt-1 text-center font-texto text-xs text-secondary">
            Tu acceso te lleva a tu espacio según tu rol.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
