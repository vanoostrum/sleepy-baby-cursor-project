import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native-unistyles';

export function Screen({
  children,
  testID,
}: {
  children?: ReactNode;
  testID?: string;
}) {
  return (
    <SafeAreaView focusable style={styles.screen} testID={testID}>
      {children}
    </SafeAreaView>
  );
}

export function Title({ children }: { children: string }) {
  return <Text style={styles.title}>{children}</Text>;
}

export function Muted({ children }: { children: string }) {
  return <Text style={styles.muted}>{children}</Text>;
}

export function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

export function PrimaryButton({
  label,
  onPress,
  testID,
}: {
  label: string;
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
    >
      <Text style={styles.buttonLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  screen: {
    backgroundColor: theme.colors.background,
    flex: 1,
    padding: 24,
  },
  title: {
    color: theme.colors.ink,
    fontSize: 32,
    fontWeight: '700',
  },
  muted: {
    color: theme.colors.muted,
    fontSize: 16,
    marginTop: 8,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.card,
    marginTop: 24,
    padding: 20,
  },
  button: {
    alignItems: 'center',
    backgroundColor: theme.colors.night,
    borderRadius: theme.radius.button,
    marginTop: 24,
    paddingVertical: 16,
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
  },
  buttonLabel: {
    color: '#FFFBF5',
    fontSize: 18,
    fontWeight: '700',
  },
}));
