import LoginForm from "../Forms/LoginForm";
import LoginProvider from "./LoginProvider";
import googleIcon from "../../assets/googleIcon.png";
import { View } from "react-native";
import { AppleSignInButton } from "./AppleSigninButton";

export default function LoginOptions() {
  return (
    <View className="w-full p-4 bg-my-black-base justify-start items-center gap-6">
      <LoginProvider src={googleIcon} text="Sign in with Google" />
      <AppleSignInButton />
      <LoginForm />
    </View>
  );
}
