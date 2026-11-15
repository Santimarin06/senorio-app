// Botón reutilizable (como CustomButton en navegation-app).
// forwardRef permite usarlo dentro de <Link asChild>.
import { ComponentRef, forwardRef } from 'react';
import { ActivityIndicator, Pressable, PressableProps, Text } from 'react-native';

interface Props extends PressableProps {
  children: string;
  variante?: 'relleno' | 'borde' | 'texto';
  cargando?: boolean;
  className?: string;
}

const estilosContenedor = {
  relleno: 'bg-primary',
  borde: 'border border-primary bg-fondo',
  texto: '',
} as const;

const estilosTexto = {
  relleno: 'text-white',
  borde: 'text-primary',
  texto: 'text-primary underline',
} as const;

const Boton = forwardRef<ComponentRef<typeof Pressable>, Props>(
  ({ children, variante = 'relleno', cargando = false, disabled, className, ...props }, ref) => {
    const inactivo = Boolean(disabled) || cargando;

    return (
      <Pressable
        ref={ref}
        accessibilityRole="button"
        accessibilityState={{ disabled: inactivo, busy: cargando }}
        disabled={inactivo}
        className={`min-h-12 items-center justify-center rounded-lg px-4 py-3 active:opacity-80 ${
          estilosContenedor[variante]
        } ${inactivo ? 'opacity-50' : ''} ${className ?? ''}`}
        {...props}
      >
        {cargando ? (
          <ActivityIndicator color={variante === 'relleno' ? '#FFFFFF' : '#111111'} />
        ) : (
          <Text className={`text-center font-texto text-base ${estilosTexto[variante]}`}>
            {children}
          </Text>
        )}
      </Pressable>
    );
  },
);

Boton.displayName = 'Boton';
export default Boton;
