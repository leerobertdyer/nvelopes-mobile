import { Pressable, View } from "react-native";
import { MainViewContent } from "../types";
import { MyText } from "./MyText";

interface IContentSelector {
  content: MainViewContent;
  setContent: React.Dispatch<React.SetStateAction<MainViewContent>>;
}

export default function ContentSelector({
  content,
  setContent,
}: IContentSelector) {
  return (
    <View
      className={`flex-row justify-around bg-my-white-base h-[3rem] m-auto w-[90%] rounded-t-xl
       `}
    >
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
    </View>
  );
}
