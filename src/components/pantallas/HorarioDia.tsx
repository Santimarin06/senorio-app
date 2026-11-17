// Horario de un día (RF-24, D-09, D-24): habilitar un domingo o festivo, cambiar el horario de
// cualquier fecha, cerrarla o quitar la excepción. El almuerzo sigue bloqueado. Si hay citas ya
// reservadas fuera del nuevo horario, avisa y pide confirmar, pero no las cancela.
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Text, View } from 'react-native';

import Boton from '@/components/Boton';
import CampoTexto from '@/components/CampoTexto';
import Chip from '@/components/Chip';
import EstadoPantalla from '@/components/EstadoPantalla';
import FormularioConTeclado from '@/components/FormularioConTeclado';
import { NavegadorFecha } from '@/components/PartesAgenda';
import { HORARIO } from '@/config/negocio';
import { useAgenda } from '@/hooks/useAgenda';
import {
  useDiasEspeciales,
  useGuardarDiaEspecial,
  useQuitarDiaEspecial,
} from '@/hooks/useDiasTrabajo';
import { horaBogota } from '@/lib/agenda';
import {
  citasFueraDeHorario,
  esFechaValida,
  festivosDelRango,
  horaTexto,
  horarioNormal,
  MOTIVO_MAXIMO,
  textoVentana,
  validarJornada,
} from '@/lib/diasTrabajo';
import { aBogota, CONFIG, sumarDias } from '@/lib/disponibilidad';
import { mensajeDeDiasTrabajo, tituloDeError } from '@/lib/errores';
import { etiquetaDia, mayuscula } from '@/lib/fechas';
import type { CitaAgenda, DiaEspecial } from '@/types/entidades';

const hoyEnBogota = () => aBogota(new Date()).fecha;

export default function HorarioDia({ fechaInicial }: { fechaInicial?: string }) {
  const hoy = hoyEnBogota();
  const inicialValida = fechaInicial === undefined || (esFechaValida(fechaInicial) && fechaInicial >= hoy);
  const [fecha, setFecha] = useState(fechaInicial && inicialValida ? fechaInicial : hoy);

  const dias = useDiasEspeciales(fecha, fecha);
  const agenda = useAgenda({ desde: fecha, hasta: sumarDias(fecha, 1) });

  if (!inicialValida) {
    return (
      <EstadoPantalla
        tipo="vacio"
        icono="calendar-clear-outline"
        titulo="Fecha no válida"
        mensaje="Esa fecha no existe o ya pasó. Elige otra en los días laborables."
        accion={{ texto: 'Ver días laborables', onPress: () => router.navigate('/panel/dias') }}
      />
    );
  }

  const cuerpo = () => {
    if (dias.isPending || agenda.isPending) {
      return <EstadoPantalla tipo="carga" mensaje="Revisando el horario y las citas del día…" />;
    }
    // Solo sin datos se cambia el formulario por el error: si falla un refresco (al volver a la
    // app sin internet) se conservan los datos y no se pierde lo escrito (RN-14).
    if (dias.data === undefined || agenda.data === undefined) {
      return (
        <EstadoPantalla
          tipo="error"
          error={dias.error ?? agenda.error}
          onReintentar={() => {
            void dias.refetch();
            void agenda.refetch();
          }}
        />
      );
    }
    const existente = dias.data.find((d) => d.fecha === fecha);
    // La key reinicia el formulario al cambiar de fecha o cuando cambia lo guardado.
    return (
      <FormularioDia
        key={`${fecha}-${JSON.stringify(existente ?? null)}`}
        fecha={fecha}
        existente={existente}
        citas={agenda.data}
      />
    );
  };

  return (
    <View className="flex-1 bg-fondo">
      <View className="border-b border-borde px-4 py-2">
        <NavegadorFecha
          titulo={`${mayuscula(etiquetaDia(fecha).largo)}${fecha === hoy ? ' · Hoy' : ''}`}
          onAnterior={() => setFecha((f) => sumarDias(f, -1))}
          onSiguiente={() => setFecha((f) => sumarDias(f, 1))}
          anteriorDeshabilitado={fecha <= hoy}
        />
      </View>
      {cuerpo()}
    </View>
  );
}

const describirCita = (c: CitaAgenda) =>
  `${horaBogota(c.inicio)} – ${horaBogota(c.fin)} · ${c.profesional} · ${c.cliente.nombre}`;

