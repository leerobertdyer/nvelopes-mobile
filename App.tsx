import { AuthProvider } from "./src/context/AuthContext/AuthProvider";
import BudgetProvider from "./src/context/BudgetContext/BudgetProvider";
import DatabaseProvider from "./src/context/DatabaseContext/DatabaseProvider";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Home from "./src/screens/Home";
import {
  SafeAreaProvider,
  SafeAreaView,
  initialWindowMetrics,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Settings from "./src/screens/Settings";
import "./global.css";
import Toast, { BaseToast, BaseToastProps } from "react-native-toast-message";
import Debt from "./src/screens/Debt";
import {
  NavigationContainer,
  createNavigationContainerRef,
} from "@react-navigation/native";
import TransactionProvider from "./src/context/TransactionContext/TransactionProvider";
import * as Linking from "expo-linking";
import AcceptInvite from "./src/screens/AcceptInvites";

const linking = {
  // Prefixes the app will respond to
  prefixes: [Linking.createURL("/"), "https://invite.nvelopes.app"],

  // Map incoming URL paths to your screen names and extract params
  config: {
    screens: {
      // If the URL path is invite/XYZ, it maps to the AcceptInvite screen
      // and passes XYZ as the 'token' route parameter
      AcceptInvite: "i/:token",

      // Your other screens mapping:
      Home: "home",
      Login: "login",
    },
  },
};

export type RootStackParamList = {
  Home: undefined;
  Settings: { showEditMenu?: boolean };
  Debt: undefined;
  AcceptInvite: { token: string };
};

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

const toastConfig = {
  success: (props: BaseToastProps) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: "#038894", backgroundColor: "#076346" }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 15,
        fontWeight: "600",
        color: "#fcca68",
        fontFamily: "myFont",
      }}
      text2Style={{ fontSize: 13 }}
    />
  ),
  error: (props: BaseToastProps) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: "#038894", backgroundColor: "#ad0241" }}
      text1Style={{ fontSize: 15, color: "#fcca68", fontFamily: "myFont" }}
    />
  ),
};

SplashScreen.preventAutoHideAsync(); // for fonts

const Stack = createNativeStackNavigator();

function RootStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={Home} />
      <Stack.Screen name="Settings" component={Settings} />
      <Stack.Screen name="Debt" component={Debt} />
      <Stack.Screen name="AcceptInvite" component={AcceptInvite} />
    </Stack.Navigator>
  );
}

function GlobalLayout() {
  const [loaded, error] = useFonts({
    myFont: require("./src/assets/fonts/posten.ttf"),
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);
  const insets = useSafeAreaInsets();

  if (!loaded && !error) return null;

  return (
    <SafeAreaView
      className="flex-1 bg-my-white-dark"
      style={{
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        paddingLeft: insets.left,
        paddingRight: insets.right,
      }}
    >
      <NavigationContainer ref={navigationRef} linking={linking}>
        <RootStack />
        <Toast config={toastConfig} position="bottom" />
      </NavigationContainer>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BudgetProvider>
        <DatabaseProvider>
          <TransactionProvider>
            {/* SafeAreaProvider stays at the root to calculate the measurements */}
            <SafeAreaProvider initialMetrics={initialWindowMetrics}>
              <GestureHandlerRootView style={{ flex: 1 }}>
                {/* GlobalLayout consumes those measurements and forces the whole app into the safe zone */}
                <GlobalLayout />
              </GestureHandlerRootView>
            </SafeAreaProvider>
          </TransactionProvider>
        </DatabaseProvider>
      </BudgetProvider>
    </AuthProvider>
  );
}
