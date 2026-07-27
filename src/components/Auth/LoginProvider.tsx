import { Image, ImageSourcePropType, Pressable, View } from "react-native";
import { signInWithGoogle } from "../../firebase/signInWithGoogle";
import { MyText } from "../MyText";

export default function LoginProvider({
  src,
  text,
}: {
  src: ImageSourcePropType;
  text: string;
}) {
  return (
    <View className="w-[24rem] h-fit rounded-xl p-[3px] bg-my-white-dark">
      <Pressable onPress={signInWithGoogle}>
        <View className="w-full h-fit flex-row justify-center items-center gap-6 bg-my-white-base p-4 rounded-xl">
          <Image
            source={src}
            alt={text}
            className="w-[4rem] h-[4rem] object-cover rounded-md"
          />
          <MyText>{text}</MyText>
        </View>
      </Pressable>
    </View>
  );
}
