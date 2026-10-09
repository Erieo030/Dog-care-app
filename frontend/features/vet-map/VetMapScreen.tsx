/** 用途：在 MEGO 內瀏覽動物醫院地圖，並提供電話與外部導航入口。 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Keyboard,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, type Region } from 'react-native-maps';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Colors } from '../../constants/Colors';
import { useTabContentBottomPadding } from '../../components/navigation/useTabContentBottomPadding';
import type { HomeStackParamList } from '../../navigation/types';
import {
  formatHospitalDistance,
  getHospitalCoordinate,
  getHospitalDirectionsUrl,
  getVisibleHospitals,
  type Coordinate,
} from './vetMapContent';
import { styles } from './vetMapStyles';
import { VET_HOSPITALS } from './vetHospitalData';
import { useVetMapLocation } from './useVetMapLocation';

type Props = NativeStackScreenProps<HomeStackParamList, 'VetMap'>;
type DisplayMode = 'map' | 'list';

const TAICHUNG_REGION: Region = {
  latitude: 24.15,
  longitude: 120.68,
  latitudeDelta: 0.22,
  longitudeDelta: 0.22,
};

const openSource = (url: string) =>
  Linking.openURL(url).catch(() => Alert.alert('無法開啟資料來源', '請稍後再試。'));

export default function VetMapScreen({ navigation, route }: Props) {
  const bottomPadding = useTabContentBottomPadding(20);
  const [mode, setMode] = useState<DisplayMode>('map');
  const [query, setQuery] = useState('');
  const [origin, setOrigin] = useState<Coordinate | undefined>();
  const [region, setRegion] = useState<Region>(TAICHUNG_REGION);
  const [selectedId, setSelectedId] = useState<string>();
  const [interactingWithMap, setInteractingWithMap] = useState(false);
  const mapRef = useRef<MapView>(null);
  const scrollRef = useRef<ScrollView>(null);
  const hospitals = useMemo(
    () => getVisibleHospitals(VET_HOSPITALS, query, origin),
    [query, origin],
  );
  const selectedHospital = hospitals.find((hospital) => hospital.id === selectedId);
  const hasMapLocations = hospitals.some(getHospitalCoordinate);
  const selectForVisit = route.params?.selectForVisit === true;

  const handleLocated = useCallback((coordinate: Coordinate) => {
    setOrigin(coordinate);
    setRegion({ ...coordinate, latitudeDelta: 0.08, longitudeDelta: 0.08 });
  }, []);
  const { locating, locate } = useVetMapLocation(handleLocated);
  useEffect(() => {
    if (mode === 'map') mapRef.current?.animateToRegion(region, 250);
  }, [mode, region]);

  const openDirections = async (hospital: (typeof VET_HOSPITALS)[number]) =>
    Linking.openURL(getHospitalDirectionsUrl(hospital, Platform.OS)).catch(() =>
      Alert.alert('無法開啟地圖', '請稍後再試。'),
    );

  const callHospital = async (phone?: string) => {
    if (!phone) {
      Alert.alert('尚無電話資料', '目前沒有這間醫院的公開電話。');
      return;
    }
    const url = `tel:${phone.replace(/[^0-9+]/g, '')}`;
    await Linking.openURL(url).catch(() =>
      Alert.alert('無法撥打電話', '請確認裝置可使用電話功能。'),
    );
  };

  const selectHospital = (hospitalId: string) => {
    const hospital = VET_HOSPITALS.find((item) => item.id === hospitalId);
    if (!hospital) return;
    Keyboard.dismiss();
    setSelectedId(hospitalId);
    const coordinate = getHospitalCoordinate(hospital);
    setMode(coordinate ? 'map' : 'list');
    if (coordinate) setRegion({ ...coordinate, latitudeDelta: 0.035, longitudeDelta: 0.035 });
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 0, animated: true }));
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
      <ScrollView
        ref={scrollRef}
        scrollEnabled={!interactingWithMap}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
      >
        <View style={styles.header}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={selectForVisit ? '返回就醫紀錄表單' : '返回就醫紀錄'}
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </TouchableOpacity>
          <View style={styles.headingCopy}>
            <Text style={styles.eyebrow}>MEGO 照護支援</Text>
            <Text style={styles.title}>臺中動物醫院</Text>
          </View>
          <View style={styles.headingIcon}>
            <Ionicons name="medical-outline" size={23} color={Colors.success} />
          </View>
        </View>
        <Text style={styles.subtitle}>
          先整理臺中市夜間／急診名單；出發前請先電話確認服務狀況。
        </Text>

        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={19} color={Colors.subtext} />
            <TextInput
              accessibilityLabel="搜尋醫院、行政區、服務時段或地址"
              value={query}
              onChangeText={setQuery}
              placeholder="搜尋醫院、行政區或服務時段"
              placeholderTextColor={Colors.subtext}
              returnKeyType="search"
              style={styles.searchInput}
            />
            {!!query && (
              <TouchableOpacity accessibilityLabel="清除搜尋" onPress={() => setQuery('')}>
                <Ionicons name="close-circle" size={19} color={Colors.subtext} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="使用目前位置"
            style={[styles.locationButton, locating && styles.locationButtonBusy]}
            onPress={() => {
              Keyboard.dismiss();
              void locate();
            }}
            disabled={locating}
          >
            {locating ? (
              <ActivityIndicator color={Colors.success} />
            ) : (
              <Ionicons name="locate-outline" size={21} color={Colors.success} />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.modeSwitch}>
          {(['map', 'list'] as const).map((item) => {
            const active = mode === item;
            return (
              <TouchableOpacity
                key={item}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[styles.modeOption, active && styles.modeOptionActive]}
                onPress={() => {
                  Keyboard.dismiss();
                  setInteractingWithMap(false);
                  setMode(item);
                }}
              >
                <Ionicons
                  name={item === 'map' ? 'map-outline' : 'list-outline'}
                  size={17}
                  color={active ? Colors.primary : Colors.subtext}
                />
                <Text style={[styles.modeText, active && styles.modeTextActive]}>
                  {item === 'map' ? '地圖' : '清單'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {mode === 'map' ? (
          <View style={styles.mapFrame}>
            <MapView
              ref={mapRef}
              style={styles.map}
              initialRegion={region}
              onTouchStart={() => setInteractingWithMap(true)}
              onTouchEnd={() => setInteractingWithMap(false)}
              onTouchCancel={() => setInteractingWithMap(false)}
              showsUserLocation={Boolean(origin)}
              showsMyLocationButton={false}
              toolbarEnabled={false}
              mapType="standard"
              accessibilityLabel="動物醫院地圖"
            >
              {hospitals.map((hospital) => {
                const coordinate = getHospitalCoordinate(hospital);
                return coordinate ? (
                  <Marker
                    key={hospital.id}
                    coordinate={coordinate}
                    title={hospital.name}
                    description={hospital.address}
                    pinColor={Colors.primary}
                    onPress={() => setSelectedId(hospital.id)}
                  />
                ) : null;
              })}
            </MapView>
            {!hasMapLocations && (
              <View pointerEvents="none" style={styles.mapEmptyHint}>
                <View style={styles.mapEmptyIcon}>
                  <Ionicons name="paw-outline" size={20} color={Colors.success} />
                </View>
                <Text style={styles.mapEmptyTitle}>
                  {hospitals.length ? '院所位置待確認' : '找不到符合的醫院'}
                </Text>
                <Text style={styles.mapEmptyText}>
                  {hospitals.length
                    ? '請從下方清單查看資料，仍可聯絡醫院或依地址導航。'
                    : '可清除搜尋，或改用醫院名稱、行政區搜尋。'}
                </Text>
              </View>
            )}
          </View>
        ) : null}

        {selectedHospital ? (
          <HospitalCard
            hospital={selectedHospital}
            origin={origin}
            selectForVisit={selectForVisit}
            onSelectForVisit={() =>
              navigation.popTo(
                'MedicalVisitForm',
                { clinicName: selectedHospital.name },
                { merge: true },
              )
            }
            onCall={() => void callHospital(selectedHospital.phone)}
            onDirections={() => void openDirections(selectedHospital)}
          />
        ) : null}

        <View style={styles.listHeadingRow}>
          <View>
            <Text style={styles.sectionTitle}>臺中夜間／急診名單</Text>
            <Text style={styles.resultCount}>
              {origin ? '依直線距離排序' : '依官方名冊順序'} · {hospitals.length} 間
            </Text>
          </View>
          {origin ? (
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => {
                setOrigin(undefined);
                setRegion(TAICHUNG_REGION);
              }}
              style={styles.clearLocation}
            >
              <Text style={styles.clearLocationText}>清除定位</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {hospitals.length ? (
          hospitals.map((hospital) => (
            <TouchableOpacity
              key={hospital.id}
              accessibilityRole="button"
              accessibilityLabel={`查看${hospital.name}位置`}
              style={[styles.hospitalRow, selectedId === hospital.id && styles.hospitalRowSelected]}
              accessibilityState={{ selected: selectedId === hospital.id }}
              onPress={() => selectHospital(hospital.id)}
            >
              <View style={styles.hospitalIcon}>
                <Ionicons name="medical-outline" size={20} color={Colors.success} />
              </View>
              <View style={styles.hospitalCopy}>
                <Text numberOfLines={1} style={styles.hospitalName}>
                  {hospital.name}
                </Text>
                <Text numberOfLines={2} style={styles.hospitalAddress}>
                  {hospital.address}
                </Text>
                <View style={styles.tagRow}>
                  {hospital.isOpen24Hours ? (
                    <Text style={styles.serviceTag}>24 小時急診</Text>
                  ) : null}
                  {!hospital.isOpen24Hours && hospital.emergencyServiceText ? (
                    <Text style={styles.serviceTag}>{hospital.emergencyServiceText}</Text>
                  ) : null}
                </View>
                {origin ? (
                  <Text style={styles.distanceText}>
                    {formatHospitalDistance(origin, hospital)}
                  </Text>
                ) : null}
                {!origin && !getHospitalCoordinate(hospital) ? (
                  <Text style={styles.distanceText}>位置待確認・可依地址導航</Text>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.subtext} />
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>{query ? '找不到符合的醫院' : '目前沒有名單資料'}</Text>
            <Text style={styles.emptyText}>
              {query
                ? '試試醫院名稱、縣市或地址的其他關鍵字。'
                : '臺中市政府目前公開的夜間／急診名冊共有 11 家，暫無可顯示項目。'}
            </Text>
          </View>
        )}

        <View style={styles.sourceNote}>
          <Ionicons name="information-circle-outline" size={17} color={Colors.subtext} />
          <Text style={styles.sourceNoteText}>
            目前僅收錄臺中市政府夜間／急診名冊 11
            家，並非臺中市完整院所清單。服務資訊可能變動，出發前請先電話確認；地圖座標僅供找路參考。
            部分醫院尚未標示位置，仍可在清單聯絡或依登記地址導航。
          </Text>
        </View>
        <View style={styles.attributionRow}>
          <Text style={styles.attributionText}>院所資料：</Text>
          <TouchableOpacity
            accessibilityRole="link"
            onPress={() =>
              void openSource(VET_HOSPITALS[0]?.sourceUrl ?? 'https://data.gov.tw/dataset/83763')
            }
          >
            <Text style={styles.attributionLink}>臺中市政府公開資料</Text>
          </TouchableOpacity>
          <Text style={styles.attributionText}> · 座標：</Text>
          <TouchableOpacity
            accessibilityRole="link"
            onPress={() => void openSource('https://www.openstreetmap.org/copyright')}
          >
            <Text style={styles.attributionLink}>© OpenStreetMap contributors</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function HospitalCard({
  hospital,
  origin,
  selectForVisit,
  onSelectForVisit,
  onCall,
  onDirections,
}: {
  hospital: (typeof VET_HOSPITALS)[number];
  origin?: Coordinate;
  selectForVisit: boolean;
  onSelectForVisit: () => void;
  onCall: () => void;
  onDirections: () => void;
}) {
  return (
    <View style={styles.selectedCard}>
      <View style={styles.selectedHeader}>
        <View style={styles.hospitalIcon}>
          <Ionicons name="medical-outline" size={21} color={Colors.success} />
        </View>
        <View style={styles.hospitalCopy}>
          <Text style={styles.hospitalName}>{hospital.name}</Text>
          <Text style={styles.hospitalAddress}>{hospital.address}</Text>
          {origin ? (
            <Text style={styles.distanceText}>
              {formatHospitalDistance(origin, hospital)} · 直線距離參考
            </Text>
          ) : null}
        </View>
      </View>
      <TouchableOpacity
        accessibilityRole="link"
        style={styles.sourceLabel}
        onPress={() => void openSource(hospital.sourceUrl)}
      >
        <Ionicons name="checkmark-circle-outline" size={15} color={Colors.success} />
        <Text style={styles.sourceLabelText}>
          資料來源：{hospital.sourceName} · 確認日期 {hospital.verifiedAt} · 查看來源
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        accessibilityRole="link"
        style={styles.sourceMetaLink}
        onPress={() => void openSource(hospital.coordinateSourceUrl)}
      >
        <Text style={styles.sourceMetaText}>
          資料頁更新 {hospital.sourceUpdatedAt} ·{' '}
          {getHospitalCoordinate(hospital)
            ? `座標 ${hospital.coordinateSourceName}（查看授權）`
            : '位置待確認（查看官方地址）'}
        </Text>
      </TouchableOpacity>
      {hospital.emergencyServiceText ? (
        <Text style={styles.serviceHours}>夜間／急診資訊：{hospital.emergencyServiceText}</Text>
      ) : null}
      {hospital.isEmergency || hospital.isOpen24Hours ? (
        <View style={styles.tagRow}>
          {hospital.isEmergency ? <Text style={styles.serviceTag}>急診服務</Text> : null}
          {hospital.isOpen24Hours ? <Text style={styles.serviceTag}>24 小時</Text> : null}
        </View>
      ) : null}
      <View style={styles.actionRow}>
        {selectForVisit ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`將${hospital.name}帶入就醫紀錄`}
            style={styles.secondaryAction}
            onPress={onSelectForVisit}
          >
            <Ionicons name="checkmark-circle-outline" size={17} color={Colors.success} />
            <Text style={styles.secondaryActionText}>帶入紀錄</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`撥打${hospital.name}電話`}
          style={styles.secondaryAction}
          onPress={onCall}
        >
          <Ionicons name="call-outline" size={17} color={Colors.success} />
          <Text style={styles.secondaryActionText}>聯絡醫院</Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`導航到${hospital.name}`}
          style={styles.primaryAction}
          onPress={onDirections}
        >
          <Ionicons name="navigate-outline" size={17} color="#FFF" />
          <Text style={styles.primaryActionText}>開始導航</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
