// Privacidad y tratamiento de datos (D-16, D-44): qué guarda la app, para qué, quién lo ve y
// qué puede hacer el usuario. Describe lo que la app hace de verdad (RLS, Storage privado,
// ubicación sin guardar). Una sola pantalla, abierta desde el Drawer, la Cuenta y el Perfil.
import SeccionesTexto, { type SeccionTexto } from '@/components/SeccionesTexto';
import { NEGOCIO } from '@/config/negocio';

export const SECCIONES_PRIVACIDAD: SeccionTexto[] = [
  {
    titulo: 'Qué datos guardamos',
    puntos: [
      'Tu nombre, tu teléfono celular y tu correo, para crear tu cuenta.',
      'Tus citas, sus multas y devoluciones, y las imágenes de los comprobantes de anticipo que subes.',
    ],
  },
  {
    titulo: 'Para qué los usamos',
    puntos: [
      'Para agendar, cancelar y reagendar tus citas y aplicar la política de reservas.',
      'Para que el local revise tus comprobantes y te contacte si hace falta.',
      'No los vendemos ni los usamos para publicidad.',
    ],
  },
  {
    titulo: 'Quién los ve',
    puntos: [
      'Tú ves solo tus datos y tus citas.',
      'El profesional que te atiende ve tu nombre y tu teléfono en las citas que tiene contigo.',
      'El administrador del local ve las citas, las multas y los comprobantes para gestionarlos.',
      'Los comprobantes se guardan en un almacenamiento privado: solo tú y el administrador pueden abrirlos.',
    ],
  },
  {
    titulo: 'Permisos del teléfono',
    puntos: [
      'Ubicación: solo mientras ves el mapa de El local, para mostrarte dónde estás. No se guarda ni se envía.',
      'Cámara y galería: solo cuando eliges la foto de un comprobante.',
      'Puedes negar o quitar estos permisos en los ajustes del teléfono; el resto de la app sigue funcionando.',
    ],
  },
  {
    titulo: 'WhatsApp y tu sesión',
    puntos: [
      'Los mensajes de WhatsApp los envías tú desde tu teléfono; la app solo prepara el texto.',
      'Tu sesión se guarda cifrada en este teléfono y se borra al cerrar sesión.',
    ],
  },
  {
    titulo: 'Tus derechos',
    puntos: [
      'Puedes cambiar tu nombre y tu teléfono en Cuenta › Editar mis datos.',
      `Para conocer, corregir o pedir que borremos tus datos (Ley 1581 de 2012), escríbele a ${NEGOCIO.nombre} por WhatsApp.`,
    ],
  },
];

export default function Privacidad() {
  return (
    <SeccionesTexto
      titulo="Privacidad y tratamiento de datos"
      introduccion={`Cómo cuida ${NEGOCIO.nombre} la información que usas en la app.`}
      secciones={SECCIONES_PRIVACIDAD}
    />
  );
}
