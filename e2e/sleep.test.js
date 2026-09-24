const { execFileSync } = require('child_process');

function adb(args) {
  const home = process.env.ANDROID_HOME || '/usr/local/lib/android/sdk';
  try {
    return execFileSync(
      `${home}/platform-tools/adb`,
      ['-s', 'emulator-5554', ...args],
      {
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024,
      },
    );
  } catch (error) {
    const stdout = error.stdout ? String(error.stdout) : '';
    const stderr = error.stderr ? String(error.stderr) : '';
    return `${stdout}\n${stderr}\n${error.message}`;
  }
}

function dismissKeyguard() {
  adb(['shell', 'input', 'keyevent', 'KEYCODE_WAKEUP']);
  adb(['shell', 'wm', 'dismiss-keyguard']);
  adb(['shell', 'input', 'keyevent', '82']);
}

function inputMethodShown() {
  const dump = adb(['shell', 'dumpsys', 'input_method']);
  return /mInputShown=true/.test(dump) || /mShowRequested=true/.test(dump);
}

async function revealSavedKid() {
  try {
    await waitFor(element(by.id('active-kid-name')))
      .toBeVisible()
      .withTimeout(3000);
    return;
  } catch {
    // The name is still covered.
  }
  if (inputMethodShown()) {
    await device.pressBack();
  }
  try {
    await waitFor(element(by.id('active-kid-name')))
      .toBeVisible()
      .withTimeout(2000);
    return;
  } catch {
    // The keyboard was not the only cover.
  }
  try {
    await waitFor(element(by.id('new-kid-screen')))
      .toBeVisible()
      .withTimeout(1000);
    await device.pressBack();
  } catch {
    // The form is not the screen in front.
  }
}

function reportForeignFocus() {
  const dump = adb(['shell', 'dumpsys', 'window']);
  const current = dump
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.startsWith('mCurrentFocus='));
  const name = current ? current.slice('mCurrentFocus='.length) : 'unknown';
  if (name.includes('com.sleepybaby.app')) {
    return;
  }
  console.log('----- focused window -----');
  console.log(`focused window: ${name}`);
  console.log(dump);
}

describe('SleepyBaby', () => {
  beforeAll(async () => {
    dismissKeyguard();
    await device.launchApp({
      newInstance: true,
      launchArgs: { detoxEnableSynchronization: 0 },
    });
    await device.disableSynchronization();
    dismissKeyguard();
    reportForeignFocus();
  });

  it('records a nap, corrects it, and shows the recommended range', async () => {
    await waitFor(element(by.id('add-kid')))
      .toBeVisible()
      .withTimeout(20000);
    await element(by.id('add-kid')).tap();

    await waitFor(element(by.id('kid-name')))
      .toBeVisible()
      .withTimeout(10000);
    await element(by.id('kid-name')).replaceText('Ada');
    await element(by.id('gender-girl')).tap();
    await element(by.id('kid-year')).replaceText('2024');
    await element(by.id('kid-month')).replaceText('6');
    await element(by.id('kid-day')).replaceText('1');
    await element(by.id('icon-star')).tap();
    await waitFor(element(by.id('kid-save')))
      .toBeVisible()
      .whileElement(by.id('kid-form'))
      .scroll(300, 'down');
    await element(by.id('kid-save')).tap();
    await revealSavedKid();

    await waitFor(element(by.id('active-kid-name')))
      .toBeVisible()
      .withTimeout(10000);
    await expect(element(by.id('active-kid-name'))).toHaveText('Ada');

    await element(by.id('start-nap')).tap();
    await waitFor(element(by.id('stop-sleep')))
      .toBeVisible()
      .withTimeout(10000);
    await element(by.id('stop-sleep')).tap();
    await waitFor(element(by.id('start-nap')))
      .toBeVisible()
      .withTimeout(10000);

    await element(by.id('open-day')).tap();
    await waitFor(element(by.id('day-total')))
      .toBeVisible()
      .withTimeout(10000);
    await expect(element(by.id('day-nap'))).toBeVisible();
    await element(by.text('Edit')).tap();
    await element(by.id('edit-night')).tap();
    await element(by.id('edit-save')).tap();
    await waitFor(element(by.text('Night')))
      .toBeVisible()
      .withTimeout(10000);
    await element(by.text('Remove')).tap();
    await waitFor(element(by.text('Remove')))
      .not.toBeVisible()
      .withTimeout(10000);

    await element(by.id('back-home')).tap();
    await waitFor(element(by.id('open-trends')))
      .toBeVisible()
      .withTimeout(10000);
    await element(by.id('open-trends')).tap();
    await waitFor(element(by.id('recommendation-source')))
      .toBeVisible()
      .withTimeout(10000);
    await expect(element(by.id('recommendation-source'))).toHaveText(
      'Ranges for 4 months and older are from the American Academy of Sleep Medicine consensus (Paruthi et al., 2016). The 0 to 3 month range is from the National Sleep Foundation.',
    );
    await element(by.id('grain-month')).tap();
    await expect(element(by.id('histogram'))).toBeVisible();
  });
});
