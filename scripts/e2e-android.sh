#!/bin/bash
set -eu

adb -s emulator-5554 wait-for-device
adb -s emulator-5554 shell 'while [ "$(getprop sys.boot_completed)" != "1" ]; do sleep 2; done'

install_apk() {
  name="$(basename "$1")"
  timeout 600 adb -s emulator-5554 push "$1" "/data/local/tmp/$name"
  timeout 600 adb -s emulator-5554 shell pm install -r -g -t "/data/local/tmp/$name"
  adb -s emulator-5554 shell rm -f "/data/local/tmp/$name"
}

install_apk android/app/build/outputs/apk/release/app-release.apk
install_apk android/app/build/outputs/apk/androidTest/release/app-release-androidTest.apk
npx detox test --configuration android.att.release --loglevel verbose --reuse
