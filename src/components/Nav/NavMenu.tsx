import { Modal, Pressable, View } from "react-native";
import Entypo from "@expo/vector-icons/Entypo";
import Btn from "../Buttons/Btn";
import { MyText } from "../MyText";
import { navigationRef } from "../../../App";

interface NavMenuProps {
  showMenu: boolean;
  setShowMenu: (show: boolean) => void;
  links: string[];
}

export default function NavMenu({
  showMenu,
  setShowMenu,
  links,
}: NavMenuProps) {
  return (
    <>
      <Pressable onPress={() => setShowMenu(true)}>
        <Entypo
          name="menu"
          size={28}
          color="white"
          className="bg-my-black-dark rounded-md p-2"
        />
      </Pressable>

      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <Pressable
          className="flex-1 bg-black/50"
          onPress={() => setShowMenu(false)}
        >
          <View
            className="bg-my-white-light w-[100%] h-fit pb-8 justify-start items-end ml-auto"
            onStartShouldSetResponder={() => true} // prevents tap-through closing when tapping menu itself
          >
            <Pressable onPress={() => setShowMenu(false)}>
              <MyText className="text-[4rem] pr-[3rem] pt-[8rem] w-fit text-my-red-dark">
                X
              </MyText>
            </Pressable>
            <View className="w-full mt-8 justify-start">
              <View className="gap-8 h-fit">
                {links.map((link) => (
                  <Pressable
                    key={link}
                    onPress={() => {
                      navigationRef.navigate(link as never);
                      setShowMenu(false);
                    }}
                  >
                    <MyText className="text-4xl text-my-blue-dark text-center underline">
                      {link}
                    </MyText>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
