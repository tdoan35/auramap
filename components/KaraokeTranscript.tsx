import React, { useRef, useEffect, useMemo } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { KaraokeWord } from "@/types";
import { estimateWordTimings, getActiveWordIndex } from "@/utils/karaokeSync";

interface Props {
  transcript: string;
  durationMs: number;
  currentPositionMs: number;
}

export default function KaraokeTranscript({
  transcript,
  durationMs,
  currentPositionMs,
}: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const activeWordRef = useRef<View>(null);

  const words = useMemo(
    () => estimateWordTimings(transcript, durationMs),
    [transcript, durationMs]
  );

  const activeIndex = useMemo(
    () => getActiveWordIndex(words, currentPositionMs),
    [words, currentPositionMs]
  );

  // Auto-scroll to keep active word visible
  useEffect(() => {
    if (activeIndex > 0 && activeIndex % 8 === 0) {
      // Approximate scroll — every 8 words, scroll down a bit
      scrollRef.current?.scrollTo({
        y: Math.max(0, Math.floor(activeIndex / 8) * 28),
        animated: true,
      });
    }
  }, [activeIndex]);

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.wordContainer}>
        {words.map((w, i) => (
          <WordComponent
            key={i}
            word={w.word}
            isActive={i === activeIndex}
            isPast={i < activeIndex}
          />
        ))}
      </View>
    </ScrollView>
  );
}

const WordComponent = React.memo(function WordComponent({
  word,
  isActive,
  isPast,
}: {
  word: string;
  isActive: boolean;
  isPast: boolean;
}) {
  return (
    <Text
      style={[
        styles.word,
        isPast && styles.pastWord,
        isActive && styles.activeWord,
      ]}
    >
      {word}{" "}
    </Text>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: 8,
  },
  wordContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingBottom: 20,
  },
  word: {
    fontSize: 17,
    lineHeight: 28,
    color: "rgba(255,255,255,0.3)",
  },
  pastWord: {
    color: "rgba(255,255,255,0.6)",
  },
  activeWord: {
    color: "#fff",
    fontWeight: "700",
    backgroundColor: "rgba(0,191,166,0.25)",
    borderRadius: 4,
    overflow: "hidden",
  },
});
