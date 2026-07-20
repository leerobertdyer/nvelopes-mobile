import { Modal } from "react-native";
import { View } from "react-native-reanimated/lib/typescript/Animated";
import { MyText } from "../components/MyText";
import { RouteProp, useRoute } from '@react-navigation/native';
import { RootStackParamList } from '../../App';

type AcceptInviteRouteProp = RouteProp<RootStackParamList, 'AcceptInvite'>;


export default function AcceptInvite() {
    const route = useRoute<AcceptInviteRouteProp>();
    const { token } = route.params; 

  return (
    <Modal>
      <View className="bg-my-white-light align-center-justify-center h-fit w-full">
        <MyText>Yay you are in!</MyText>
      </View>
    </Modal>
  );
}
