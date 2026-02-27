import React, { useRef, useCallback } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { usePlaybackStore } from "@/stores/usePlaybackStore";

const SCREEN_WIDTH = Dimensions.get("window").width;

interface Props {
  children: [React.ReactNode, React.ReactNode]; // [OutlineCard, AudioPlayerCard]
}

export default function SwipeableCardContainer({ children }: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const setActiveCard = usePlaybackStore((s) => s.setActiveCard);
  const activeCard = usePlaybackStore((s) => s.activeCard);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const page = Math.round(offsetX / (SCREEN_WIDTH - 40));
      setActiveCard(page === 0 ? "outline" : "player");
    },
    [setActiveCard]
  );

  // Scroll to player card programmatically
  React.useEffect(() => {
    if (activeCard === "player") {
      scrollRef.current?.scrollTo({ x: SCREEN_WIDTH - 40, animated: true });
    }
  }, [activeCard]);

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      onMomentumScrollEnd={handleScroll}
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <View style={styles.page}>{children[0]}</View>
      <View style={styles.page}>{children[1]}</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {},
  page: {
    width: SCREEN_WIDTH - 40,
    paddingRight: 0,
  },
});
