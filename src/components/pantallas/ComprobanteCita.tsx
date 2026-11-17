// Cuerpo de "Recibido para revisión" (RF-13, RN-09). Muestra el comprobante que la base
// guardó: pendiente (con reemplazo de la imagen), aprobado o rechazado (con su nota). El
// anticipo solo cuenta como pagado cuando el local lo aprueba.
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, Text, View } from 'react-native';

import AvisoEscritura from '@/components/AvisoEscritura';
import Boton from '@/components/Boton';
import PantallaPendiente from '@/components/PantallaPendiente';
import SelectorImagenComprobante from '@/components/SelectorImagenComprobante';
import { MEDIOS_PAGO } from '@/config/negocio';
import { useEnviarComprobante, useImagenComprobante } from '@/hooks/useComprobante';
import { useElegirImagen } from '@/hooks/useElegirImagen';
import { codigoCita, codigoComprobante } from '@/lib/codigoCita';
import { mensajeDeComprobante, mensajeDeError } from '@/lib/errores';
import { formatoFechaHoraBogota } from '@/lib/fechas';
import { calcularSaldo, formatoCOP } from '@/lib/finanzas';
import { enlaceWhatsApp, mensajeComprobante } from '@/lib/whatsapp';
import { ETIQUETA_ANTICIPO } from '@/models/cita.mapper';
import type { Cita, Comprobante } from '@/types/entidades';

const TITULO = {
  pendiente: 'Recibido para revisión.',
  aprobado: 'Anticipo aprobado.',
  rechazado: 'Comprobante rechazado.',
} as const;

export default function ComprobanteCita({ cita }: { cita: Cita }) {
  const { comprobante } = cita.anticipo;

  if (!comprobante) {
    return (
      <PantallaPendiente
        icono="receipt-outline"
        mensaje="Aún no has enviado un comprobante para esta cita. Sin anticipo, pagas todo en el local."
        acciones={[
          {
            texto: 'Pagar anticipo',
            onPress: () =>
              router.navigate({ pathname: '/cita/[id]/anticipo', params: { id: cita.id } }),
          },
          {
            texto: 'Volver a la cita',
            onPress: () => router.navigate({ pathname: '/cita/[id]', params: { id: cita.id } }),
          },
        ]}
      />
    );
  }

  return <DetalleComprobante cita={cita} comprobante={comprobante} />;
}

