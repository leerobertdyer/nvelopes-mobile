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
  const mainView = content === "NVELOPES" || content === "PAYMENTS";

  return (
    <View
      className={`flex-row justify-around bg-my-white-base h-[3rem] m-auto w-[90%] rounded-t-xl
       `}
    >
      {mainView ? (
        <>
          <Pressable
            className={`justify-center px-2 w-[50%]
                ${content === "NVELOPES" && "rounded-tl-xl bg-my-white-dark"}`}
            onPress={() => setContent("NVELOPES")}
          >
            <MyText numberOfLines={1} className="text-center">
              Nvelopes
            </MyText>
          </Pressable>
          <Pressable
            className={`justify-center px-2 w-[50%]
        ${content === "PAYMENTS" && "rounded-tr-xl bg-my-white-dark"}`}
            onPress={() => setContent("PAYMENTS")}
          >
            <MyText numberOfLines={1} className="text-center">
              Payments
            </MyText>
          </Pressable>
        </>
      ) : (
        <>
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
        </>
      )}
    </View>
  );
}
