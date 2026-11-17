// Crear o editar un servicio (RF-26). Sin id en la ruta crea; con id edita. Valida con
// validarServicio (src/lib/gestion.ts) y guarda servicio y profesionales juntos con la función
// guardar_servicio. Solo vuelve atrás cuando la base confirmó (RN-12).
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Switch, Text, View } from 'react-native';

import Boton from '@/components/Boton';
import CampoTexto from '@/components/CampoTexto';
import Chip from '@/components/Chip';
import EstadoPantalla from '@/components/EstadoPantalla';
import FormularioConTeclado from '@/components/FormularioConTeclado';
import { GESTION } from '@/config/negocio';
import { useGuardarServicio, useServiciosGestion } from '@/hooks/useGestion';
import { useIdDeRuta } from '@/hooks/useIdDeRuta';
import { useProfesionales } from '@/hooks/useProfesionales';
import { mensajeDeError, mensajeDeGestion } from '@/lib/errores';
import {
  entradaDeServicio,
  validarServicio,
  type CampoServicio,
  type EntradaServicio,
  type ErroresFormulario,
} from '@/lib/gestion';
import type { Profesional, ServicioGestion } from '@/types/entidades';

export default function FormularioServicio() {
  const id = useIdDeRuta('id');
  const servicios = useServiciosGestion();
  const profesionales = useProfesionales();

  if (servicios.isPending || profesionales.isPending) {
    return <EstadoPantalla tipo="carga" mensaje="Cargando el formulario…" />;
  }
  if (servicios.isError || profesionales.isError) {
    return (
      <EstadoPantalla
        tipo="error"
        mensaje={mensajeDeError(servicios.error ?? profesionales.error)}
        onReintentar={() => {
          void servicios.refetch();
          void profesionales.refetch();
        }}
      />
    );
  }

  const servicio = id === '' ? null : (servicios.data.find((s) => s.id === id) ?? null);
  if (id !== '' && !servicio) {
    return (
      <View className="flex-1 bg-fondo">
        <EstadoPantalla tipo="vacio" mensaje="No encontramos ese servicio. Puede que el enlace sea viejo." />
        <Boton variante="borde" className="mx-6 mb-8" onPress={() => router.back()}>
          Volver a la gestión
        </Boton>
      </View>
    );
  }

  // key: si cambia el servicio, el formulario arranca de nuevo con sus datos.
  return <Formulario key={servicio?.id ?? 'nuevo'} servicio={servicio} profesionales={profesionales.data} />;
}

function Formulario({ servicio, profesionales }: { servicio: ServicioGestion | null; profesionales: Profesional[] }) {
  const [entrada, setEntrada] = useState<EntradaServicio>(() => entradaDeServicio(servicio));
  const [errores, setErrores] = useState<ErroresFormulario<CampoServicio>>({});
  const guardar = useGuardarServicio();

  // useProfesionales solo trae activos. Los inactivos que ya lo prestaban siguen en
  // entrada.profesionales sin mostrarse, así editar no los borra (D-43).
  const activos = new Set(profesionales.map((p) => p.id));
  const cambiar = <K extends keyof EntradaServicio>(campo: K, valor: EntradaServicio[K]) => {
    setEntrada((e) => ({ ...e, [campo]: valor }));
    // Al corregir un campo se borra su error; los demás se quedan hasta volver a guardar.
    if (campo !== 'esAdicional') {
      setErrores((e) => {
        const copia = { ...e };
        delete copia[campo as CampoServicio];
        return copia;
      });
    }
  };
  const alternarProfesional = (pid: string) =>
    cambiar(
      'profesionales',
      entrada.profesionales.includes(pid)
        ? entrada.profesionales.filter((x) => x !== pid)
        : [...entrada.profesionales, pid],
    );

  const enviar = () => {
    const r = validarServicio(entrada, activos);
    if (!r.ok) {
      setErrores(r.errores);
      return;
    }
    guardar.mutate(
      { id: servicio?.id ?? null, formulario: r.valor },
      {
        onSuccess: () => {
          Alert.alert(servicio ? 'Servicio actualizado' : 'Servicio creado', `${r.valor.nombre} quedó guardado.`);
          router.back();
        },
        onError: (e) => Alert.alert('No se guardó', mensajeDeGestion(e)),
      },
    );
  };

  return (
    <FormularioConTeclado>
      <CampoTexto
        etiqueta="Nombre"
        value={entrada.nombre}
        onChangeText={(v) => cambiar('nombre', v)}
        placeholder="Corte clásico"
        maxLength={GESTION.nombreMaximo}
        error={errores.nombre}
      />
      <CampoTexto
        etiqueta="Descripción (opcional)"
        value={entrada.descripcion}
        onChangeText={(v) => cambiar('descripcion', v)}
        placeholder="Qué incluye el servicio"
        maxLength={GESTION.descripcionMaxima}
        multiline
        error={errores.descripcion}
      />
      <View className="flex-row gap-3">
        <View className="flex-1">
          <CampoTexto
            etiqueta="Duración (minutos)"
            value={entrada.duracion}
            onChangeText={(v) => cambiar('duracion', v)}
            placeholder="45"
            keyboardType="number-pad"
            maxLength={3}
            error={errores.duracion}
          />
        </View>
        <View className="flex-1">
          <CampoTexto
            etiqueta="Precio (COP)"
            value={entrada.precio}
            onChangeText={(v) => cambiar('precio', v)}
            placeholder="35.000"
            keyboardType="number-pad"
            maxLength={9}
            error={errores.precio}
          />
        </View>
      </View>

      <View className="mb-4 rounded-xl border border-borde p-3">
        <View className="flex-row items-center justify-between">
          <Text className="flex-1 font-texto text-base text-primary">Es adicional</Text>
          <Switch
            value={entrada.esAdicional}
            onValueChange={(v) => cambiar('esAdicional', v)}
            accessibilityLabel="Es adicional"
          />
        </View>
        <Text className="mt-1 font-texto text-sm text-secondary">
          Un adicional (como la silla relajante) solo se reserva junto a un servicio principal del mismo
          profesional; nunca solo.
        </Text>
      </View>

      <Text className="mb-1 font-texto text-sm text-primary">¿Quién lo presta?</Text>
      {profesionales.length === 0 ? (
        <Text className="mb-2 font-texto text-sm text-secondary">No hay profesionales activos.</Text>
      ) : (
        <View className="flex-row flex-wrap">
          {profesionales.map((p) => (
            <Chip
              key={p.id}
              etiqueta={p.nombre}
              activo={entrada.profesionales.includes(p.id)}
              onPress={() => alternarProfesional(p.id)}
            />
          ))}
        </View>
      )}
      {errores.profesionales ? (
        <Text className="mb-2 font-texto text-sm text-peligro">{errores.profesionales}</Text>
      ) : null}

      <Boton className="mt-6" onPress={enviar} cargando={guardar.isPending}>
        {servicio ? 'Guardar cambios' : 'Crear servicio'}
      </Boton>
      {servicio && !servicio.activo ? (
        <Text className="mt-3 text-center font-texto text-sm text-secondary">
          Este servicio está inactivo: los clientes no lo ven hasta que lo reactives.
        </Text>
      ) : null}
    </FormularioConTeclado>
  );
}
