import { Redirect } from 'expo-router';

// Inicio definido: la app abre en el inicio de sesión (SRS §7).
export default function Index() {
  return <Redirect href="/login" />;
}
