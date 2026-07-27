import { useState } from "react";
import {
  createUserEmailPass,
  loginWithEmailAndPassword,
  sendPasswordResetEmailToUser,
} from "../../firebase/emailAndPassword";
import { View } from "react-native";
import Input from "../Input";
import { useDatabase } from "../../context/DatabaseContext/useDatabase";
import { useAuth } from "../../context/AuthContext/useAuth";
import Btn from "../Buttons/Btn";
import Toast from "react-native-toast-message";

interface LoginError {
  code: string;
  message: string;
}

export default function LoginForm() {
  const { isNewUser } = useDatabase();
  const { setUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [isSendingReset, setIsSendingReset] = useState(false);

  async function loginOrSignup() {
    if (!email.trim() || !password) {
      Toast.show({ type: "error", text1: "Please enter email and password" });
      return;
    }
    setIsLoading(true);
    try {
      const loggedInUser = await loginWithEmailAndPassword(
        email.trim(),
        password,
      );
      if (loggedInUser) {
        setUser(loggedInUser);
        if (!isNewUser) {
          Toast.show({ type: "success", text1: "Welcome back" });
        }
      }
    } catch (error: unknown) {
      const code = (error as LoginError).code;
      if (
        code === "auth/invalid-credential" ||
        code === "auth/user-not-found"
      ) {
        try {
          const newUser = await createUserEmailPass(email.trim(), password);
          if (newUser) {
            setUser(newUser);
            Toast.show({ type: "success", text1: "Welcome To Nvelopes!" });
          }
        } catch (signupError: unknown) {
          const signupCode = (signupError as LoginError).code;
          Toast.show({
            type: "error",
            text1:
              signupCode === "auth/email-already-in-use"
                ? "An account with this email already exists. Sign in with your password or use Forgot password."
                : "Something went wrong. Please try again.",
          });
        }
      } else {
        Toast.show({
          type: "error",
          text1: "Something went wrong. Please try again.",
        });
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleForgotPassword() {
    const emailToUse = showForgotPassword ? forgotEmail.trim() : email.trim();
    if (!emailToUse) {
      Toast.show({ type: "error", text1: "Please enter an email address" });
      return;
    }
    setIsSendingReset(true);
    try {
      await sendPasswordResetEmailToUser(emailToUse);
      Toast.show({
        type: "info",
        text1:
          "If an account exists for this email, check your inbox and spam folder for the reset link.",
      });
      setShowForgotPassword(false);
      setForgotEmail("");
    } catch (err: unknown) {
      console.error("Password reset failed:", err);
      Toast.show({
        type: "error",
        text1:
          "Could not send reset email. Check the email address and try again.",
      });
    } finally {
      setIsSendingReset(false);
    }
  }

  return (
    <View className="w-full h-fit p-4  justify-center items-center gap-6 bg-my-green-dark rounded-md">
      <View
        style={{ display: showForgotPassword ? "flex" : "none" }}
        className="justify-center items-center gap-6 w-full"
      >
        <Input
          id="forgot-email"
          placeholder="Email for reset link"
          value={forgotEmail}
          onChange={(e) => setForgotEmail(e)}
        />
        <View className="items-center gap-2 w-full">
          <Btn
            color="red"
            text={isSendingReset ? "Sending…" : "Send reset link"}
            onPress={() => {
              if (showForgotPassword) handleForgotPassword();
              else loginOrSignup();
            }}
            disabled={isSendingReset || !forgotEmail.trim()}
          />
          <View className="text-sm text-my-white-dark underline w-full">
            <Btn
              text="Back to login"
              color="green"
              onPress={() => {
                setShowForgotPassword(false);
                setForgotEmail("");
              }}
            />
          </View>
        </View>
      </View>

      <View
        style={{ display: !showForgotPassword ? "flex" : "none" }}
        className="justify-center items-center gap-4 w-full"
      >
        <Input
          id="login-email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e)}
        />
        <Input
          id="login-password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e)}
        />
        <Btn
          color="gold"
          onPress={loginOrSignup}
          disabled={isLoading}
          text={isLoading ? "Signing in…" : "Login / Sign up"}
        />

        <View className="text-sm text-my-white-dark underline w-full">
          <Btn
            color="red"
            text="Forgot password?"
            onPress={() => {
              setShowForgotPassword(true);
              setForgotEmail(email);
            }}
          />
        </View>
      </View>
    </View>
  );
}
