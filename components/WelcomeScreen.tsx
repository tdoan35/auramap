import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  FadeInDown,
  FadeInUp,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/theme";
import { useAppStore } from "@/stores/useAppStore";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

// ---------------------------------------------------------------------------
// Animated Orb — inspired by Aceternity UI BackgroundGradientAnimation
// Each orb drifts on independent X/Y cycles with different periods,
// producing organic Lissajous-style motion paths.
// ---------------------------------------------------------------------------

interface OrbConfig {
  /** RGB triplet, e.g. "196, 181, 253" */
  rgb: string;
  size: number;
  x: number;
  y: number;
  durationX: number;
  durationY: number;
  rangeX: number;
  rangeY: number;
}

// Number of concentric rings per orb — stacking thin semi-transparent
// circles from large→small simulates a radial gradient (soft aura edges).
const RING_COUNT = 8;
const RING_ALPHA = 0.022;

function AnimatedOrb({
  rgb,
  size,
  x,
  y,
  durationX,
  durationY,
  rangeX,
  rangeY,
}: OrbConfig) {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);

  useEffect(() => {
    tx.value = withRepeat(
      withTiming(rangeX, { duration: durationX, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
    ty.value = withRepeat(
      withTiming(rangeY, { duration: durationY, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }],
  }));

  // Pre-build ring specs (outermost → innermost)
  const rings = Array.from({ length: RING_COUNT }, (_, i) => {
    const t = i / (RING_COUNT - 1); // 0 (outer) → 1 (inner)
    const ringSize = size * (1 - t * 0.82); // 100% → 18%
    const offset = (size - ringSize) / 2;
    return { ringSize, offset };
  });

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: x - size / 2,
          top: y - size / 2,
          width: size,
          height: size,
        },
        animStyle,
      ]}
    >
      {rings.map((r, i) => (
        <View
          key={i}
          style={{
            position: "absolute",
            left: r.offset,
            top: r.offset,
            width: r.ringSize,
            height: r.ringSize,
            borderRadius: r.ringSize / 2,
            backgroundColor: `rgba(${rgb}, ${RING_ALPHA})`,
          }}
        />
      ))}
    </Animated.View>
  );
}

// Orb configs — rgb triplets, positions, and independent drift durations
const ORBS: OrbConfig[] = [
  {
    // Violet
    rgb: "196, 181, 253",
    size: 380,
    x: SCREEN_W * 0.28,
    y: SCREEN_H * 0.29,
    durationX: 12000,
    durationY: 15000,
    rangeX: 60,
    rangeY: 80,
  },
  {
    // Sky-blue
    rgb: "125, 211, 252",
    size: 350,
    x: SCREEN_W * 0.7,
    y: SCREEN_H * 0.65,
    durationX: 10000,
    durationY: 9000,
    rangeX: 50,
    rangeY: 70,
  },
  {
    // Magenta
    rgb: "240, 171, 252",
    size: 320,
    x: SCREEN_W * 0.79,
    y: SCREEN_H * 0.3,
    durationX: 17000,
    durationY: 20000,
    rangeX: 70,
    rangeY: 50,
  },
  {
    // Cyan
    rgb: "103, 232, 249",
    size: 280,
    x: SCREEN_W * 0.25,
    y: SCREEN_H * 0.57,
    durationX: 20000,
    durationY: 11000,
    rangeX: 80,
    rangeY: 40,
  },
  {
    // Yellow
    rgb: "253, 232, 138",
    size: 250,
    x: SCREEN_W * 0.78,
    y: SCREEN_H * 0.79,
    durationX: 14000,
    durationY: 16000,
    rangeX: 45,
    rangeY: 60,
  },
];

const FEATURES = [
  {
    icon: "navigate-outline" as const,
    title: "AI-Generated Audio Tours",
    desc: "Personalized narration for any walking route",
  },
  {
    icon: "mic-outline" as const,
    title: "Ask Your Guide Anything",
    desc: "Push to talk and get real-time answers",
  },
  {
    icon: "business-outline" as const,
    title: "Discover Hidden Stories",
    desc: "Rich history and local stories for every POI",
  },
];

// ---------------------------------------------------------------------------
// WelcomeScreen
// ---------------------------------------------------------------------------

export default function WelcomeScreen() {
  const setPhase = useAppStore((s) => s.setPhase);

  return (
    <View style={styles.container}>
      {/* Animated gradient orbs (Aceternity-style) */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {ORBS.map((orb, i) => (
          <AnimatedOrb key={i} {...orb} />
        ))}
      </View>

      {/* Foreground content */}
      <View style={styles.content}>
        {/* App Icon */}
        <Animated.View
          entering={FadeInDown.delay(200).duration(600)}
          style={styles.iconBox}
        >
          <Ionicons name="map" size={44} color={Colors.accent} />
        </Animated.View>

        {/* Title */}
        <Animated.Text
          entering={FadeInDown.delay(400).duration(600)}
          style={styles.title}
        >
          Welcome to AuraMap
        </Animated.Text>

        {/* Tagline */}
        <Animated.Text
          entering={FadeInDown.delay(500).duration(600)}
          style={styles.tagline}
        >
          Your tour guide that never stops listening
        </Animated.Text>

        {/* Feature list */}
        <Animated.View
          entering={FadeInUp.delay(600).duration(700)}
          style={styles.features}
        >
          {FEATURES.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Ionicons name={f.icon} size={22} color={Colors.accent} />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </Animated.View>

      </View>

      {/* CTA pinned to bottom */}
      <Animated.View
        entering={FadeInUp.delay(800).duration(600)}
        style={styles.ctaWrapper}
      >
        <TouchableOpacity
          style={styles.ctaButton}
          activeOpacity={0.85}
          onPress={() => setPhase("ROUTE_SETUP")}
        >
          <Text style={styles.ctaLabel}>Get Started</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: "#F0F4FF",
  },

  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
    paddingBottom: 40,
    gap: 32,
  },

  iconBox: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },

  title: {
    fontSize: 34,
    fontWeight: "800",
    color: Colors.textPrimary,
    textAlign: "center",
    letterSpacing: -0.5,
  },

  tagline: {
    fontSize: 16,
    fontWeight: "500",
    color: Colors.textSecondary,
    textAlign: "center",
  },

  features: {
    width: "100%",
    gap: 16,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  featureDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  ctaWrapper: {
    position: "absolute",
    bottom: 50,
    left: 28,
    right: 28,
  },
  ctaButton: {
    width: "100%",
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.accent,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  ctaLabel: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
