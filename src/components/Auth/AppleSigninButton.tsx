import * as AppleAuthentication from "expo-apple-authentication";
import { Platform, View } from "react-native";
import auth from "@react-native-firebase/auth";
import Toast from "react-native-toast-message";

export function AppleSignInButton() {
  if (Platform.OS !== "ios") return null;

  const handlePress = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const appleCredential = auth.AppleAuthProvider.credential(
        credential.identityToken,
      );
      await auth().signInWithCredential(appleCredential);
    } catch (e: any) {
      if (e.code === "ERR_REQUEST_CANCELED") return;
      console.error(e);
      const message =
        e instanceof Error
          ? e.message
          : typeof e?.message === "string"
            ? e.message
            : "Apple sign-in failed";
      Toast.show({ type: "error", text1: "Apple sign-in failed", text2: message });
    }
  };

  return (
    <View className="p-[3px] bg-my-white-dark w-[24rem] h-fit rounded-xl">
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
        cornerRadius={8}
        style={{ width: 330, height: 88 }}
        onPress={handlePress}
      />
    </View>
  );
}
