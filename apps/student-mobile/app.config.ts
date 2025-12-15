import type { ExpoConfig } from 'expo/config';

export default ({ config }: { config: ExpoConfig }) => ({
  ...config,
  name: 'SnapRoll Student',
  slug: 'student-mobile',
  scheme: 'snaproll',
  plugins: ['expo-router'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.flamelink.snaproll.student'
  },
  android: {
    package: 'com.flamelink.snaproll.student'
  },
  extra: {
    // Provide these via env (EAS/CLI): EXPO_PUBLIC_CONVEX_URL, EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY
    convexUrl: process.env.EXPO_PUBLIC_CONVEX_URL || '',
    clerkPublishableKey: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || ''
  }
});


