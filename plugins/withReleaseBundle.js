const {
  withAppBuildGradle,
  withMainActivity,
} = require('@expo/config-plugins');

const BUNDLE_LOG = `super.onCreate(null)
    try {
      val descriptor = assets.openFd("index.android.bundle")
      android.util.Log.i("SleepyBaby", "mounted bundle bytes=" + descriptor.length)
      descriptor.close()
    } catch (error: Exception) {
      android.util.Log.e("SleepyBaby", "release bundle is not mounted", error)
    }`;

function withReleaseBundle(config) {
  config = withAppBuildGradle(config, (gradle) => {
    if (!gradle.modResults.contents.includes("noCompress 'bundle'")) {
      gradle.modResults.contents = gradle.modResults.contents.replace(
        'androidResources {',
        "androidResources {\n        noCompress 'bundle'",
      );
    }
    return gradle;
  });

  config = withMainActivity(config, (activity) => {
    if (!activity.modResults.contents.includes('mounted bundle bytes')) {
      activity.modResults.contents = activity.modResults.contents.replace(
        'super.onCreate(null)',
        BUNDLE_LOG,
      );
    }
    return activity;
  });

  return config;
}

module.exports = withReleaseBundle;
