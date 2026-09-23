import { Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

export default function HomeScreen() {
  return (
    <View style={styles.screen} testID="home-screen">
      <Text style={styles.title}>SleepyBaby</Text>
      <Text style={styles.body}>Track naps and night sleep on this phone.</Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    color: theme.colors.ink,
    fontSize: 36,
    fontWeight: '700',
  },
  body: {
    color: theme.colors.muted,
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
  },
}));
