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

type AcceptInviteRouteProp = RouteProp<RootStackParamList, "AcceptInvite">;

export default function AcceptInvite() {
  const route = useRoute<AcceptInviteRouteProp>();
  const { token } = route.params ?? "";
  const { user } = useAuth();
  const { refetchBudgets, setActiveBudgetId } = useBudget();

  const [tokenMeta, setTokenMeta] = useState<Invite | null>(null);

  useEffect(() => {
    async function getTokenMeta() {
      const meta = await getInviteToken(token);
      setTokenMeta(meta);
    }
    getTokenMeta();
  }, [token]);

  if (!tokenMeta || !user) return null;

  async function handleAcceptInvite() {
    const result = await acceptToken(token, user!);
    if (result.success && result.budgetId) {
      // Update the current activeBudgetId
      await refetchBudgets();
      await setActiveBudgetId(result.budgetId); // switches to it + persists to AsyncStorage
    }
    navigationRef.navigate("Home" as never);
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
