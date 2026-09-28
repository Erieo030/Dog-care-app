/** 用途：顯示毛孩的驅蟲紀錄列表。 */
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
import { getDewormings } from '../../../services/dewormingService';
import type { Deworming } from '../../../types';
import { dewormingStyles as styles } from '../dewormingStyles';
import { dewormingTypeLabels } from '../types';

export function DewormingListScreen() {
  const bottomContentPadding = useTabContentBottomPadding(24, true);
  const { session } = useAuth();
  const { selectedPet } = usePet();
  const { settings } = useSettings();
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const [records, setRecords] = useState<Deworming[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const requestId = useRef(0);
  const load = useCallback(async (signal?: AbortSignal) => {
    const current = ++requestId.current;
    if (!session?.userId || !selectedPet) return;
    setLoading(true);
    try {
      const result = await getDewormings(session.userId, selectedPet.id, signal);
      if (current === requestId.current) {
        setRecords(result.records);
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
  return (
    <FlatList
      data={records}
      keyExtractor={(record) => record.id}
      removeClippedSubviews
      initialNumToRender={8}
      maxToRenderPerBatch={8}
      windowSize={5}
      contentContainerStyle={[styles.page, { paddingBottom: bottomContentPadding }]}
      ListHeaderComponent={
        <>
          <View style={styles.listHeader}>
            <View style={styles.listHeaderIcon}>
              <Ionicons name="shield-checkmark-outline" size={23} color={Colors.success} />
            </View>
            <View style={styles.listHeaderBody}>
              <Text style={styles.title}>驅蟲紀錄</Text>
              <Text style={styles.listSubtitle}>查看 {selectedPet?.name || '毛孩'} 的預防紀錄</Text>
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
            onPress={() => navigation.navigate('DewormingForm')}
            accessibilityLabel="新增驅蟲紀錄"
          >
            <Ionicons name="add" size={20} color="#FFF" />
            <Text style={styles.primaryText}>新增驅蟲紀錄</Text>
          </AppButton>
          {!records.length ? (
            <View style={styles.emptyBox}>
              <SoftEntrance>
                <Image
                  accessible={false}
                  resizeMode="contain"
                  source={HOME_THEME_HEALTH_EMPTY_ARTWORK[settings.homeTheme]}
                  style={styles.emptyArtwork}
                />
              </SoftEntrance>
              <Text style={styles.empty}>目前沒有驅蟲紀錄</Text>
              <Text style={styles.emptyHint}>記下每次預防，照護就不容易忘記。</Text>
            </View>
          ) : null}
        </>
      }
      renderItem={({ item: record }) => (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`查看驅蟲紀錄：${record.productName || '未填寫'}`}
          style={styles.card}
          onPress={() => navigation.navigate('DewormingDetail', { recordId: record.id })}
        >
          <View style={styles.cardTitleRow}>
            <View style={styles.cardIcon}>
              <Ionicons name="shield-checkmark-outline" size={18} color={Colors.success} />
            </View>
            <Text style={styles.name}>{dewormingTypeLabels[record.type]}</Text>
            <Ionicons name="chevron-forward" size={17} color={Colors.subtext} />
          </View>
          <Text style={styles.cardText}>{record.productName}</Text>
          <Text style={styles.cardText}>
            使用日期：{new Date(record.administeredAt).toLocaleDateString('zh-TW')}
          </Text>
          {record.nextDueAt ? (
            <Text style={styles.cardMeta}>
              下次：{new Date(record.nextDueAt).toLocaleDateString('zh-TW')}
            </Text>
          ) : null}
          <Text style={styles.cardHint}>{record.reminderId ? '已建立提醒' : '尚未建立提醒'}</Text>
        </TouchableOpacity>
      )}
    />
  );
}