function FormularioDia({
  fecha,
  existente,
  citas,
}: {
  fecha: string;
  existente: DiaEspecial | undefined;
  citas: CitaAgenda[];
}) {
  const festivos = festivosDelRango(fecha, fecha);
  const festivo = festivos.get(fecha);
  const normal = horarioNormal(fecha, new Set(festivos.keys()));
  // Valores iniciales: lo guardado; si no hay, el horario normal o el de un día habilitado.
  const sugerido = existente?.abierto ? existente : (normal ?? CONFIG.HABILITADO);

  const [abierto, setAbierto] = useState(existente ? existente.abierto : true);
  const [apertura, setApertura] = useState(horaTexto(sugerido.abreMin));
  const [cierre, setCierre] = useState(horaTexto(sugerido.cierraMin));
  const [nota, setNota] = useState(existente?.nota ?? '');
  const [intentado, setIntentado] = useState(false);

  const guardar = useGuardarDiaEspecial();
  const quitar = useQuitarDiaEspecial();
  const ocupado = guardar.isPending || quitar.isPending;

  const jornada = validarJornada(apertura, cierre);
  const nuevaVentana = abierto && jornada.ok ? { abreMin: jornada.inicioMin, cierraMin: jornada.finMin } : null;
  // Solo se avisa cuando se sabe cuál sería el horario: cerrado, o abierto con horas válidas.
  const fuera = !abierto || jornada.ok ? citasFueraDeHorario(citas, fecha, nuevaVentana) : [];

  const tipoDia = festivo ? `Festivo: ${festivo}` : normal ? 'Día normal' : 'Domingo';

  const enviar = () => {
    setIntentado(true);
    if (abierto && !jornada.ok) return;
    const dia: DiaEspecial = {
      fecha,
      abierto,
      // Cerrado, se guardan unas horas válidas igual (check de la tabla).
      abreMin: nuevaVentana?.abreMin ?? CONFIG.HABILITADO.abreMin,
      cierraMin: nuevaVentana?.cierraMin ?? CONFIG.HABILITADO.cierraMin,
      nota: nota.trim() || null,
    };
    const ejecutar = () =>
      guardar.mutate(dia, {
        onSuccess: () => {
          Alert.alert('Guardado', `${mayuscula(etiquetaDia(fecha).largo)}: ${abierto ? textoVentana(nuevaVentana) : 'cerrado'}.`);
          router.back();
        },
        onError: (e) => Alert.alert(tituloDeError(e), mensajeDeDiasTrabajo(e)),
      });
    if (fuera.length === 0) return ejecutar();
    Alert.alert(
      'Hay citas fuera del nuevo horario',
      `${fuera.length === 1 ? 'Una cita queda' : `${fuera.length} citas quedan`} fuera. No se cancelan: avísale a cada cliente.`,
      [
        { text: 'Volver', style: 'cancel' },
        { text: 'Guardar igual', onPress: ejecutar },
      ],
    );
  };

  const onQuitar = () => {
    const fueraAlQuitar = citasFueraDeHorario(citas, fecha, normal);
    const vuelve = normal ? `vuelve al horario normal (${textoVentana(normal)})` : 'vuelve a estar cerrado';
    Alert.alert(
      '¿Quitar la excepción?',
      `El día ${vuelve}.` +
        (fueraAlQuitar.length > 0
          ? ` ${fueraAlQuitar.length} cita(s) quedarían fuera; no se cancelan.`
          : ''),
      [
        { text: 'Volver', style: 'cancel' },
        {
          text: 'Quitar',
          style: 'destructive',
          onPress: () =>
            quitar.mutate(fecha, {
              onSuccess: () => router.back(),
              onError: (e) => Alert.alert(tituloDeError(e, 'No se quitó'), mensajeDeDiasTrabajo(e)),
            }),
        },
      ],
    );
  };

  return (
    <FormularioConTeclado>
      <Text className="font-texto text-base text-primary">
        {tipoDia} · Horario normal: {textoVentana(normal)}
      </Text>
      {existente ? (
        <Text className="font-texto text-base text-primary">
          Excepción guardada: {existente.abierto ? textoVentana(existente) : 'cerrado'}
        </Text>
      ) : null}

      <View className="mt-4 flex-row">
        <Chip etiqueta="Abierto" activo={abierto} onPress={() => setAbierto(true)} />
        <Chip etiqueta="Cerrado" activo={!abierto} onPress={() => setAbierto(false)} />
      </View>

      {abierto ? (
        <View className="mt-2 flex-row gap-3">
          <View className="flex-1">
            <CampoTexto
              etiqueta="Apertura (HH:MM)"
              value={apertura}
              onChangeText={setApertura}
              placeholder="10:00"
              keyboardType="numbers-and-punctuation"
              maxLength={5}
            />
          </View>
          <View className="flex-1">
            <CampoTexto
              etiqueta="Cierre (HH:MM)"
              value={cierre}
              onChangeText={setCierre}
              placeholder="16:00"
              keyboardType="numbers-and-punctuation"
              maxLength={5}
            />
          </View>
        </View>
      ) : null}
      {abierto && !jornada.ok && intentado ? (
        <Text className="mb-3 font-texto text-sm text-peligro">{jornada.error}</Text>
      ) : null}

      <CampoTexto
        etiqueta="Nota (opcional)"
        value={nota}
        onChangeText={setNota}
        placeholder="Por ejemplo: temporada de diciembre"
        maxLength={MOTIVO_MAXIMO}
      />

      <Text className="font-texto text-sm text-secondary">
        El almuerzo de {HORARIO.almuerzo.inicio} a {HORARIO.almuerzo.fin} sigue bloqueado, aunque el
        día esté habilitado.
      </Text>

      {fuera.length > 0 ? (
        <View className="mt-4 rounded-xl border border-peligro p-4">
          <Text className="font-texto text-base text-peligro">
            {abierto ? 'Citas fuera del nuevo horario' : 'Citas reservadas ese día'} ({fuera.length})
          </Text>
          {fuera.map((c) => (
            <Text key={c.id} className="font-texto text-sm text-primary">
              {describirCita(c)}
            </Text>
          ))}
          <Text className="mt-2 font-texto text-sm text-secondary">
            No se cancelan solas: resuélvelas con cada cliente.
          </Text>
        </View>
      ) : null}

      <Boton className="mt-6" onPress={enviar} cargando={guardar.isPending} disabled={ocupado}>
        {abierto ? 'Guardar horario' : 'Cerrar este día'}
      </Boton>
      {existente ? (
        <Boton
          className="mt-3"
          variante="borde"
          onPress={onQuitar}
          cargando={quitar.isPending}
          disabled={ocupado}
        >
          Quitar la excepción
        </Boton>
      ) : null}
    </FormularioConTeclado>
  );
}
