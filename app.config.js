import "dotenv/config";

const IS_DEV = process.env.APP_VARIANT === 'development';

export default {
  expo: {
    owner: "leerobertdyers-team",
    name: IS_DEV ? "Nvelopes (Dev)" : "Nvelopes",
    slug: "nvelopes",
    scheme: IS_DEV ? "nvelopes-dev" : "nvelopes",
    version: "1.0.1",
    orientation: "portrait",
    icon: "./src/assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    extra: {
      eas: {
        projectId: "6d8f4d0f-205e-484a-abe4-2c14916ed45e",
      },
    },
    splash: {
      image: "./src/assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    ios: {
      associatedDomains: ["applinks:invite.nvelopes.app"],
      supportsTablet: true,
      buildReactNativeFromSource: true,
      bundleIdentifier: IS_DEV ? "com.ldyer.nvelopes.dev" : "com.ldyer.nvelopes",
      googleServicesFile:
        process.env.GOOGLE_SERVICE_INFO_PLIST ?? "./GoogleService-Info.plist",
    },
    android: {
      package: IS_DEV ? "com.ldyer.nvelopes.dev" : "com.ldyer.nvelopes",
      adaptiveIcon: {
        foregroundImage: "./src/assets/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: [
            {
              scheme: "https",
              host: "invite.nvelopes.app",
              pathPrefix: "/invite",
            },
          ],
          category: ["BROWSABLE", "DEFAULT"],
        },
      ],
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      googleServicesFile:
        process.env.GOOGLE_SERVICES_JSON ?? "./google-services.json",
    },
    web: {
      favicon: "./src/assets/favicon.png",
      bundler: "metro",
    },
    plugins: [
      "./plugins/RNFBfix.js",
      "@react-native-firebase/app",
      "@react-native-firebase/auth",
      "expo-font",
      ["expo-build-properties", { ios: { useFrameworks: "static" } }],
      [
        "@react-native-google-signin/google-signin",
        {
          iosUrlScheme: process.env.EXPO_PUBLIC_REVERSED_CLIENT_ID,
        },
      ],
    ],
  },
};