function DetalleComprobante({ cita, comprobante }: { cita: Cita; comprobante: Comprobante }) {
  const imagenGuardada = useImagenComprobante(comprobante.archivoPath);
  const selector = useElegirImagen();
  const reemplazar = useEnviarComprobante();
  const [errorWhatsApp, setErrorWhatsApp] = useState(false);
  // Sin conexión la imagen no descarga: se muestra un aviso con Reintentar en vez de un hueco.
  const [falloImagen, setFalloImagen] = useState(false);
  const reintentarImagen = () => {
    setFalloImagen(false);
    void imagenGuardada.refetch();
  };

  const pendiente = comprobante.estado === 'pendiente';
  const medio = MEDIOS_PAGO.find((m) => m.id === comprobante.metodo)?.nombre ?? null;
  const saldoActual = calcularSaldo(cita.total, cita.anticipoAprobado);
  const saldoSiAprueba = calcularSaldo(cita.total, cita.anticipoAprobado + comprobante.monto);
  const tipoTexto = comprobante.tipo === 'total' ? 'Pago total' : 'Abono solicitado';

  const confirmarReemplazo = () => {
    if (!selector.imagen) return;
    reemplazar.mutate(
      {
        modo: 'reemplazo',
        citaId: cita.id,
        comprobanteId: comprobante.id,
        imagen: selector.imagen,
      },
      // La cita se relee (onSettled del hook) y trae la imagen nueva.
      { onSuccess: selector.limpiar },
    );
  };

  const abrirWhatsApp = async () => {
    setErrorWhatsApp(false);
    const enlace = enlaceWhatsApp(
      mensajeComprobante({
        codigoCita: codigoCita(cita.id),
        codigoComprobante: codigoComprobante(comprobante.id),
        tipo: comprobante.tipo,
        monto: comprobante.monto,
        medio,
      }),
    );
    try {
      await Linking.openURL(enlace);
    } catch {
      setErrorWhatsApp(true);
    }
  };

  return (
    <ScrollView className="flex-1 bg-fondo" contentContainerStyle={{ padding: 24 }}>
      <Text className="font-texto text-sm text-secondary">COMPROBANTE · {codigoCita(cita.id)}</Text>
      <Text className="font-titulo text-2xl text-primary">{TITULO[comprobante.estado]}</Text>

      <View className="my-4 rounded-xl border border-borde p-4">
        <View className="flex-row items-center">
          <Ionicons
            name={
              comprobante.estado === 'aprobado'
                ? 'checkmark-circle'
                : comprobante.estado === 'rechazado'
                  ? 'close-circle'
                  : 'time-outline'
            }
            size={22}
            color={comprobante.estado === 'rechazado' ? '#B91C1C' : '#111111'}
          />
          <Text className="ml-2 font-titulo text-base text-primary">
            {ETIQUETA_ANTICIPO[comprobante.estado]}
          </Text>
        </View>
        {pendiente ? (
          <>
            <Text className="mt-1 font-texto text-base text-primary">
              Aún no cuenta como pagado
            </Text>
            <Text className="font-texto text-sm text-secondary">
              Guardamos tu comprobante en la app. El administrador debe aprobarlo para aplicar el{' '}
              {comprobante.tipo === 'total' ? 'pago' : 'abono'} a tu cita.
            </Text>
          </>
        ) : null}
        {comprobante.estado === 'rechazado' ? (
          <Text className="mt-1 font-texto text-sm text-peligro">
            {comprobante.notaRechazo
              ? `Motivo: ${comprobante.notaRechazo}`
              : 'El local no indicó el motivo. Escríbele por WhatsApp si tienes dudas.'}
          </Text>
        ) : null}
      </View>

      <View className="mb-4 rounded-xl border border-borde p-3">
        {imagenGuardada.data && !falloImagen ? (
          <Image
            key={imagenGuardada.dataUpdatedAt}
            onError={() => setFalloImagen(true)}
            source={imagenGuardada.data}
            contentFit="contain"
            style={{ width: '100%', height: 220 }}
            accessibilityLabel="Comprobante enviado"
          />
        ) : imagenGuardada.isError || falloImagen ? (
          <View className="items-center">
            <Text className="mb-2 text-center font-texto text-sm text-secondary">
              {imagenGuardada.isError
                ? mensajeDeError(imagenGuardada.error)
                : 'No pudimos cargar la imagen. Revisa tu conexión.'}
            </Text>
            <Boton variante="borde" onPress={reintentarImagen}>
              Reintentar
            </Boton>
          </View>
        ) : (
          <ActivityIndicator color="#111111" />
        )}
        <Text className="mt-2 font-texto text-sm text-secondary">
          Subido el {formatoFechaHoraBogota(comprobante.subidoEn)}
        </Text>
      </View>

      <View className="mb-4 rounded-xl border border-borde p-4">
        <Fila texto={tipoTexto} valor={formatoCOP(comprobante.monto)} />
        <Fila texto="Método" valor={medio ?? 'Sin indicar'} />
        <Fila
          texto="Referencia en la app"
          valor={`${codigoComprobante(comprobante.id)} · ${codigoCita(cita.id)}`}
        />
        <View className="my-3 border-t border-borde" />
        <Fila texto="Anticipo aprobado" valor={formatoCOP(cita.anticipoAprobado)} />
        <Fila texto="Saldo actual" valor={formatoCOP(saldoActual)} />
        {pendiente ? (
          <Text className="mt-2 font-texto text-sm text-secondary">
            Al aprobarse {formatoCOP(comprobante.monto)}, tu saldo será {formatoCOP(saldoSiAprueba)}
            .
          </Text>
        ) : null}
      </View>

      {pendiente ? (
        <>
          <Text className="mb-2 font-titulo text-base text-primary">Reemplazar la imagen</Text>
          <Text className="mb-2 font-texto text-sm text-secondary">
            Puedes reemplazar la imagen mientras siga pendiente.
          </Text>
          <SelectorImagenComprobante selector={selector} deshabilitado={reemplazar.isPending} />
          {selector.imagen ? (
            <Boton className="mb-3" cargando={reemplazar.isPending} onPress={confirmarReemplazo}>
              {reemplazar.isError ? 'Reintentar reemplazo' : 'Reemplazar comprobante'}
            </Boton>
          ) : null}
          {reemplazar.isError ? (
            <AvisoEscritura
              error={reemplazar.error}
              mensaje={`${mensajeDeComprobante(reemplazar.error)} Tu comprobante anterior sigue igual.`}
            />
          ) : null}
          {reemplazar.isSuccess && !selector.imagen ? (
            <Text className="mb-3 font-texto text-sm text-primary">
              Imagen reemplazada. Sigue pendiente de revisión.
            </Text>
          ) : null}
        </>
      ) : null}

      {comprobante.estado === 'rechazado' ? (
        <Boton
          className="mb-3"
          onPress={() =>
            router.navigate({ pathname: '/cita/[id]/anticipo', params: { id: cita.id } })
          }
        >
          Enviar otro comprobante
        </Boton>
      ) : null}

      <Boton variante="borde" className="mb-2" onPress={() => void abrirWhatsApp()}>
        Avisar por WhatsApp
      </Boton>
      <Text className="mb-3 font-texto text-sm text-secondary">
        El mensaje lleva la referencia. WhatsApp no recibe la imagen desde la app: adjúntala tú en
        el chat.
      </Text>
      {errorWhatsApp ? (
        <Text className="mb-3 font-texto text-sm text-peligro">
          No pudimos abrir WhatsApp. Tu comprobante sigue guardado en la app.
        </Text>
      ) : null}

      <Boton
        variante="texto"
        onPress={() => router.navigate({ pathname: '/cita/[id]', params: { id: cita.id } })}
      >
        Volver a la cita
      </Boton>
    </ScrollView>
  );
}

function Fila({ texto, valor }: { texto: string; valor: string }) {
  return (
    <View className="flex-row justify-between">
      <Text className="font-texto text-base text-secondary">{texto}</Text>
      <Text className="ml-4 flex-shrink font-texto text-base text-primary">{valor}</Text>
    </View>
  );
}
