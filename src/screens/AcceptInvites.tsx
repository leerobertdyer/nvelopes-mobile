import { View } from "react-native";
import { MyText } from "../components/MyText";
import { RouteProp, useRoute } from "@react-navigation/native";
import { navigationRef, RootStackParamList } from "../../App";
import { useEffect, useState } from "react";
import { Invite } from "../types";
import { acceptToken, getInviteToken } from "../firebase/invites";
import Btn from "../components/Buttons/Btn";
import { useAuth } from "../context/AuthContext/useAuth";
import { useBudget } from "../context/BudgetContext/useBudget";
import LoginOptions from "../components/Auth/LoginOptions";
import Loading from "../components/Loading";

type AcceptInviteRouteProp = RouteProp<RootStackParamList, "AcceptInvite">;

export default function AcceptInvite() {
  const route = useRoute<AcceptInviteRouteProp>();
  const { token } = route.params ?? { token: "" };
  const { user, isLoadingUser } = useAuth();
  const { refetchBudgets, setActiveBudgetId } = useBudget();

  const [tokenMeta, setTokenMeta] = useState<Invite | null>(null);
  const [isLoadingToken, setIsLoadingToken] = useState(true);
  const [tokenError, setTokenError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function getTokenMeta() {
      if (!token) {
        setTokenError("This invite link is missing a token.");
        setIsLoadingToken(false);
        return;
      }
      setIsLoadingToken(true);
      setTokenError(null);
      try {
        const meta = await getInviteToken(token);
        if (cancelled) return;
        if (!meta) {
          setTokenMeta(null);
          setTokenError("This invite is invalid or has expired.");
        } else if (meta.status && meta.status !== "pending") {
          setTokenMeta(meta);
          setTokenError("This invite has already been used or is no longer valid.");
        } else {
          setTokenMeta(meta);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setTokenMeta(null);
          setTokenError("Could not load this invite. Please try again later.");
        }
      } finally {
        if (!cancelled) setIsLoadingToken(false);
      }
    }
    getTokenMeta();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleAcceptInvite() {
    if (!user || !token) return;
    const result = await acceptToken(token, user);
    if (result.success && result.budgetId) {
      await refetchBudgets();
      await setActiveBudgetId(result.budgetId);
    }
    navigationRef.navigate("Home" as never);
  }

  if (isLoadingUser || isLoadingToken) {
    return <Loading text="Loading invite..." />;
  }

  if (tokenError || !tokenMeta) {
    return (
      <View className="bg-my-blue-dark justify-center h-full items-center w-full p-6">
        <View className="w-full items-center justify-center bg-my-white-dark p-8 gap-4">
          <MyText className="w-[80%] text-center m-auto text-my-red-dark">
            {tokenError ?? "This invite is invalid or has expired."}
          </MyText>
          <Btn
            color="green"
            text="Go home"
            onPress={() => navigationRef.navigate("Home" as never)}
          />
        </View>
      </View>
    );
  }

  if (!user) {
    return (
      <View className="bg-my-blue-dark justify-center h-full items-center w-full p-6 gap-4">
        <View className="w-full items-center justify-center bg-my-white-dark p-8 gap-4">
          <MyText className="w-[80%] text-center m-auto">
            Sign in to accept your invite to "{tokenMeta.budgetName}"
          </MyText>
        </View>
        <LoginOptions />
        <Btn
          color="red"
          text="Cancel"
          onPress={() => navigationRef.navigate("Home" as never)}
        />
      </View>
    );
  }

  return (
    <View className="bg-my-blue-dark justify-center h-full items-center w-full">
      <View className="w-full items-center justify-center bg-my-white-dark p-8 gap-4">
        <MyText className="w-[80%] text-center m-auto">
          You've been invited to join "{tokenMeta.budgetName}"
        </MyText>
        <Btn color="green" text="accept" onPress={() => handleAcceptInvite()} />
        <Btn
          color="red"
          text="decline"
          onPress={() => navigationRef.navigate("Home" as never)}
        />
      </View>
    </View>
  );
}
