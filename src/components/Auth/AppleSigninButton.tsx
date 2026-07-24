import * as AppleAuthentication from "expo-apple-authentication";
import { Platform } from "react-native";
import auth from "@react-native-firebase/auth";

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
    }
  };

  return (
    <AppleAuthentication.AppleAuthenticationButton
      buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
      buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
      cornerRadius={8}
      style={{ width: 340, height: 88 }}
      onPress={handlePress}
    />
  );
}
