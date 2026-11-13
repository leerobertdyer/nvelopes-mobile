import { Pressable, View } from "react-native";
import { ViewContent } from "../types";
import { MyText } from "./MyText";

interface IContentSelector {
  content: ViewContent;
  setContent: React.Dispatch<React.SetStateAction<ViewContent>>;
}

export default function ContentSelector({
  content,
  setContent,
}: IContentSelector) {
  const mainView =
    content === "NVELOPES" ||
    content === "BILLS" ||
    content === "DEBT" ||
    content === "SETTINGS";

  return (
    <>
      {mainView ? (
        <>
          <View className="flex-row justify-around bg-my-white-base h-[3rem] m-auto w-[90%] rounded-t-xl">
            <Pressable
              className={`justify-center px-2 w-[50%]
                ${content === "NVELOPES" && "rounded-tl-xl bg-my-white-dark"}`}
              onPress={() => setContent("NVELOPES")}
            >
              <MyText numberOfLines={1} className="text-center">
                Nvelopes
              </MyText>
            </Pressable>
            <View className="h-full w-[1px] bg-black" />

            <Pressable
              className={`justify-center px-2 w-[50%]
                ${content === "BILLS" && "rounded-tr-xl bg-my-white-dark"}`}
              onPress={() => setContent("BILLS")}
            >
              <MyText numberOfLines={1} className="text-center">
                Bills
              </MyText>
            </Pressable>
          </View>
          <View className="w-[90%] m-auto h-[1px] bg-black" />

          <View className="flex-row justify-around bg-my-white-base h-[3rem] m-auto w-[90%] rounded-b-xl">
            <Pressable
              className={`justify-center px-2 w-[50%] rounded-bl-xl
              ${content === "DEBT" && "bg-my-white-dark"}`}
              onPress={() => setContent("DEBT")}
            >
              <MyText numberOfLines={1} className="text-center">
                Debt
              </MyText>
            </Pressable>
            <View className="h-full w-[1px] bg-black" />
            <Pressable
              className={`justify-center px-2 w-[50%] rounded-br-xl
              ${content === "SETTINGS" && "bg-my-white-dark"}`}
              onPress={() => setContent("SETTINGS")}
            >
              <MyText numberOfLines={1} className="text-center">
                Settings
              </MyText>
            </Pressable>
          </View>
        </>
      ) : (
        <View
          className={`flex-row justify-around bg-my-white-base h-[3rem] m-auto w-[90%] rounded-t-xl
          `}
        >
          <Pressable
            className={`justify-center px-2 w-[50%]
            ${content === "BUDGET" && "rounded-tl-xl bg-my-white-dark"}`}
            onPress={() => setContent("BUDGET")}
          >
            <MyText numberOfLines={1} className="text-center">
              Budget
            </MyText>
          </Pressable>
          <Pressable
            className={`justify-center px-2 w-[50%]
            ${content === "ACCOUNT" && "rounded-tr-xl bg-my-white-dark"}`}
            onPress={() => setContent("ACCOUNT")}
          >
            <MyText numberOfLines={1} className="text-center">
              Account
            </MyText>
          </Pressable>
        </View>
      )}
    </>
  );
}
