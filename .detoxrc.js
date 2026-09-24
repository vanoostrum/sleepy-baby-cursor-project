/** @type {Detox.DetoxConfig} */
module.exports = {
  testRunner: {
    args: {
      $0: 'jest',
      config: 'e2e/jest.config.js',
    },
    jest: {
      setupTimeout: 600000,
    },
  },
  apps: {
    'android.release': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/release/app-release.apk',
      testBinaryPath:
        'android/app/build/outputs/apk/androidTest/release/app-release-androidTest.apk',
      build:
        'cd android && ./gradlew :app:assembleRelease :app:assembleReleaseAndroidTest -DtestBuildType=release -PreactNativeArchitectures=x86_64 --stacktrace',
    },
  },
  devices: {
    emulator: {
      type: 'android.emulator',
      device: {
        avdName: 'SleepyBaby_API_34',
      },
      headless: true,
      gpuMode: 'swiftshader_indirect',
    },
    attached: {
      type: 'android.attached',
      device: {
        adbName: 'emulator-5554',
      },
    },
  },
  configurations: {
    'android.emu.release': {
      device: 'emulator',
      app: 'android.release',
    },
    'android.att.release': {
      device: 'attached',
      app: 'android.release',
      behavior: {
        init: {
          reinstallApp: false,
        },
      },
    },
  },
};
