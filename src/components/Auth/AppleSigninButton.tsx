import * as AppleAuthentication from "expo-apple-authentication";
import { Platform, View } from "react-native";
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
