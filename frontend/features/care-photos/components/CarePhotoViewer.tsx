import React from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/Colors';
import { formatTaipeiDate } from '../../../utils/taipeiDate';
import type { CarePhoto } from '../carePhotoContent';
import { styles } from '../carePhotoStyles';
import CarePhotoImage from './CarePhotoImage';

export default function CarePhotoViewer({
  photo,
  userId,
  token,
  onClose,
  onOpenRecord,
}: {
  photo: CarePhoto | null;
  userId: string;
  token: string | null;
  onClose: () => void;
  onOpenRecord: (photo: CarePhoto) => void;
}) {
  const { height } = useWindowDimensions();
  return (
    <Modal visible={!!photo} animationType="fade" onRequestClose={onClose}>
      <SafeAreaView style={styles.page}>
        <View style={styles.viewerHeader}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="關閉照片"
            style={styles.iconButton}
            onPress={onClose}
          >
            <Ionicons name="close" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.petName}>照片詳情</Text>
        </View>
        {photo && (
          <ScrollView contentContainerStyle={styles.viewerBody}>
            <CarePhotoImage
              photo={photo}
              userId={userId}
              token={token}
              style={{
                height: Math.min(Math.max(height * 0.45, 260), 480),
                aspectRatio: undefined,
              }}
            />
            <Text style={styles.label}>
              {photo.categoryLabel} · {formatTaipeiDate(photo.recordAt)}
            </Text>
            <Text style={styles.detailTitle}>{photo.title}</Text>
            <View style={styles.detailSection}>
              <Text style={styles.label}>補充備註</Text>
              <Text style={styles.body}>{photo.notes || '這筆紀錄沒有補充備註。'}</Text>
            </View>
            {!!photo.createdAt && (
              <Text style={styles.label}>
                上傳日期：{formatTaipeiDate(photo.createdAt)}（與紀錄日期分開）
              </Text>
            )}
            <TouchableOpacity
              accessibilityRole="button"
              style={[styles.button, styles.primary]}
              onPress={() => onOpenRecord(photo)}
            >
              <Text style={[styles.buttonText, styles.primaryText]}>查看原始紀錄</Text>
            </TouchableOpacity>
            <Text style={styles.label}>照片沿用原始紀錄；編輯或刪除請從原始紀錄操作。</Text>
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}
