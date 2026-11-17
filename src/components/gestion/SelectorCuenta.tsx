// Elegir la cuenta que se vincula a una ficha de profesional (RF-29, D-13): la persona ya se
// registró como cliente y el administrador la busca por nombre, correo o teléfono. Maneja
// carga, error con Reintentar y lista vacía dentro del formulario.
import { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import Boton from '@/components/Boton';
import CampoTexto from '@/components/CampoTexto';
import Tarjeta from '@/components/Tarjeta';
import { GESTION_PROFESIONALES } from '@/config/negocio';
import { mensajeDeError } from '@/lib/errores';
import { coincideCuenta } from '@/lib/gestion';
import type { CuentaUsuario } from '@/types/entidades';

interface Props {
  cuentas: CuentaUsuario[] | undefined;
  cargando: boolean;
  error: unknown;
  onReintentar: () => void;
  elegida: string | null;
  onElegir: (cuenta: CuentaUsuario | null) => void;
  deshabilitado: boolean;
  errorCampo?: string;
}

const subtituloCuenta = (c: CuentaUsuario): string =>
  [c.correo, c.telefono].filter((x) => x !== '').join(' · ') || 'Sin correo ni teléfono';

export default function SelectorCuenta(props: Props) {
  const [consulta, setConsulta] = useState('');

  if (props.cargando) {
    return (
      <View className="mb-4 flex-row items-center">
        <ActivityIndicator />
        <Text className="ml-2 font-texto text-sm text-secondary">Cargando las cuentas…</Text>
      </View>
    );
  }
  if (props.error || !props.cuentas) {
    return (
      <View className="mb-4">
        <Text className="mb-2 font-texto text-sm text-peligro">{mensajeDeError(props.error)}</Text>
        <Boton variante="borde" onPress={props.onReintentar}>
          Reintentar
        </Boton>
      </View>
    );
  }

  const elegida = props.cuentas.find((c) => c.id === props.elegida) ?? null;
  if (elegida) {
    return (
      <View className="mb-4">
        <Tarjeta titulo={elegida.nombre} subtitulo={subtituloCuenta(elegida)} icono="person-circle-outline">
          <Boton variante="borde" disabled={props.deshabilitado} onPress={() => props.onElegir(null)}>
            Elegir otra cuenta
          </Boton>
        </Tarjeta>
      </View>
    );
  }

  if (props.cuentas.length === 0) {
    return (
      <View className="mb-4">
        <Text className="font-texto text-sm text-secondary">
          No hay cuentas disponibles. Pide a la persona que se registre en la app como cliente y luego
          vuelve aquí.
        </Text>
        <Boton variante="texto" onPress={props.onReintentar}>
          Actualizar la lista
        </Boton>
        {props.errorCampo ? (
          <Text className="font-texto text-sm text-peligro">{props.errorCampo}</Text>
        ) : null}
      </View>
    );
  }

  const coincidencias = props.cuentas.filter((c) => coincideCuenta(c, consulta));
  const visibles = coincidencias.slice(0, GESTION_PROFESIONALES.cuentasVisibles);

  return (
    <View className="mb-2">
      <CampoTexto
        etiqueta="Buscar la cuenta"
        value={consulta}
        onChangeText={setConsulta}
        placeholder="Nombre, correo o teléfono"
        autoCapitalize="none"
        autoCorrect={false}
        error={props.errorCampo}
      />
      {visibles.length === 0 ? (
        <Text className="mb-3 font-texto text-sm text-secondary">
          Ninguna cuenta coincide. Revisa cómo se registró la persona.
        </Text>
      ) : (
        visibles.map((c) => (
          <Tarjeta
            key={c.id}
            titulo={c.nombre}
            subtitulo={subtituloCuenta(c)}
            icono="person-circle-outline"
            onPress={props.deshabilitado ? undefined : () => props.onElegir(c)}
          />
        ))
      )}
      {coincidencias.length > visibles.length ? (
        <Text className="mb-3 font-texto text-sm text-secondary">
          {`Y ${coincidencias.length - visibles.length} más: escribe para afinar la búsqueda.`}
        </Text>
      ) : null}
    </View>
  );
}
