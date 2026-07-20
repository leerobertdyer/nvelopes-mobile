import "dotenv/config";

export default {
  expo: {
    name: "Nvelopes",
    slug: "mobile",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./src/assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./src/assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    ios: {
      associatedDomains: ["applinks:invite.nvelopes.app"],
      supportsTablet: true,
      buildReactNativeFromSource: true,
      bundleIdentifier: "com.ldyer.nvelopes",
      googleServicesFile:
        process.env.GOOGLE_SERVICE_INFO_PLIST ?? "./GoogleService-Info.plist",
    },
    android: {
      package: "com.ldyer.nvelopes",
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
