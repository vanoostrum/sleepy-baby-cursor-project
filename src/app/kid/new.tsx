import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import type { Gender, IconId } from '../../domain/model';
import { useSleep } from '../../state/sleep';
import { errorCopy } from '../../ui/errors';
import { ICON_GLYPH, ICON_LIST } from '../../ui/icons';
import { PrimaryButton, Screen, Title } from '../../ui/screen';

const GENDERS: { id: Gender; label: string }[] = [
  { id: 'girl', label: 'Girl' },
  { id: 'boy', label: 'Boy' },
  { id: 'unspecified', label: 'Skip' },
];

export default function NewKidScreen() {
  const { log, refresh } = useSleep();
  const logRef = useRef(log);
  useEffect(() => {
    logRef.current = log;
  }, [log]);
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender>('unspecified');
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [icon, setIcon] = useState<IconId>('moon');
  const [error, setError] = useState('');

  async function save() {
    Keyboard.dismiss();
    let current = logRef.current;
    for (let attempt = 0; attempt < 30 && !current; attempt += 1) {
      await new Promise((resolve) => {
        setTimeout(resolve, 100);
      });
      current = logRef.current;
    }
    if (!current) {
      setError('Still opening the sleep log on this phone.');
      return;
    }
    const birthday = `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    const result = await current.addKid({ name, gender, birthday, icon });
    if (!result.ok) {
      setError(errorCopy(result.error));
      return;
    }
    refresh();
    Keyboard.dismiss();
    router.dismissTo('/');
  }

  return (
    <Screen testID="new-kid-screen">
      <KeyboardAvoidingView behavior="padding" style={styles.form}>
        <ScrollView
          testID="kid-form"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <Title>Add a child</Title>
          <TextInput
            testID="kid-name"
            value={name}
            onChangeText={setName}
            placeholder="Name"
            placeholderTextColor="#6E675C"
            style={styles.input}
          />
          <View style={styles.row}>
            {GENDERS.map((option) => (
              <Pressable
                key={option.id}
                testID={`gender-${option.id}`}
                onPress={() => setGender(option.id)}
                style={[styles.choice, gender === option.id && styles.choiceOn]}
              >
                <Text style={styles.choiceLabel}>{option.label}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.row}>
            <TextInput
              testID="kid-year"
              value={year}
              onChangeText={setYear}
              placeholder="Year"
              keyboardType="number-pad"
              placeholderTextColor="#6E675C"
              style={[styles.input, styles.year]}
            />
            <TextInput
              testID="kid-month"
              value={month}
              onChangeText={setMonth}
              placeholder="Month"
              keyboardType="number-pad"
              placeholderTextColor="#6E675C"
              style={[styles.input, styles.datePart]}
            />
            <TextInput
              testID="kid-day"
              value={day}
              onChangeText={setDay}
              placeholder="Day"
              keyboardType="number-pad"
              placeholderTextColor="#6E675C"
              style={[styles.input, styles.datePart]}
            />
          </View>
          <View style={styles.icons}>
            {ICON_LIST.map((id) => (
              <Pressable
                key={id}
                testID={`icon-${id}`}
                onPress={() => setIcon(id)}
                style={[styles.icon, icon === id && styles.choiceOn]}
              >
                <Text style={styles.glyph}>{ICON_GLYPH[id]}</Text>
              </Pressable>
            ))}
          </View>
          {error ? (
            <Text testID="kid-error" style={styles.error}>
              {error}
            </Text>
          ) : null}
          <PrimaryButton label="Save" testID="kid-save" onPress={save} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  form: {
    flex: 1,
  },
  input: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    color: theme.colors.ink,
    fontSize: 18,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  year: {
    flex: 1.4,
  },
  datePart: {
    flex: 1,
  },
  choice: {
    borderColor: theme.colors.line,
    borderRadius: theme.radius.button,
    borderWidth: 1,
    flex: 1,
    marginTop: 16,
    paddingVertical: 12,
  },
  choiceOn: {
    borderColor: theme.colors.night,
  },
  choiceLabel: {
    color: theme.colors.ink,
    fontSize: 16,
    textAlign: 'center',
  },
  icons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  icon: {
    borderColor: theme.colors.line,
    borderRadius: 16,
    borderWidth: 1,
    padding: 10,
  },
  glyph: {
    fontSize: 28,
  },
  error: {
    color: theme.colors.under,
    fontSize: 16,
    marginTop: 16,
  },
}));
