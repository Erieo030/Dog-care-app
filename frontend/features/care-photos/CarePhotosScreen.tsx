/** 照片入口：既有照護附件按月份、週分組；不建立新的紀錄副本。 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  SectionList,
  Switch,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../../contexts/AuthContext';
import { usePet } from '../../contexts/PetContext';
import { Colors } from '../../constants/Colors';
import { useTabContentBottomPadding } from '../../components/navigation/useTabContentBottomPadding';
import type { HomeStackParamList } from '../../navigation/types';
import { addDateKeyDays, taipeiDateKey } from '../../utils/taipeiDate';
import {
  CARE_PHOTO_FILTERS,
  groupPhotoRows,
  photoRecordTarget,
  shiftPhotoMonth,
  type CarePhoto,
  type CarePhotoCategory,
} from './carePhotoContent';
import { styles } from './carePhotoStyles';
import { useCarePhotos } from './useCarePhotos';
import CarePhotoImage from './components/CarePhotoImage';
import CarePhotoViewer from './components/CarePhotoViewer';
import PhotoMonthPicker from './components/PhotoMonthPicker';

type Props = NativeStackScreenProps<HomeStackParamList, 'PhotosOverview'>;
export default function CarePhotosScreen({ navigation }: Props) {
  const { session } = useAuth();
  const { pets, selectedPet, selectPet } = usePet();
  const { width, fontScale } = useWindowDimensions();
  const [viewportWidth, setViewportWidth] = useState(width);
  const bottomPadding = useTabContentBottomPadding(20);
  const [month, setMonth] = useState(() => taipeiDateKey().slice(0, 7));
  const [category, setCategory] = useState<CarePhotoCategory>('all');
  const [hideSensitive, setHideSensitive] = useState(true);
  const [viewing, setViewing] = useState<{ photo: CarePhoto; scope: string } | null>(null);
  const [monthPicker, setMonthPicker] = useState(false);
  const data = useCarePhotos(session?.userId, selectedPet?.id, month, category);
  const columns = viewportWidth >= 430 && fontScale <= 1.2 ? 3 : 2;
  const photoWidth = Math.max((viewportWidth - 40 - (columns - 1) * 12) / columns, 0);
  const sections = useMemo(
    () => groupPhotoRows(data.page.items, columns),
    [data.page.items, columns],
  );
  // 切帳號或切毛孩時，舊預覽立即隱藏，不等待 effect 執行。
  const scope = JSON.stringify([session?.userId, selectedPet?.id, month, category]);
  useEffect(() => setViewing(null), [scope]);
  const visiblePhoto = data.loading || viewing?.scope !== scope ? null : viewing.photo;
  const openRecord = (photo: CarePhoto) => {
    setViewing(null);
    const target = photoRecordTarget(photo);
    if (target.name === 'HealthEventDetail') navigation.navigate(target.name, target.params);
    else if (target.name === 'MedicalVisitDetail') navigation.navigate(target.name, target.params);
    else navigation.navigate(target.name, target.params);
  };
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.page}>
      <SectionList
        onLayout={(event) => setViewportWidth(event.nativeEvent.layout.width)}
        key={columns}
        sections={data.loading ? [] : sections}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={[styles.list, { paddingBottom: bottomPadding }]}
        keyExtractor={(row) => row.map((photo) => photo.id).join(':')}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        onRefresh={() => {
          setViewing(null);
          data.refresh();
        }}
        refreshing={data.loading}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>照護相簿</Text>
            <Text style={styles.subtitle}>把照護留下的照片，依日期收在一起。</Text>
            <View style={styles.petRow}>
              <Ionicons name="paw-outline" size={22} color={Colors.primary} />
              <Text numberOfLines={2} style={styles.petName}>
                {selectedPet?.name || '請先選擇毛孩'}
              </Text>
              <Ionicons name="lock-closed-outline" size={14} color={Colors.subtext} />
              <Text style={styles.privateText}>私人相簿</Text>
            </View>
            {pets.length > 1 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingBottom: 14 }}
              >
                {pets.map((pet) => (
                  <TouchableOpacity
                    key={pet.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected: pet.id === selectedPet?.id }}
                    style={[styles.filter, pet.id === selectedPet?.id && styles.filterActive]}
                    onPress={() => {
                      setViewing(null);
                      selectPet(pet.id);
                    }}
                  >
                    <Text style={styles.filterText}>{pet.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            <View style={styles.controls}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="上一個照片月份"
                style={styles.iconButton}
                disabled={month === '2000-01'}
                onPress={() => setMonth(shiftPhotoMonth(month, -1))}
              >
                <Ionicons name="chevron-back" size={20} color={Colors.text} />
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="選擇照片月份與年份"
                style={styles.month}
                onPress={() => setMonthPicker(true)}
              >
                <Text style={styles.monthText}>
                  {Number(month.slice(0, 4))} 年 {Number(month.slice(5))} 月 ▾
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="下一個照片月份"
                style={styles.iconButton}
                disabled={month === '9998-12'}
                onPress={() => setMonth(shiftPhotoMonth(month, 1))}
              >
                <Ionicons name="chevron-forward" size={20} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filters}
            >
              {CARE_PHOTO_FILTERS.map((filter) => (
                <TouchableOpacity
                  key={filter.key}
                  accessibilityRole="button"
                  accessibilityState={{ selected: category === filter.key }}
                  style={[styles.filter, category === filter.key && styles.filterActive]}
                  onPress={() => setCategory(filter.key)}
                >
                  <Text style={styles.filterText}>{filter.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>隱藏健康事件縮圖（點選仍可查看）</Text>
              <Switch
                accessibilityLabel="隱藏健康事件縮圖"
                value={hideSensitive}
                onValueChange={setHideSensitive}
                trackColor={{ true: Colors.success }}
              />
            </View>
            <Text style={styles.subtitle}>
              {!selectedPet
                ? '選擇毛孩後查看照片'
                : data.loading
                  ? '正在整理照片…'
                  : data.error && !data.page.items.length
                    ? '照片資料暫時無法讀取'
                    : `這個月有 ${data.page.total} 張照片 · 依紀錄日期排列`}
            </Text>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.week}>
            <Ionicons name="calendar-outline" size={17} color={Colors.primary} />
            <Text style={styles.weekTitle}>
              {section.title.replaceAll('-', '/')} -{' '}
              {addDateKeyDays(section.title, 6).replaceAll('-', '/')}
            </Text>
          </View>
        )}
        renderItem={({ item: row }) => (
          <View style={styles.photoRow}>
            {row.map((photo) => (
              <TouchableOpacity
                key={photo.id}
                accessibilityRole="button"
                accessibilityLabel={`查看 ${photo.recordDate} ${photo.categoryLabel}照片`}
                style={{ width: photoWidth }}
                onPress={() => setViewing({ photo, scope })}
              >
                <CarePhotoImage
                  photo={photo}
                  userId={session?.userId || ''}
                  token={data.token}
                  thumbnail
                  hidden={hideSensitive && photo.sensitive}
                />
                <Text style={styles.caption}>
                  {photo.recordDate.slice(5).replace('-', '/')} · {photo.categoryLabel}
                </Text>
                <Text numberOfLines={2} style={styles.captionSub}>
                  {photo.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        ListEmptyComponent={
          data.loading ? (
            <View>
              {[0, 1].map((row) => (
                <View key={row} style={styles.skeletonRow}>
                  {Array.from({ length: columns }, (_, i) => (
                    <View key={i} style={styles.skeleton} />
                  ))}
                </View>
              ))}
            </View>
          ) : !data.error ? (
            <View style={styles.empty}>
              <Ionicons name="images-outline" size={42} color={Colors.primary} />
              <Text style={styles.emptyTitle}>
                {selectedPet ? '這個月份還沒有照護照片' : '先建立或選擇毛孩'}
              </Text>
              <Text style={styles.emptyText}>
                {selectedPet
                  ? '在健康異常、體重或就醫紀錄附上照片並儲存後，就會出現在這裡。也可以切換月份找找之前的照片。'
                  : '可以先到設定的「我的毛孩」建立資料，再回來查看照護照片。'}
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          <View style={styles.footer}>
            {!!data.error && (
              <>
                <Text accessibilityLiveRegion="polite" style={styles.body}>
                  {data.error}
                </Text>
                <TouchableOpacity
                  accessibilityRole="button"
                  style={styles.button}
                  onPress={data.page.items.length ? () => void data.loadMore() : data.refresh}
                >
                  <Text style={styles.buttonText}>重新載入</Text>
                </TouchableOpacity>
              </>
            )}
            {data.page.hasMore && !data.error && (
              <TouchableOpacity
                accessibilityRole="button"
                disabled={data.loadingMore}
                style={styles.button}
                onPress={() => void data.loadMore()}
              >
                <Text style={styles.buttonText}>
                  {data.loadingMore ? '載入中…' : '載入更多照片'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />
      <PhotoMonthPicker
        visible={monthPicker}
        month={month}
        onChange={(value) => {
          setViewing(null);
          setMonth(value);
        }}
        onClose={() => setMonthPicker(false)}
      />
      <CarePhotoViewer
        photo={visiblePhoto}
        userId={session?.userId || ''}
        token={data.token}
        onClose={() => setViewing(null)}
        onOpenRecord={openRecord}
      />
    </SafeAreaView>
  );
}
