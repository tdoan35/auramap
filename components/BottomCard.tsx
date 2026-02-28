import React from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  PanResponder,
  Animated,
} from "react-native";
import { Colors } from "@/constants/theme";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const COLLAPSED_HEIGHT = Math.round(SCREEN_HEIGHT * 0.58);
const EXPANDED_HEIGHT = Math.round(SCREEN_HEIGHT * 0.82);

interface Props {
  children: React.ReactNode;
  expandable?: boolean;
  heightAnim?: Animated.Value;
}

export default function BottomCard({ children, expandable = true, heightAnim: externalHeightAnim }: Props) {
  const internalHeightAnim = React.useRef(new Animated.Value(COLLAPSED_HEIGHT)).current;
  const heightAnim = externalHeightAnim ?? internalHeightAnim;
  const currentHeight = React.useRef(COLLAPSED_HEIGHT);

  // Set initial height on mount
  React.useEffect(() => {
    heightAnim.setValue(COLLAPSED_HEIGHT);
    currentHeight.current = COLLAPSED_HEIGHT;
  }, [heightAnim]);
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
    backgroundColor: Colors.bgPrimary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 12,
  },
  handleContainer: {
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 8,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.borderStrong,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
});
