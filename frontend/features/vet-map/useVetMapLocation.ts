import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Alert } from 'react-native';
import * as Location from 'expo-location';
import type { Coordinate } from './vetMapContent';

/** 定位只在點選時請求；限制等待時間，離開頁面後不回寫結果。 */
export function useVetMapLocation(onLocated: (coordinate: Coordinate) => void) {
  const [locating, setLocating] = useState(false);
  const requestRef = useRef<AbortController | null>(null);

  useFocusEffect(
    useCallback(
      () => () => {
        requestRef.current?.abort();
        requestRef.current = null;
        setLocating(false);
      },
      [],
    ),
  );

  const locate = useCallback(async () => {
    if (requestRef.current) return;
    const controller = new AbortController();
    requestRef.current = controller;
    setLocating(true);
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (controller.signal.aborted) return;
      if (!permission.granted) {
        Alert.alert(
          '尚未開啟定位',
          '你仍可瀏覽醫院清單；若想依距離排序，可在手機設定中允許 MEGO 使用位置。',
        );
        return;
      }
      const position = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        new Promise<never>((_resolve, reject) => {
          timeout = setTimeout(() => reject(new Error('定位逾時')), 12000);
        }),
      ]);
      if (!controller.signal.aborted) {
        onLocated({ latitude: position.coords.latitude, longitude: position.coords.longitude });
      }
    } catch {
      if (!controller.signal.aborted) {
        Alert.alert(
          '無法取得目前位置',
          '定位暫時無法完成，請稍後再試；你仍可直接搜尋及瀏覽臺中醫院清單。',
        );
      }
    } finally {
      if (timeout) clearTimeout(timeout);
      if (requestRef.current === controller) {
        requestRef.current = null;
        setLocating(false);
      }
    }
  }, [onLocated]);

  return { locating, locate };
}
