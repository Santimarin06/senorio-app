// Crear o editar la ficha de un profesional (RF-29, D-13, D-46): cuenta, nombre, cargo, foto y
// servicios que presta. Sin id en la ruta crea; con id edita. La persona se registra antes como
// cliente y aquí se elige su cuenta: guardar_profesional guarda la ficha, sus servicios y el rol
// en una sola transacción. Solo vuelve atrás cuando la base confirmó (RN-12).
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Text, View } from 'react-native';

import Boton from '@/components/Boton';
import CampoTexto from '@/components/CampoTexto';
import Chip from '@/components/Chip';
import EstadoPantalla from '@/components/EstadoPantalla';
import FormularioConTeclado from '@/components/FormularioConTeclado';
import SelectorCuenta from '@/components/gestion/SelectorCuenta';
import SelectorImagenComprobante from '@/components/SelectorImagenComprobante';
import Tarjeta from '@/components/Tarjeta';
import { FOTOS, GESTION } from '@/config/negocio';
import { useElegirImagen } from '@/hooks/useElegirImagen';
import {
  useCuentasSinFicha,
  useGuardarProfesional,
  useProfesionalesGestion,
  useServiciosGestion,
} from '@/hooks/useGestion';
import { useIdDeRuta } from '@/hooks/useIdDeRuta';
import { mensajeDeError, mensajeDeGestion } from '@/lib/errores';
import {
  entradaDeProfesional,
  validarProfesional,
  type CampoProfesional,
  type EntradaProfesional,
  type ErroresFormulario,
} from '@/lib/gestion';
import type { CuentaUsuario, ProfesionalGestion, ServicioGestion } from '@/types/entidades';

const OPCIONES_FOTO = {
  calidad: FOTOS.calidad,
  tamanoMaximoBytes: FOTOS.tamanoMaximoBytes,
  cuadrada: true,
} as const;

export default function FormularioProfesional() {
  const id = useIdDeRuta('id');
  const profesionales = useProfesionalesGestion();
  const servicios = useServiciosGestion();

  if (profesionales.isPending || servicios.isPending) {
    return <EstadoPantalla tipo="carga" mensaje="Cargando el formulario…" />;
  }
  if (profesionales.isError || servicios.isError) {
    return (
      <EstadoPantalla
        tipo="error"
        mensaje={mensajeDeError(profesionales.error ?? servicios.error)}
        onReintentar={() => {
          void profesionales.refetch();
          void servicios.refetch();
        }}
      />
    );
  }

  const profesional = id === '' ? null : (profesionales.data.find((p) => p.id === id) ?? null);
  if (id !== '' && !profesional) {
    return (
      <View className="flex-1 bg-fondo">
        <EstadoPantalla tipo="vacio" mensaje="Profesional no encontrado. Puede que el enlace sea viejo." />
        <Boton variante="borde" className="mx-6 mb-8" onPress={() => router.back()}>
          Volver a la gestión
        </Boton>
      </View>
    );
  }

  return (
    <Formulario key={profesional?.id ?? 'nuevo'} profesional={profesional} servicios={servicios.data} />
  );
}

