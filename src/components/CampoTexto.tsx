// Campo de formulario reutilizable: etiqueta, entrada y mensaje de error específico (RF-01).
import { Text, TextInput, View, type TextInputProps } from 'react-native';

interface Props extends Omit<TextInputProps, 'className'> {
  etiqueta: string;
  error?: string;
}

export default function CampoTexto({ etiqueta, error, ...props }: Props) {
  return (
    <View className="mb-4">
      <Text className="mb-1 font-texto text-sm text-primary">{etiqueta}</Text>
      <TextInput
        placeholderTextColor="#9A9A9A"
        accessibilityLabel={etiqueta}
        accessibilityHint={error}
        className={`rounded-lg border px-4 py-3 font-texto text-base text-primary ${
          error ? 'border-peligro' : 'border-borde'
        }`}
        {...props}
      />
      {error ? <Text className="mt-1 font-texto text-sm text-peligro">{error}</Text> : null}
    </View>
  );
}
