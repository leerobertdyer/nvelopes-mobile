import { DraxView } from "react-native-drax";
import { View } from "react-native";
import { useEffect, useRef, useState } from "react";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Nvelope } from "../../types";
import NvelopeCard from "./NvelopeCard";

const MOVE_THRESHOLD = 10; // pixels

function Shake({ active, children }: { active: boolean; children: React.ReactNode }) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (active) {
      rotation.value = withRepeat(withSequence(withTiming(-2, { duration: 100 }), withTiming(2, { duration: 100 })), -1, true);
    } else {
      cancelAnimation(rotation);
      rotation.value = withTiming(0, { duration: 100 });
    }
  }, [active, rotation]);

  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return <Animated.View style={style}>{children}</Animated.View>;
}

export default function DraggableNvelope({
  envelopes,
  onReorder,
  onPress,
  leading,
}: {
  envelopes: Nvelope[];
  onReorder: (newOrder: Nvelope[]) => void;
  onPress: (n: Nvelope) => void;
  leading?: React.ReactNode;
}) {
  const [draggingId, setDraggingId] = useState("");
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const handleDrop = (draggedId: string, targetId: string) => {
    if (draggedId === targetId) return;

    const dragged = envelopes.find((e) => e.id === draggedId);
    if (!dragged) return;

    const without = envelopes.filter((e) => e.id !== draggedId);
    const targetIndex = without.findIndex((e) => e.id === targetId);
    if (targetIndex === -1) return;

    onReorder([...without.slice(0, targetIndex), dragged, ...without.slice(targetIndex)]);
  };

  return (
    <View className="w-full flex-row flex-wrap justify-center items-center">
      {envelopes.map((envelope) => (
        <DraxView
          key={envelope.id}
          style={{ padding: 10 }}
          receivingStyle={{ opacity: 0.3, paddingLeft: 29 }}
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
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setDraggingId(envelope.id);
          }}
          onDragEnd={() => setDraggingId("")}
          onDragDrop={() => setDraggingId("")} // in case a drop cancels rather than completing normally
          onReceiveDragDrop={({ dragged }) => {
            handleDrop(dragged.payload as string, envelope.id);
          }}
        >
          <Shake active={envelope.id === draggingId}>
            <NvelopeCard envelope={envelope} />
          </Shake>
        </DraxView>
      ))}
      {leading ? <View className="p-3">{leading}</View> : null}
    </View>
  );
}