function Formulario({
  profesional,
  servicios,
}: {
  profesional: ProfesionalGestion | null;
  servicios: ServicioGestion[];
}) {
  const [entrada, setEntrada] = useState<EntradaProfesional>(() => entradaDeProfesional(profesional));
  const [errores, setErrores] = useState<ErroresFormulario<CampoProfesional>>({});
  // Foto guardada en la base; null si no tiene o si el administrador la quitó.
  const [fotoActual, setFotoActual] = useState<string | null>(profesional?.foto ?? null);
  const selector = useElegirImagen(OPCIONES_FOTO);
  const guardar = useGuardarProfesional();

  // D-13: una ficha nueva, o una del seed que aún no tiene cuenta, se vincula a una cuenta.
  const necesitaCuenta = !profesional?.cuenta;
  const cuentas = useCuentasSinFicha(necesitaCuenta);

  // Solo se ofrecen los servicios activos. Los inactivos que ya prestaba siguen en
  // entrada.servicios sin mostrarse, así editar no los borra (como en D-43).
  const activos = servicios.filter((s) => s.activo);
  const principalesActivos = new Set(activos.filter((s) => !s.esAdicional).map((s) => s.id));

  const limpiarError = (campo: CampoProfesional) =>
    setErrores((e) => {
      const copia = { ...e };
      delete copia[campo];
      return copia;
    });
  const cambiar = <K extends 'nombre' | 'cargo'>(campo: K, valor: string) => {
    setEntrada((e) => ({ ...e, [campo]: valor }));
    limpiarError(campo);
  };
  const alternarServicio = (sid: string) => {
    setEntrada((e) => ({
      ...e,
      servicios: e.servicios.includes(sid) ? e.servicios.filter((x) => x !== sid) : [...e.servicios, sid],
    }));
    limpiarError('servicios');
  };
  const elegirCuenta = (c: CuentaUsuario | null) => {
    // Si el nombre está vacío, se propone el de la cuenta; el administrador puede cambiarlo.
    setEntrada((e) => ({
      ...e,
      usuarioId: c?.id ?? null,
      nombre: c && e.nombre.trim() === '' ? c.nombre : e.nombre,
    }));
    limpiarError('cuenta');
    if (c) limpiarError('nombre');
  };

  const enviar = () => {
    const r = validarProfesional(entrada, principalesActivos, necesitaCuenta, fotoActual);
    if (!r.ok) {
      setErrores(r.errores);
      return;
    }
    guardar.mutate(
      { id: profesional?.id ?? null, formulario: r.valor, fotoNueva: selector.imagen },
      {
        onSuccess: () => {
          Alert.alert(
            profesional ? 'Profesional actualizado' : 'Profesional creado',
            r.valor.usuarioId
              ? `${r.valor.nombre} quedó guardado. Para ver su agenda, debe cerrar sesión y volver a entrar.`
              : `${r.valor.nombre} quedó guardado.`,
          );
          router.back();
        },
        onError: (e) => Alert.alert('No se guardó', mensajeDeGestion(e)),
      },
    );
  };

  const ocupado = guardar.isPending || selector.leyendo;

  return (
    <FormularioConTeclado>
      <Text className="mb-1 font-texto text-sm text-primary">Cuenta</Text>
      {profesional?.cuenta ? (
        <View className="mb-4">
          <Tarjeta
            titulo={profesional.cuenta.nombre}
            subtitulo={profesional.cuenta.correo || 'Sin correo'}
            icono="person-circle-outline"
          />
          <Text className="font-texto text-sm text-secondary">
            Con esta cuenta entra a su agenda. La cuenta vinculada no se cambia desde aquí.
          </Text>
        </View>
      ) : (
        <>
          <Text className="mb-2 font-texto text-sm text-secondary">
            La persona se registra primero en la app como cliente. Elige su cuenta: al guardar, pasa a
            tener el rol de profesional.
          </Text>
          <SelectorCuenta
            cuentas={cuentas.data}
            cargando={cuentas.isPending}
            error={cuentas.error}
            onReintentar={() => void cuentas.refetch()}
            elegida={entrada.usuarioId}
            onElegir={elegirCuenta}
            deshabilitado={ocupado}
            errorCampo={errores.cuenta}
          />
        </>
      )}

      <CampoTexto
        etiqueta="Nombre visible"
        value={entrada.nombre}
        onChangeText={(v) => cambiar('nombre', v)}
        placeholder="Mario"
        maxLength={GESTION.nombreMaximo}
        error={errores.nombre}
      />
      <CampoTexto
        etiqueta="Cargo (opcional)"
        value={entrada.cargo}
        onChangeText={(v) => cambiar('cargo', v)}
        placeholder="Barbero senior"
        maxLength={GESTION.cargoMaximo}
        error={errores.cargo}
      />

      <Text className="mb-1 font-texto text-sm text-primary">Foto (opcional)</Text>
      {fotoActual && !selector.imagen ? (
        <View className="mb-3 rounded-xl border border-borde p-3">
          <Image
            source={{ uri: fotoActual }}
            contentFit="cover"
            style={{ width: 160, height: 160, borderRadius: 12, alignSelf: 'center' }}
            accessibilityLabel={`Foto actual de ${entrada.nombre || 'el profesional'}`}
          />
          <Boton variante="texto" disabled={ocupado} onPress={() => setFotoActual(null)}>
            Quitar foto
          </Boton>
        </View>
      ) : null}
      {!fotoActual && !selector.imagen ? (
        <View className="mb-1">
          <Tarjeta
            titulo={entrada.nombre.trim() || 'Profesional sin foto'}
            subtitulo="Sin foto: el cliente ve este ícono en su lugar."
            icono="person"
          />
        </View>
      ) : null}
      <SelectorImagenComprobante
        selector={selector}
        deshabilitado={guardar.isPending}
        tamanoMaximoBytes={FOTOS.tamanoMaximoBytes}
        queEs="foto del profesional"
      />
      {selector.imagen ? (
        <Boton variante="texto" disabled={ocupado} onPress={selector.limpiar}>
          Descartar la foto nueva
        </Boton>
      ) : null}

      <Text className="mb-1 mt-2 font-texto text-sm text-primary">Servicios que presta</Text>
      {activos.length === 0 ? (
        <Text className="mb-2 font-texto text-sm text-secondary">
          No hay servicios activos. Crea uno en la pestaña Servicios.
        </Text>
      ) : (
        <View className="flex-row flex-wrap">
          {activos.map((s) => (
            <Chip
              key={s.id}
              etiqueta={s.esAdicional ? `${s.nombre} (adicional)` : s.nombre}
              activo={entrada.servicios.includes(s.id)}
              onPress={() => alternarServicio(s.id)}
            />
          ))}
        </View>
      )}
      {errores.servicios ? (
        <Text className="mb-2 font-texto text-sm text-peligro">{errores.servicios}</Text>
      ) : null}

      <Boton className="mt-6" onPress={enviar} cargando={guardar.isPending} disabled={selector.leyendo}>
        {profesional ? 'Guardar cambios' : 'Crear profesional'}
      </Boton>
      {profesional && !profesional.activo ? (
        <Text className="mt-3 text-center font-texto text-sm text-secondary">
          Este profesional está inactivo: los clientes no lo ven hasta que lo reactives.
        </Text>
      ) : null}
    </FormularioConTeclado>
  );
}
