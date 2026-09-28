import React from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Image, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppButton } from '../../../components/AppButton';
import { Colors } from '../../../constants/Colors';
import { getMediaPermissionCopy, requestMediaPermission } from '../../../services/mediaPermissionService';

type Props = {
  avatarUri: string;
  onChange: (uri: string) => void;
};

export default function PetAvatarPicker({ avatarUri, onChange }: Props) {
  const chooseFromLibrary = async () => {
    try {
      const permission = await requestMediaPermission('library');
      if (!permission.granted) {
        const copy = getMediaPermissionCopy('library');
        Alert.alert(copy.title, copy.message, [
          { text: '取消', style: 'cancel' },
          ...(permission.canAskAgain
            ? []
            : [{ text: '前往設定', onPress: () => void Linking.openSettings() }]),
        ]);
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });
      if (!result.canceled) onChange(result.assets[0].uri);
    } catch {
      Alert.alert('無法開啟相簿', '請稍後再試，或確認 MEGO 已取得相簿權限。');
    }
  };

  const takePhoto = async () => {
    try {
      const permission = await requestMediaPermission('camera');
      if (!permission.granted) {
        const copy = getMediaPermissionCopy('camera');
        Alert.alert(copy.title, copy.message, [
          { text: '取消', style: 'cancel' },
          ...(permission.canAskAgain
            ? []
            : [{ text: '前往設定', onPress: () => void Linking.openSettings() }]),
        ]);
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });
      if (!result.canceled) onChange(result.assets[0].uri);
    } catch {
      Alert.alert('無法開啟相機', '請稍後再試，或確認 MEGO 已取得相機權限。');
    }
  };

  return (
    <View style={styles.avatarSection}>
      {avatarUri ? (
        <Image source={{ uri: avatarUri }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarFallback}>
          <Ionicons name="paw" size={42} color={Colors.primary} />
        </View>
      )}
      <View style={styles.avatarActions}>
        <Text style={styles.avatarTitle}>毛孩照片</Text>
        <Text style={styles.avatarHint}>可選擇相簿照片或直接拍照。</Text>
        <View style={styles.imageActions}>
          <TouchableOpacity style={styles.imageButton} onPress={chooseFromLibrary}>
            <Text style={styles.imageButtonText}>從相簿選擇</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.imageButton} onPress={takePhoto}>
            <Text style={styles.imageButtonText}>拍照</Text>
          </TouchableOpacity>
        </View>
        {avatarUri ? (
          <AppButton
            title="移除圖片"
            variant="danger"
            fullWidth={false}
            textStyle={styles.removeText}
            style={styles.removeButton}
            onPress={() => onChange('')}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSoft,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    padding: 14,
    marginBottom: 22,
  },
  avatar: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  avatarFallback: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatarActions: { flex: 1, marginLeft: 13 },
  avatarTitle: { color: Colors.text, fontSize: 16, fontWeight: '800' },
  avatarHint: { color: Colors.subtext, fontSize: 12, lineHeight: 17, marginTop: 2 },
  imageActions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  imageButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  imageButtonText: { color: Colors.primary, fontSize: 12, fontWeight: '700' },
  removeButton: {
    alignSelf: 'flex-start',
    minHeight: 44,
    minWidth: 64,
    justifyContent: 'center',
    marginTop: 4,
    paddingHorizontal: 8,
  },
  removeText: { color: Colors.danger, fontSize: 12, fontWeight: '700' },
});
