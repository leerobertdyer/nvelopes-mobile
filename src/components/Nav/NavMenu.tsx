import { Modal, Pressable, View } from "react-native";
import Entypo from "@expo/vector-icons/Entypo";
import Feather from '@expo/vector-icons/Feather';
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
            className="bg-my-white-light w-[100%] h-fit justify-start items-end "
            onStartShouldSetResponder={() => true} // prevents tap-through closing when tapping menu itself
          >
            <View className="w-full items center mt-[4rem] pt-[2rem] justify-start">
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

                <Pressable onPress={() => setShowMenu(false)}>
                  <View className="w-full bg-my-white-dark/20 h-fit justify-center items-center">
                    <Feather
                      name={"chevrons-up"}
                      size={40}
                      color="#121212"
                      className="px-2"
                    />
                  </View>
                </Pressable>
              </View>
            </View>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
