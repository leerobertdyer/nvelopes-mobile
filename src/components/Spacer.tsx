import { View } from "react-native";

interface ISpacer {
  w?: number;
  h?: number;
}
export default function Spacer({ w = 1, h = 1 }: ISpacer) {
  return <View className={`w-[${w}rem] h-[${h}rem]`} />;
}
