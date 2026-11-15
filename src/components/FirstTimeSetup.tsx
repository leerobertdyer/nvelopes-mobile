import { useState } from "react";
import {
  createFirstBudget,
  completeDemoWithDefaults,
} from "../firebase/budgets";
import {
  createUserProfile,
  editPayDate,
  editPayPeriodInterval,
} from "../firebase/editData";
import Header from "./Nav/Header";
import IntervalSelector from "./Forms/IntervalSelector";
import { useAuth } from "../context/AuthContext/useAuth";
import { DateData, Calendar } from "react-native-calendars";
import { useDatabase } from "../context/DatabaseContext/useDatabase";
import { useBudget } from "../context/BudgetContext/useBudget";
import firebase from "@react-native-firebase/firestore";
import { ScrollView, View } from "react-native";
import { MyText } from "./MyText";
import Btn from "./Buttons/Btn";
import { Interval } from "../types";
import { MONTHLY } from "../constants";
import Toast from "react-native-toast-message";
import { navigationRef } from "../../App";
const { Timestamp } = firebase;

// TODO: Replace this with live walkthrough: add envelope add payment edit each and reset budget

export default function FirstTimeSetup() {
  const { user } = useAuth();
  const { setActiveBudgetId, refetchBudgets } = useBudget();
  const { setPayDate, setPayPeriodInterval, setDocumentExists } = useDatabase();

  const [newPayDate, setNewPayDate] = useState("");
  const [interval, setInterval] = useState<Interval | null>(MONTHLY);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleCalendarChange(d: DateData) {
    const dateString = d.dateString;
    setNewPayDate(dateString);

    const [year, month, day] = dateString.split("-").map(Number);
    const localDate = new Date(year, month - 1, day);

    setPayDate(Timestamp.fromDate(localDate));
  }

  async function handleSkip() {
    if (!user) return;
    setIsSubmitting(true);

    // Ensure the root user document exists!
    await createUserProfile(user);

    const ok = await completeDemoWithDefaults(user);
    if (!ok) {
      Toast.show({
        type: "error",
        text1: "Could not continue. Please try again",
      });
      setIsSubmitting(false);
      return;
    }
    const now = new Date();
    const defaultPayDate = new Date(now.getFullYear(), now.getMonth(), 1);
    setPayDate(Timestamp.fromDate(defaultPayDate));
    setPayPeriodInterval(MONTHLY);
    setDocumentExists(true);
    await refetchBudgets();
    setIsSubmitting(false);
    navigationRef.navigate("Home" as never);
  }

  async function handleSubmit() {
    if (!user) return;
    const date = new Date(newPayDate);
    // Ensure the root user document exists!
    await createUserProfile(user);

    if (!date || !(date instanceof Date) || !interval) {
      Toast.show({
        type: "error",
        text1: "Please select your last pay date and how often you're paid.",
      });
      return;
    }
    setIsSubmitting(true);
    const budgetId = await createFirstBudget(user);
    if (!budgetId) {
      Toast.show({
        type: "error",
        text1: "Could not create account. Please try again.",
      });
      setIsSubmitting(false);
      return;
    }
    try {
      await editPayDate(date, budgetId);
      await editPayPeriodInterval(interval, budgetId);
    } catch (e) {
      console.error("FirstTimeSetup save failed:", e);
      Toast.show({
        type: "error",
        text1: "Something went wrong. Please try again.",
      });
      setIsSubmitting(false);
      return;
    }
    setActiveBudgetId(budgetId);
    setPayDate(Timestamp.fromDate(date));
    setPayPeriodInterval(interval);
    setDocumentExists(true);
    refetchBudgets();
    setIsSubmitting(false);
    navigationRef.navigate("Home" as never);
  }

  return (
    <ScrollView className="h-full w-full bg-my-black-dark text-my-white-light">
      {user && <Header handleAddCash={() => {}} showAllBudgets={() => {}}/>}
      <View className="items-center justify-center gap-6 p-6">
        <MyText className="text-center text-lg text-white">
          When was your last pay date?
        </MyText>
        <MyText className="text-center text-sm text-my-white-dark">
          (Or when do you want to start budgeting from?)
        </MyText>
        <View className="bg-my-white-dark p-2 rounded-md w-full h-fit">
          <Calendar
            markedDates={{
              [newPayDate]: { selected: true, selectedColor: "#fcca68" },
            }}
            theme={{
              calendarBackground: "#fff2d9",
              textSectionTitleColor: "#b6c1cd",
              selectedDayTextColor: "#fff2d9",
              todayTextColor: "#00adf5",
              dayTextColor: "#2d4150",
              textDisabledColor: "#d9e1e8",
              arrowColor: "orange",
              monthTextColor: "#038894",
              indicatorColor: "#038894",
              textDayFontFamily: "monospace",
              textMonthFontFamily: "monospace",
              textDayHeaderFontFamily: "monospace",
              textDayFontSize: 16,
              textMonthFontSize: 16,
              textDayHeaderFontSize: 16,
            }}
            onDayPress={handleCalendarChange}
            date={newPayDate}
          />
        </View>
        {newPayDate && (
          <>
            <MyText className="text-center text-base text-white">
              How often are you paid?
            </MyText>
            <MyText className="text-center text-sm text-my-white-dark">
              (Or how often do you want to budget?)
            </MyText>
            <IntervalSelector
              value={interval}
              onChange={(v) => setInterval(v)}
              label=""
            />
          </>
        )}
        <View className="gap-3 pt-4 w-full">
          <Btn
            color="green"
            text={isSubmitting ? "Setting up…" : "Continue"}
            onPress={handleSubmit}
            disabled={isSubmitting}
          />
          <Btn
            text="Skip for now"
            color="red"
            onPress={handleSkip}
            disabled={isSubmitting}
          />
        </View>
      </View>
    </ScrollView>
  );
}
