import { DraxView } from "react-native-drax";
import { View } from "react-native";
import { Nvelope } from "../../types";
import NvelopeCard from "./NvelopeCard";
import { useRef, useState } from "react";

import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import * as Haptics from "expo-haptics";

export default function DraggableNvelope({
  envelopes,
  onReorder,
  onPress,
}: {
  envelopes: Nvelope[];
  onReorder: (newOrder: Nvelope[]) => void;
  onPress: (n: Nvelope) => void;
}) {
  const [envelopeId, setEnvelopeId] = useState("");

  const rotation = useSharedValue(0);


  const startShake = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    rotation.value = withRepeat(
      withSequence(
        withTiming(-2, { duration: 100 }),
        withTiming(2, { duration: 100 }),
      ),
      -1, // infinite
      true,
    );
  };
  const stopShake = () => {
    rotation.value = withTiming(0, { duration: 100 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const handleSwap = (draggedId: string, targetId: string) => {
    if (draggedId === targetId) return;

    const newList = [...envelopes];
    const draggedIndex = newList.findIndex((e) => e.id === draggedId);
    const targetIndex = newList.findIndex((e) => e.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    [newList[draggedIndex], newList[targetIndex]] = [
      newList[targetIndex],
      newList[draggedIndex],
    ];

    onReorder(newList);
  };

  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const MOVE_THRESHOLD = 10; // pixels

  return (
    <View className="flex-row flex-wrap bg-my-white-light justify-center">
      {envelopes.map((envelope) => (
        <DraxView
          key={envelope.id}
          style={[{ padding: 10 }]}
          draggable
          longPressDelay={200}
          payload={envelope.id}
          onTouchStart={(e) => {
            const { pageX, pageY } = e.nativeEvent;
            touchStart.current = { x: pageX, y: pageY };
          }}
          onTouchEnd={(e) => {
            if (!touchStart.current) return;

            const { pageX, pageY } = e.nativeEvent;
            const dx = Math.abs(pageX - touchStart.current.x);
            const dy = Math.abs(pageY - touchStart.current.y);

            touchStart.current = null;

            if (dx < MOVE_THRESHOLD && dy < MOVE_THRESHOLD) {
              onPress(envelope);
            }
          }}
          onDragStart={() => {
            setEnvelopeId(envelope.id);
            startShake();
          }}
          onDragEnd={() => {
            setEnvelopeId("");
            stopShake();
          }}
          onDragDrop={() => {
            setEnvelopeId("");
            stopShake();
          }} // in case a drop cancels rather than completing normally
          onReceiveDragDrop={({ dragged }) => {
            handleSwap(dragged.payload as string, envelope.id);
          }}
          receivingStyle={{ opacity: 0.3 }}
        >
          <Animated.View style={envelope.id === envelopeId && animatedStyle}>
            <NvelopeCard envelope={envelope} />
          </Animated.View>
        </DraxView>
      ))}
    </View>
  );
}
