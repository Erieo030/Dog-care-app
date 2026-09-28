import React from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Pet } from '../../../types';
import { PetIdentityCarousel } from '../../pets/components/PetIdentityCarousel';
import { Colors } from '../../../constants/Colors';

type Props = {
  visible: boolean;
  pets: Pet[];
  selectedPet: Pet | null;
  onSelect: (petId: string) => void;
  onClose: () => void;
};

export function HomePetSelectorModal({
  visible,
  pets,
  selectedPet,
  onSelect,
  onClose,
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="關閉毛孩選擇"
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />
        <SafeAreaView edges={['bottom']} style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.titleGroup}>
              <Text style={styles.eyebrow}>MEGO PET ID</Text>
              <Text style={styles.title}>選擇毛孩</Text>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="關閉毛孩選擇"
              style={styles.closeButton}
              onPress={onClose}
            >
              <Ionicons name="close" size={21} color={Colors.text} />
            </TouchableOpacity>
          </View>
          <Text style={styles.description}>切換後，首頁與照護紀錄會一起顯示這位毛孩。</Text>
          <PetIdentityCarousel
            pets={pets}
            selectedPet={selectedPet}
            onSelect={onSelect}
            showSelectionHint={false}
            showSwipeHint
          />
          <TouchableOpacity accessibilityRole="button" style={styles.doneButton} onPress={onClose}>
            <Text style={styles.doneText}>完成</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(42, 34, 28, 0.34)',
  },
  sheet: {
    paddingTop: 22,
    paddingBottom: 12,
    paddingHorizontal: 20,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.85)',
    backgroundColor: Colors.background,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titleGroup: { flex: 1 },
  eyebrow: { color: Colors.primary, fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  title: { color: Colors.text, fontSize: 22, lineHeight: 29, fontWeight: '900', marginTop: 2 },
  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  description: { color: Colors.subtext, fontSize: 13, lineHeight: 19, marginTop: 5, marginBottom: 8 },
  doneButton: {
    minHeight: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    marginTop: 8,
  },
  doneText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
