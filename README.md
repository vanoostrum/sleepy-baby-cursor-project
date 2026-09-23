# SleepyBaby

SleepyBaby records a child's naps and night sleep on the phone and compares those hours with the recommended range for their age.

## Run the app

Install dependencies, then start Expo.

```bash
npm install
npx expo start
```

Press `w` to open the web build. The native projects are generated with `npx expo prebuild` and are not committed. Web needs cross-origin isolation so SQLite can start. The Expo Router headers in `app.json` set that for a hosted build.

## Check the project

```bash
npm run typecheck
npm run lint
npm run format:check
npm test
```

GitHub Actions runs those commands on every pull request, then builds the Android release and runs the Detox flow on an emulator.

Detox uses the generated Android project.

```bash
npx expo prebuild --platform android
npm run e2e:build
npm run e2e
```

The emulator name is `SleepyBaby_API_34`.
