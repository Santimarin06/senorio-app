// Crear o editar un producto (RF-27): nombre, descripción, categoría, precio y foto opcional.
// La foto se elige con la cámara o la galería (JPG o PNG, recortada cuadrada) y se sube al
// guardar; sin foto, el catálogo muestra la imagen de reemplazo. Solo vuelve atrás cuando la
// base confirmó (RN-12).
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Text, View } from 'react-native';

import Boton from '@/components/Boton';
import CampoTexto from '@/components/CampoTexto';
import Chip from '@/components/Chip';
import EstadoPantalla from '@/components/EstadoPantalla';
import FormularioConTeclado from '@/components/FormularioConTeclado';
import SelectorImagenComprobante from '@/components/SelectorImagenComprobante';
import Tarjeta from '@/components/Tarjeta';
import { FOTOS, GESTION } from '@/config/negocio';
import { useElegirImagen } from '@/hooks/useElegirImagen';
import { useGuardarProducto, useProductosGestion } from '@/hooks/useGestion';
import { useIdDeRuta } from '@/hooks/useIdDeRuta';
import { mensajeDeError, mensajeDeGestion } from '@/lib/errores';
import {
  entradaDeProducto,
  validarProducto,
  type CampoProducto,
  type EntradaProducto,
  type ErroresFormulario,
} from '@/lib/gestion';
import type { CategoriaProducto, ProductoGestion } from '@/types/entidades';

const CATEGORIAS: { id: CategoriaProducto; nombre: string }[] = [
  { id: 'cabello', nombre: 'Cabello' },
  { id: 'barba', nombre: 'Barba' },
];

const OPCIONES_FOTO = {
  calidad: FOTOS.calidad,
  tamanoMaximoBytes: FOTOS.tamanoMaximoBytes,
  cuadrada: true,
} as const;

export default function FormularioProducto() {
  const id = useIdDeRuta('id');
  const productos = useProductosGestion();

  if (productos.isPending) return <EstadoPantalla tipo="carga" mensaje="Cargando el formulario…" />;
  if (productos.isError) {
    return (
      <EstadoPantalla
        tipo="error"
        mensaje={mensajeDeError(productos.error)}
        onReintentar={() => void productos.refetch()}
      />
    );
  }

  const producto = id === '' ? null : (productos.data.find((p) => p.id === id) ?? null);
  if (id !== '' && !producto) {
    return (
      <View className="flex-1 bg-fondo">
        <EstadoPantalla tipo="vacio" mensaje="No encontramos ese producto. Puede que el enlace sea viejo." />
        <Boton variante="borde" className="mx-6 mb-8" onPress={() => router.back()}>
          Volver a la gestión
        </Boton>
      </View>
    );
  }

  return <Formulario key={producto?.id ?? 'nuevo'} producto={producto} />;
}

function Formulario({ producto }: { producto: ProductoGestion | null }) {
  const [entrada, setEntrada] = useState<EntradaProducto>(() => entradaDeProducto(producto));
  const [errores, setErrores] = useState<ErroresFormulario<CampoProducto>>({});
  // Foto guardada en la base; null si no tiene o si el administrador la quitó.
  const [fotoActual, setFotoActual] = useState<string | null>(producto?.foto ?? null);
  const selector = useElegirImagen(OPCIONES_FOTO);
  const guardar = useGuardarProducto();

  const cambiar = <K extends keyof EntradaProducto>(campo: K, valor: EntradaProducto[K]) => {
    setEntrada((e) => ({ ...e, [campo]: valor }));
    setErrores((e) => {
      const copia = { ...e };
      delete copia[campo];
      return copia;
    });
  };

  const enviar = () => {
    const r = validarProducto(entrada, fotoActual);
    if (!r.ok) {
      setErrores(r.errores);
      return;
    }
    guardar.mutate(
      { id: producto?.id ?? null, formulario: r.valor, fotoNueva: selector.imagen },
      {
        onSuccess: () => {
          Alert.alert(producto ? 'Producto actualizado' : 'Producto creado', `${r.valor.nombre} quedó guardado.`);
          router.back();
        },
        onError: (e) => Alert.alert('No se guardó', mensajeDeGestion(e)),
      },
    );
  };

  const ocupado = guardar.isPending || selector.leyendo;

  return (
    <FormularioConTeclado>
      <CampoTexto
        etiqueta="Nombre"
        value={entrada.nombre}
        onChangeText={(v) => cambiar('nombre', v)}
        placeholder="Cera mate"
        maxLength={GESTION.nombreMaximo}
        error={errores.nombre}
      />
      <CampoTexto
        etiqueta="Descripción (opcional)"
        value={entrada.descripcion}
        onChangeText={(v) => cambiar('descripcion', v)}
        placeholder="Para qué sirve, presentación…"
        maxLength={GESTION.descripcionMaxima}
        multiline
        error={errores.descripcion}
      />

      <Text className="mb-1 font-texto text-sm text-primary">Categoría</Text>
      <View className="flex-row flex-wrap">
        {CATEGORIAS.map((c) => (
          <Chip
            key={c.id}
            etiqueta={c.nombre}
            activo={entrada.categoria === c.id}
            onPress={() => cambiar('categoria', c.id)}
          />
        ))}
      </View>
      {errores.categoria ? (
        <Text className="mb-2 font-texto text-sm text-peligro">{errores.categoria}</Text>
      ) : null}

      <View className="mt-2">
        <CampoTexto
          etiqueta="Precio (COP)"
          value={entrada.precio}
          onChangeText={(v) => cambiar('precio', v)}
          placeholder="25.000"
          keyboardType="number-pad"
          maxLength={9}
          error={errores.precio}
        />
      </View>

      <Text className="mb-1 font-texto text-sm text-primary">Foto (opcional)</Text>
      {fotoActual && !selector.imagen ? (
        <View className="mb-3 rounded-xl border border-borde p-3">
          <Image
            source={{ uri: fotoActual }}
            contentFit="cover"
            style={{ width: 160, height: 160, borderRadius: 12, alignSelf: 'center' }}
            accessibilityLabel={`Foto actual de ${entrada.nombre || 'el producto'}`}
          />
          <Boton variante="texto" disabled={ocupado} onPress={() => setFotoActual(null)}>
            Quitar foto
          </Boton>
        </View>
      ) : null}
      {!fotoActual && !selector.imagen ? (
        <View className="mb-1">
          <Tarjeta
            titulo={entrada.nombre.trim() || 'Producto sin foto'}
            subtitulo="Sin foto: el catálogo muestra esta imagen de reemplazo."
            icono="bag-outline"
          />
        </View>
      ) : null}
      <SelectorImagenComprobante
        selector={selector}
        deshabilitado={guardar.isPending}
        tamanoMaximoBytes={FOTOS.tamanoMaximoBytes}
        queEs="producto"
      />
      {selector.imagen ? (
        <Boton variante="texto" disabled={ocupado} onPress={selector.limpiar}>
          Descartar la foto nueva
        </Boton>
      ) : null}

      <Boton className="mt-4" onPress={enviar} cargando={guardar.isPending} disabled={selector.leyendo}>
        {producto ? 'Guardar cambios' : 'Crear producto'}
      </Boton>
      {producto && !producto.activo ? (
        <Text className="mt-3 text-center font-texto text-sm text-secondary">
          Este producto está inactivo: los clientes no lo ven hasta que lo reactives.
        </Text>
      ) : null}
    </FormularioConTeclado>
  );
}
