import React from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  PanResponder,
  Animated,
} from "react-native";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const COLLAPSED_HEIGHT = 280;
const EXPANDED_HEIGHT = SCREEN_HEIGHT * 0.65;

interface Props {
  children: React.ReactNode;
  expandable?: boolean;
}

export default function BottomCard({ children, expandable = true }: Props) {
  const heightAnim = React.useRef(new Animated.Value(COLLAPSED_HEIGHT)).current;
  const currentHeight = React.useRef(COLLAPSED_HEIGHT);
  const startY = React.useRef(0);

  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => expandable,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          expandable && Math.abs(gestureState.dy) > 10,
        onPanResponderGrant: () => {
          startY.current = currentHeight.current;
        },
        onPanResponderMove: (_, gestureState) => {
          const newHeight = Math.max(
            COLLAPSED_HEIGHT,
            Math.min(EXPANDED_HEIGHT, startY.current - gestureState.dy)
          );
          heightAnim.setValue(newHeight);
        },
        onPanResponderRelease: (_, gestureState) => {
          const midPoint = (COLLAPSED_HEIGHT + EXPANDED_HEIGHT) / 2;
          const targetHeight =
            gestureState.dy < 0
              ? startY.current - gestureState.dy > midPoint
                ? EXPANDED_HEIGHT
                : COLLAPSED_HEIGHT
              : startY.current - gestureState.dy < midPoint
                ? COLLAPSED_HEIGHT
                : EXPANDED_HEIGHT;

          currentHeight.current = targetHeight;
          Animated.spring(heightAnim, {
            toValue: targetHeight,
            useNativeDriver: false,
            tension: 80,
            friction: 12,
          }).start();
        },
      }),
    [expandable, heightAnim]
  );

  return (
    <Animated.View
      style={[styles.container, { height: heightAnim }]}
      {...panResponder.panHandlers}
    >
      <View style={styles.handleContainer}>
        <View style={styles.handle} />
      </View>
      <View style={styles.content}>{children}</View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(20, 20, 20, 0.97)",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  handleContainer: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 6,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
});
