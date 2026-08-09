import { Pressable, View } from "react-native";
import MyIcon from "../MyIcon";
import { MyText } from "../MyText";
import { Nvelope } from "../../types";

interface INvelopeActionBtns {
  onTake: (n: Nvelope) => void;
  onAdd: (n: Nvelope) => void;
  onEdit: (n: Nvelope) => void;
  onDelete: (id: string) => void;
  n: Nvelope;
}

export default function NvelopeActionBtns({
  n,
  onTake,
  onAdd,
  onEdit,
  onDelete,
}: INvelopeActionBtns) {
  return (
    <View className="flex-row w-full justify-center gap-4 items-center">
      {/* TAKE from envelope */}
      <Pressable
        onPress={() => onTake(n)}
        className="bg-[#9c6d00] border-2 border-my-black-dark rounded-lg p-[1px] h-[6rem] w-[6rem]"
      >
        <View className="flex-1 pt-2 justify-center items-center">
          <MyIcon type={"TAKE"} />
        </View>
        <MyText className="text-sm w-full text-center text-my-white-light">
          Take
        </MyText>
      </Pressable>

      {/* ADD $ to envelope */}
      <Pressable
        onPress={() => onAdd(n)}
        className="bg-my-green-dark border-2 border-my-black-dark rounded-lg p-[1px] h-[6rem] w-[6rem]"
      >
        <View className="flex-1 pt-2 justify-center items-center">
          <MyIcon type={"CASH"} />
        </View>
        <MyText className="text-sm w-full text-center text-my-white-light">
          Add
        </MyText>
      </Pressable>

      {/* Edit envelope */}
      <Pressable
        onPress={() => onEdit(n)}
        className="bg-my-blue-dark border-2 border-my-black-dark rounded-lg p-[1px] h-[6rem] w-[6rem]"
      >
        <View className="flex-1 pt-2 justify-center items-center">
          <MyIcon type={"NVELOPE"} />
        </View>
        <MyText className="text-sm w-full text-center text-my-white-light">
          Edit
        </MyText>
      </Pressable>

      {/* Delete envelope */}
      <Pressable
        onPress={() => onDelete(n.id)}
        className="bg-my-red-dark border-2 border-my-black-dark rounded-lg p-[1px] h-[6rem] w-[6rem]"
      >
        <View className="flex-1 pt-2 justify-center items-center">
          <MyIcon type={"DELETE"} />
        </View>
        <MyText className="text-sm w-full text-center text-my-white-light">
          Delete
        </MyText>
      </Pressable>
    </View>
  );
}
