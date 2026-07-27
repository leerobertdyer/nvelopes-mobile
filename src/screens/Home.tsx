import {  View } from "react-native";
import { useAuth } from "../context/AuthContext/useAuth";
import { useEffect, useState } from "react";
import { useBudget } from "../context/BudgetContext/useBudget";
import { useDatabase } from "../context/DatabaseContext/useDatabase";
import MainView from "../components/MainView";
import {
  backupUserDataSafe,
  shouldBackupUserDataSafe,
} from "../firebase/editData";
import Loading from "../components/Loading";
import Btn from "../components/Buttons/Btn";
import LoginOptions from "../components/Auth/LoginOptions";
import { MyText } from "../components/MyText";
import FirstTimeSetup from "../components/FirstTimeSetup";

export default function Home() {
  const { user, isLoadingUser } = useAuth();
  const { isLoadingBudgets, activeBudgetId, hasBudgets } = useBudget();
  const { isLoadingDb, dbError, documentExists, payDate } = useDatabase();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isLoadingUser && !isLoadingBudgets && !isLoadingDb) {
      setIsLoading(false);
    }
  }, [isLoadingUser, isLoadingBudgets, isLoadingDb]);

  // Run backup check for authenticated users with active budget
  useEffect(() => {
    if (!user || !activeBudgetId || documentExists !== true) return;
    async function checkAndBackup() {
      const shouldBackup = await shouldBackupUserDataSafe(
        user!,
        activeBudgetId!,
      );
      if (shouldBackup) await backupUserDataSafe(user!, activeBudgetId!);
    }
    checkAndBackup();
    
  }, [user, activeBudgetId, documentExists]);

  if (isLoading) return <Loading text="Welcome to Nvelopes..." />;

  if (!user) {
    return (
      <View className="gap-4 pt-[2rem] items-center w-full h-full bg-my-black-base">
        <MyText className="text-2xl text-my-white-dark">Welcome to Nvelopes</MyText>
        <MyText className="text-sm text-my-white-light">
          Old School Budgeting for the Digital Age
        </MyText>
        <LoginOptions />
      </View>
    );
  }

  // Display critical database errors that could indicate data corruption risk
  if (dbError) {
    return (
      <View className="justify-center items-center w-full h-full bg-my-black-dark text-my-white-dark p-4">
        <View className="max-w-md text-center">
          <MyText className="text-2xl text-my-red-light mb-4">
            ⚠️ Database Error
          </MyText>
          <MyText className="mb-4 text-my-white-light">{dbError}</MyText>
          <MyText className="text-sm text-my-white-base mb-6">
            This error occurred to protect your data. Please do not continue
            until this is resolved.
          </MyText>
          <View className="bg-my-red-base text-my-white-dark px-6 py-2 rounded-md">
            <Btn color="gold" onPress={() => window.location.reload()}>Refresh Page</Btn>
          </View>
        </View>
      </View>
    );
  }

  // Still resolving doc for this budget (e.g. budgets just loaded, snapshot pending).
  if (user && documentExists === null && hasBudgets) {
    return <Loading text="Welcome to Nvelopes..." />;
  }

  // No document exists = new user. Show first-time setup only when we've determined that:
  // - we have a budget but its data doc doesn't exist (documentExists === false), or
  // - we've finished loading and the user has no budgets (documentExists === null, !hasBudgets).
  const isNewUser =
    documentExists === false ||
    (documentExists === null && !hasBudgets && !isLoadingBudgets);
  if (isNewUser) {
    return <FirstTimeSetup />;
  }

  // Only show MainView once we've received the budget doc snapshot (payDate is set or explicitly null).
  if (documentExists === true && payDate === undefined) {
    return <Loading text="Welcome to Nvelopes..." />;
  }

  return <MainView />
}
