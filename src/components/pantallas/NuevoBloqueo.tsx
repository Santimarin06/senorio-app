// Nuevo bloqueo (RF-24): fecha, profesional o todo el local, inicio, fin y motivo. Avisa si
// hay citas dentro (no las cancela) y solo vuelve atrás cuando la base guardó el bloqueo.
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';

import Boton from '@/components/Boton';
import CampoTexto from '@/components/CampoTexto';
import Chip from '@/components/Chip';
import EstadoPantalla from '@/components/EstadoPantalla';
import { NavegadorFecha } from '@/components/PartesAgenda';
import { useAgenda } from '@/hooks/useAgenda';
import { useCrearBloqueo, useDiasEspeciales } from '@/hooks/useDiasTrabajo';
import { useProfesionales } from '@/hooks/useProfesionales';
import { horaBogota } from '@/lib/agenda';
import {
  citasEnBloqueo,
  festivosDelRango,
  horarioVigente,
  MOTIVO_MAXIMO,
  textoVentana,
  validarBloqueo,
} from '@/lib/diasTrabajo';
import { aBogota, sumarDias } from '@/lib/disponibilidad';
import { mensajeDeDiasTrabajo, tituloDeError } from '@/lib/errores';
import { etiquetaDia, mayuscula } from '@/lib/fechas';

/** Chip "Todo el local": profesional_id null. */
const LOCAL = 'local';

export default function NuevoBloqueo() {
  const hoy = aBogota(new Date()).fecha;
  const [fecha, setFecha] = useState(hoy);
  const [quien, setQuien] = useState(LOCAL);
  const [inicio, setInicio] = useState('');
  const [fin, setFin] = useState('');
  const [motivo, setMotivo] = useState('');
  const [intentado, setIntentado] = useState(false);

  const profesionales = useProfesionales();
  const agenda = useAgenda({ desde: fecha, hasta: sumarDias(fecha, 1) });
  const dias = useDiasEspeciales(fecha, fecha);
  const crear = useCrearBloqueo();

  if (profesionales.isPending) return <EstadoPantalla tipo="carga" mensaje="Cargando los profesionales…" />;
  if (profesionales.isError) {
    return (
      <EstadoPantalla
        tipo="error"
        error={profesionales.error}
        onReintentar={() => void profesionales.refetch()}
      />
    );
  }

  const profesionalId = quien === LOCAL ? null : quien;
  const validacion = validarBloqueo({ fecha, inicio, fin, motivo }, Date.now());
  const dentro =
    validacion.ok && agenda.data
      ? citasEnBloqueo(agenda.data, { inicio: validacion.inicio, fin: validacion.fin, profesionalId })
      : [];
  const jornada = dias.data
    ? textoVentana(
        horarioVigente(fecha, new Set(festivosDelRango(fecha, fecha).keys()), dias.data.find((d) => d.fecha === fecha)),
      )
    : null;

  const enviar = () => {
    setIntentado(true);
    if (!validacion.ok) return;
    // Sin la agenda del día no se puede avisar de las citas: mejor no guardar a ciegas.
    if (!agenda.data) {
      Alert.alert('Aún no se puede guardar', 'No pudimos revisar las citas de ese día. Reintenta primero.');
      return;
    }
    const ejecutar = () =>
      crear.mutate(
        { profesionalId, inicio: validacion.inicio, fin: validacion.fin, motivo: validacion.motivo },
        {
          onSuccess: () => router.back(),
          onError: (e) => Alert.alert(tituloDeError(e), mensajeDeDiasTrabajo(e)),
        },
      );
    if (dentro.length === 0) return ejecutar();
    Alert.alert(
      'Hay citas dentro del bloqueo',
      `${dentro.length === 1 ? 'Una cita queda' : `${dentro.length} citas quedan`} dentro. No se cancelan: avísale a cada cliente.`,
      [
        { text: 'Volver', style: 'cancel' },
        { text: 'Bloquear igual', onPress: ejecutar },
      ],
    );
  };

  return (
    <ScrollView className="flex-1 bg-fondo" contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      <NavegadorFecha
        titulo={`${mayuscula(etiquetaDia(fecha).largo)}${fecha === hoy ? ' · Hoy' : ''}`}
        onAnterior={() => setFecha((f) => sumarDias(f, -1))}
        onSiguiente={() => setFecha((f) => sumarDias(f, 1))}
        anteriorDeshabilitado={fecha <= hoy}
      />
      {jornada ? (
        <Text className="mb-3 text-center font-texto text-sm text-secondary">
          {jornada === 'Cerrado' ? 'Ese día el local está cerrado.' : `Jornada de ese día: ${jornada}`}
        </Text>
      ) : null}

      <Text className="mb-1 font-texto text-sm text-primary">¿A quién bloquea?</Text>
      <View className="flex-row flex-wrap">
        <Chip etiqueta="Todo el local" activo={quien === LOCAL} onPress={() => setQuien(LOCAL)} />
        {profesionales.data.map((p) => (
          <Chip key={p.id} etiqueta={p.nombre} activo={quien === p.id} onPress={() => setQuien(p.id)} />
        ))}
      </View>

      <View className="mt-2 flex-row gap-3">
        <View className="flex-1">
          <CampoTexto
            etiqueta="Desde (HH:MM)"
            value={inicio}
            onChangeText={setInicio}
            placeholder="14:00"
            keyboardType="numbers-and-punctuation"
            maxLength={5}
          />
        </View>
        <View className="flex-1">
          <CampoTexto
            etiqueta="Hasta (HH:MM)"
            value={fin}
            onChangeText={setFin}
            placeholder="16:00"
            keyboardType="numbers-and-punctuation"
            maxLength={5}
          />
        </View>
      </View>
      <CampoTexto
        etiqueta="Motivo"
        value={motivo}
        onChangeText={setMotivo}
        placeholder="Día libre, cita médica, imprevisto…"
        maxLength={MOTIVO_MAXIMO}
      />
      {!validacion.ok && intentado ? (
        <Text className="mb-3 font-texto text-sm text-peligro">{validacion.error}</Text>
      ) : null}

      <Text className="font-texto text-sm text-secondary">
        El cliente verá estas franjas como &quot;Ocupada&quot;. El almuerzo ya está bloqueado siempre.
      </Text>

      {agenda.isError ? (
        <Text className="mt-3 font-texto text-sm text-peligro">
          No pudimos revisar las citas de ese día.{' '}
          <Text className="underline" onPress={() => void agenda.refetch()}>
            Reintentar
          </Text>
        </Text>
      ) : null}
      {dentro.length > 0 ? (
        <View className="mt-4 rounded-xl border border-peligro p-4">
          <Text className="font-texto text-base text-peligro">Citas dentro del bloqueo ({dentro.length})</Text>
          {dentro.map((c) => (
            <Text key={c.id} className="font-texto text-sm text-primary">
              {horaBogota(c.inicio)} – {horaBogota(c.fin)} · {c.profesional} · {c.cliente.nombre}
            </Text>
          ))}
          <Text className="mt-2 font-texto text-sm text-secondary">
            No se cancelan solas: resuélvelas con cada cliente.
          </Text>
        </View>
      ) : null}

      <Boton className="mt-6" onPress={enviar} cargando={crear.isPending} disabled={crear.isPending}>
        Guardar bloqueo
      </Boton>
    </ScrollView>
  );
}
