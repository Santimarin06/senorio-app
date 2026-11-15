// Inicio de sesión (RF-01) con Supabase Auth. "Olvidé mi contraseña" no se muestra (D-14).
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
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
          <Text className="font-titulo text-3xl text-primary">{NEGOCIO.nombre}</Text>
          <Text className="mb-8 font-texto text-lg text-secondary">El cuidado tiene su lugar</Text>

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
              Crear cuenta
            </Boton>
          </Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
