import { Pressable } from "react-native";
import { MyText } from "../MyText";

export default function Btn({
  children,
  text,
  onPress,
  color,
  disabled = false,
  selected = false,
  shadow = false,
  w = "w-[80%]"
}: {
  children?: React.ReactNode;
  text?: string;
  onPress: () => void;
  color: string;
  disabled?: boolean;
  selected?: boolean;
  shadow?: boolean;
  w?: string;
}) {
  const bgColor = () => {
    switch (color.toUpperCase()) {
      case "RED":
        return "bg-my-red-dark text-my-white-dark";
      case "GOLD":
        return "bg-my-white-dark text-my-red-dark border-my-blue-base";
      case "BLUE":
        return "bg-my-blue-dark text-my-white-base";
      case "GREEN":
        return "bg-my-green-dark text-my-white-base";
      default:
        return "bg-my-white-base text-my-black-base";
    }
  };

  return (
    <Pressable
      disabled={disabled}
      className={`rounded-lg h-[4.5rem] ${w} max-w-[20rem] p-2 items-center justify-center m-auto
          disabled:opacity-40
              ${bgColor()}
              ${selected ? "border-2" : ""}`
            }
      onPress={onPress}
      style={shadow && {
        shadowColor: "#121212",
        shadowOffset: { width: 5, height: 4 },
        shadowOpacity: 0.85,
        shadowRadius: 6,
      }}
    >
      {text && <MyText className={`${bgColor()}`}>{text}</MyText>}
      {children}
    </Pressable>
  );
}
