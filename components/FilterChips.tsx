import { useState } from "react";
import { StyleSheet, View, TouchableOpacity, Text, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/theme";

type FilterOption = {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const FILTERS: FilterOption[] = [
  { id: "all", label: "All", icon: "sparkles" },
  { id: "architecture", label: "Architecture", icon: "business-outline" },
  { id: "history", label: "History", icon: "library-outline" },
  { id: "coffee", label: "Coffee", icon: "cafe-outline" },
];

export default function FilterChips() {
  const [selected, setSelected] = useState("all");
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { top: insets.top + 80 }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {FILTERS.map((filter) => {
          const active = selected === filter.id;
          return (
            <TouchableOpacity
              key={filter.id}
              style={[styles.chip, active ? styles.chipActive : styles.chipInactive]}
              activeOpacity={0.7}
              onPress={() => setSelected(filter.id)}
            >
              <Ionicons
                name={filter.icon}
                size={14}
                color={active ? "#FFFFFF" : Colors.textSecondary}
              />
              <Text style={[styles.label, active ? styles.labelActive : styles.labelInactive]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 9,
  },
  scroll: {
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  chipActive: {
    backgroundColor: Colors.accent,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  chipInactive: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  label: {
    fontSize: 13,
    fontFamily: "System",
  },
  labelActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  labelInactive: {
    color: Colors.textPrimary,
    fontWeight: "500",
  },
});
