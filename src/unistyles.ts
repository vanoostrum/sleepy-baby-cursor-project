import { StyleSheet } from 'react-native-unistyles';

const light = {
  colors: {
    background: '#F4EFE6',
    card: '#FFFBF5',
    ink: '#1E2430',
    muted: '#6E675C',
    night: '#2C3E6B',
    nap: '#E7A15A',
    enough: '#3E8B6E',
    under: '#C45B5B',
    over: '#C48A2A',
    line: '#E4D9C8',
  },
  radius: {
    card: 24,
    button: 999,
  },
};

const appThemes = { light };

const breakpoints = {
  xs: 0,
  sm: 360,
  md: 768,
};

type AppThemes = typeof appThemes;
type AppBreakpoints = typeof breakpoints;

declare module 'react-native-unistyles' {
  export interface UnistylesThemes extends AppThemes {}
  export interface UnistylesBreakpoints extends AppBreakpoints {}
}

StyleSheet.configure({
  themes: appThemes,
  breakpoints,
  settings: {
    initialTheme: 'light',
  },
});
