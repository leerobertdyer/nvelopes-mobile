import { useState } from "react";
import { createLoginForExistingUser } from "../../firebase/createLoginForExistingUser";
import { View } from "react-native";
import { MyText } from "../MyText";
import Input from "../Input";
import Toast from "react-native-toast-message";
import Btn from "../Buttons/Btn";

export default function CreateLoginWithEmail({
  onDone,
}: {
  onDone: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSignUp() {
    if (!email.trim() || !password) {
      Toast.show({ type: "error", text1: "Please enter email and password" });
      return;
    }
    try {
      await createLoginForExistingUser(email.trim(), password);
      Toast.show({
        type: "error",
        text1: "Email/password added. You can sign in with it next time.",
      });
      onDone();
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Could not add email/password. Try again.";
      Toast.show({ type: "error", text1: message });
    }
  }

  return (
    <View className="bg-my-white-base w-full items-center py-6">
      <MyText className="text-lg mb-4 text-my-red-dark">
        Add Email & Password Login
      </MyText>
      <View className="w-full justify-center items-center gap-6">
        <Input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e)}
        />
        <Input
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e)}
        />
        <Btn
          text="Login/Sign Up"
          onPress={() => handleSignUp()}
          color={"red"}
        />
      </View>
    </View>
  );
}
