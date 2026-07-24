import { Modal, View } from "react-native";
import { MyText } from "../components/MyText";
import { RouteProp, useRoute } from '@react-navigation/native';
import { RootStackParamList } from '../../App';

type AcceptInviteRouteProp = RouteProp<RootStackParamList, 'AcceptInvite'>;


export default function AcceptInvite() {
    const route = useRoute<AcceptInviteRouteProp>();
    const { token } = route.params; 

  return (
    <Modal>
      <View className="bg-my-white-light justify-center h-full items-center w-full">
        <View>
          <MyText>You've</MyText>
        </View>
        <MyText>Yay you are in! {token}</MyText>
      </View>
    </Modal>
  );
}
