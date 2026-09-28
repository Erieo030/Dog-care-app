/**
 * 用途：顯示目前與歷史用藥療程。
 * 資料：../../../services/medicationService.ts
 * 表單：MedicationFormScreen.tsx
 */
import React, { useCallback, useRef, useState } from 'react';
import { FlatList, Image, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AppButton } from '../../../components/AppButton';
import { Colors } from '../../../constants/Colors';
import { useTabContentBottomPadding } from '../../../components/navigation/useTabContentBottomPadding';
import { HOME_THEME_HEALTH_EMPTY_ARTWORK } from '../../../constants/HomeThemes';
import ScreenState from '../../../components/ScreenState';
import { SoftEntrance } from '../../../components/SoftMotion';
import { useAuth } from '../../../contexts/AuthContext';
import { usePet } from '../../../contexts/PetContext';
import { useSettings } from '../../../contexts/SettingsContext';
import type { HomeStackParamList } from '../../../navigation/types';
import { getMedications } from '../../../services/medicationService';
import type { MedicationCourse } from '../../../types';
import { medicationStyles as styles } from '../medicationStyles';
import { mealTimingLabels } from '../types';

type ListEntry =
  | { kind: 'section'; id: string; title: string }
  | { kind: 'item'; id: string; item: MedicationCourse };

export function MedicationListScreen() {
  const bottomContentPadding = useTabContentBottomPadding(24, true);
  const { session } = useAuth();
  const { selectedPet } = usePet();
  const { settings } = useSettings();
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const [data, setData] = useState<MedicationCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const requestId = useRef(0);

  const load = useCallback(async (signal?: AbortSignal) => {
    const current = ++requestId.current;
    if (!session?.userId || !selectedPet) return;
    setLoading(true);
    try {
      const result = await getMedications(session.userId, selectedPet.id, undefined, signal);
      if (current === requestId.current) {
        setData(result.records);
        setError('');
      }
    } catch (caught) {
      if (current === requestId.current && !signal?.aborted)
        setError((caught as Error).message);
    } finally {
      if (current === requestId.current) setLoading(false);
    }
  }, [selectedPet, session?.userId]);

  useFocusEffect(
    useCallback(() => {
      const controller = new AbortController();
      void load(controller.signal);
      return () => {
        controller.abort();
        requestId.current += 1;
      };
    }, [load]),
  );

  if (loading) return <ScreenState loading text="載入中…" />;

  const active = data.filter((item) => item.status === 'active');
  const history = data.filter((item) => item.status !== 'active');
  const listData: ListEntry[] = [
    ...(active.length
      ? [
          { kind: 'section' as const, id: 'active-section', title: '目前用藥' },
          ...active.map((item) => ({ kind: 'item' as const, id: `active-${item.id}`, item })),
        ]
      : []),
    ...(history.length
      ? [
          { kind: 'section' as const, id: 'history-section', title: '歷史用藥' },
          ...history.map((item) => ({ kind: 'item' as const, id: `history-${item.id}`, item })),
        ]
      : []),
  ];

  return (
    <FlatList
      data={listData}
      keyExtractor={(entry) => entry.id}
      removeClippedSubviews
      initialNumToRender={8}
      maxToRenderPerBatch={8}
      windowSize={5}
      contentContainerStyle={[styles.page, { paddingBottom: bottomContentPadding }]}
      ListHeaderComponent={
        <>
          <View style={styles.listHeader}>
            <View style={styles.listHeaderIcon}>
              <Ionicons name="medical-outline" size={23} color={Colors.success} />
            </View>
            <View style={styles.listHeaderBody}>
              <Text style={styles.title}>用藥管理</Text>
              <Text style={styles.listSubtitle}>
                整理 {selectedPet?.name || '毛孩'} 的療程與提醒
              </Text>
            </View>
          </View>
          {error ? (
            <TouchableOpacity onPress={() => void load()}>
              <Text style={styles.error}>{error}（重試）</Text>
            </TouchableOpacity>
          ) : null}
          <AppButton
            variant="primary"
            style={styles.primary}
            onPress={() => navigation.navigate('MedicationForm')}
            accessibilityLabel="新增用藥療程"
          >
            <Ionicons name="add" size={20} color="#FFF" />
            <Text style={styles.primaryText}>新增用藥療程</Text>
          </AppButton>
          {!data.length ? (
            <View style={styles.emptyBox}>
              <SoftEntrance>
                <Image
                  accessible={false}
                  resizeMode="contain"
                  source={HOME_THEME_HEALTH_EMPTY_ARTWORK[settings.homeTheme]}
                  style={styles.emptyArtwork}
                />
              </SoftEntrance>
              <Text style={styles.empty}>目前沒有用藥紀錄</Text>
              <Text style={styles.emptyHint}>需要時再新增，讓 MEGO 幫你整理療程。</Text>
            </View>
          ) : null}
        </>
      }
      renderItem={({ item: entry }) => {
        if (entry.kind === 'section') return <Text style={styles.section}>{entry.title}</Text>;
        const medication = entry.item;
        return (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`查看用藥：${medication.name}`}
            style={styles.card}
            onPress={() => navigation.navigate('MedicationDetail', { recordId: medication.id })}
          >
            <View style={styles.cardTitleRow}>
              <View style={styles.cardIcon}>
                <Ionicons name="medical-outline" size={18} color={Colors.success} />
              </View>
              <Text style={styles.name}>{medication.name}</Text>
              <Ionicons name="chevron-forward" size={17} color={Colors.subtext} />
            </View>
            <Text style={styles.cardText}>
              {medication.startDate}
              {medication.endDate ? ` ～ ${medication.endDate}` : ''}
            </Text>
            <Text style={styles.cardText}>
              每日 {medication.timesPerDay} 次 · {mealTimingLabels[medication.mealTiming]}
            </Text>
            <Text style={styles.cardHint}>
              {medication.reminderEnabled ? '已設定提醒' : '尚未設定提醒'}
            </Text>
          </TouchableOpacity>
        );
      }}
    />
  );
}
