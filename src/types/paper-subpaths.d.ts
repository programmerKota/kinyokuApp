declare module 'react-native-paper/lib/module/core/PaperProvider' {
  import type { ComponentType, ReactNode } from 'react';
  import type { MD3Theme } from 'react-native-paper';
  type Props = { theme?: MD3Theme; children?: ReactNode };
  const Provider: ComponentType<Props>;
  export default Provider;
}

declare module 'react-native-paper/lib/module/styles/themes' {
  import type { MD3Theme } from 'react-native-paper';
  export const MD3LightTheme: MD3Theme;
  export const MD3DarkTheme: MD3Theme;
}
