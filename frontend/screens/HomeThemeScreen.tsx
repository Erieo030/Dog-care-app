import { SafeAreaView } from 'react-native-safe-area-context';
/** 用途：讓使用者選擇登入後首頁的居家照護世界。 */
import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { useTabContentBottomPadding } from '../components/navigation/useTabContentBottomPadding';
import { HOME_THEME_IDS, HOME_THEMES } from '../constants/HomeThemes';
import { HomeThemeId } from '../constants/HomeThemeIds';
import { useSettings } from '../contexts/SettingsContext';

export default function HomeThemeScreen() {
  const bottomContentPadding = useTabContentBottomPadding();
  const { settings, update, saving } = useSettings();
  const selectTheme = useCallback(
    async (themeId: HomeThemeId) => {
      if (themeId === settings.homeTheme || saving) return;
      try {
        await update({ homeTheme: themeId });
      } catch {
        Alert.alert('暫時無法更換風格', '請稍後再試一次。');
      }
    },
    [saving, settings.homeTheme, update],
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomContentPadding }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>選一個照護小屋</Text>
        <Text style={styles.subtitle}>首頁會以你喜歡的場景陪你整理毛孩日常，隨時都能再更換。</Text>

        <View style={styles.list}>
          {HOME_THEME_IDS.map((themeId) => {
            const theme = HOME_THEMES[themeId];
            const selected = settings.homeTheme === themeId;
            return (
              <TouchableOpacity
                key={theme.id}
                accessibilityRole="radio"
                accessibilityLabel={`選擇${theme.title}`}
                accessibilityState={{ selected, disabled: saving }}
                disabled={saving}
                onPress={() => void selectTheme(theme.id)}
                style={[styles.themeCard, selected && { borderColor: theme.accent }]}
              >
                <Image source={theme.background} style={styles.preview} resizeMode="cover" />
                <View style={styles.cardShade} />
                <View style={styles.cardContent}>
                  <View style={styles.cardTitleRow}>
                    <Text style={styles.cardTitle}>{theme.title}</Text>
                    {selected ? (
                      <View style={[styles.selectedMark, { backgroundColor: theme.accent }]}>
                        <Ionicons name="checkmark" size={15} color={Colors.surface} />
                      </View>
                    ) : (
                      <View style={styles.unselectedMark} />
                    )}
                  </View>
                  <Text style={styles.cardDescription}>{theme.description}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
        {saving && <ActivityIndicator color={Colors.primary} style={styles.saving} />}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingBottom: 38 },
  title: { color: Colors.text, fontSize: 26, fontWeight: '900' },
  subtitle: { color: Colors.subtext, fontSize: 15, lineHeight: 23, marginTop: 8 },
  list: { gap: 15, marginTop: 24 },
  themeCard: {
    height: 172,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  preview: { ...StyleSheet.absoluteFill, width: undefined, height: undefined },
  cardShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(47,41,37,0.13)' },
  cardContent: { flex: 1, justifyContent: 'flex-end', padding: 15 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { flex: 1, color: Colors.text, fontSize: 19, fontWeight: '900' },
  cardDescription: {
    color: '#4D423A',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
    maxWidth: '90%',
  },
  selectedMark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unselectedMark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(47,41,37,0.42)',
  },
  saving: { marginTop: 6 },
});
