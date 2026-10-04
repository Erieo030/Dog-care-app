import React, { useEffect, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RecordActionButton } from '../../../components/RecordActionButton';
import { Colors } from '../../../constants/Colors';
import type { Pet } from '../../../types';
import AuthenticatedPetAvatar from '../../../components/AuthenticatedPetAvatar';

type Props = {
  pets: Pet[];
  selectedPet?: Pet | null;
  onSelect: (petId: string) => void;
  onEdit?: (pet: Pet) => void;
  showSelectionHint?: boolean;
  showSwipeHint?: boolean;
};

const CARD_GAP = 12;

function ageText(birthDate?: string) {
  if (!birthDate) return '年齡未填';
  const birth = new Date(birthDate);
  if (!Number.isFinite(birth.getTime())) return '年齡未填';
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (
    now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())
  )
    age--;
  return `${Math.max(age, 0)} 歲`;
}

function genderText(gender?: string) {
  if (gender === 'male') return '公';
  if (gender === 'female') return '母';
  return '性別未設定';
}

export function PetIdentityCarousel({
  pets,
  selectedPet,
  onSelect,
  onEdit,
  showSelectionHint = true,
  showSwipeHint = true,
}: Props) {
  const { width: windowWidth } = useWindowDimensions();
  const [containerWidth, setContainerWidth] = useState(0);
  const availableWidth = containerWidth || windowWidth - 40;
  const cardWidth = Math.min(350, Math.max(260, availableWidth - 28));
  const interval = cardWidth + CARD_GAP;
  const scrollRef = useRef<ScrollView>(null);

  const onCarouselLayout = (event: LayoutChangeEvent) => {
    const nextWidth = event.nativeEvent.layout.width;
    if (nextWidth > 0 && nextWidth !== containerWidth) setContainerWidth(nextWidth);
  };

  useEffect(() => {
    const index = pets.findIndex((pet) => pet.id === selectedPet?.id);
    if (index < 0) return;
    requestAnimationFrame(() =>
      scrollRef.current?.scrollTo({ x: index * interval, animated: false }),
    );
  }, [interval, pets, selectedPet?.id]);

  return (
    <>
      {showSelectionHint ? (
        <View style={styles.selectionHintBox}>
          <Ionicons name="sync-outline" size={18} color={Colors.primary} />
          <Text style={styles.selectionHintText}>選取毛孩後，首頁與照護紀錄會同步更新。</Text>
        </View>
      ) : null}
      <ScrollView
        ref={scrollRef}
        onLayout={onCarouselLayout}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.petCards}
        snapToInterval={interval}
        snapToAlignment="start"
        decelerationRate="fast"
        disableIntervalMomentum
        onMomentumScrollEnd={(event) => {
          const index = Math.round(event.nativeEvent.contentOffset.x / interval);
          const pet = pets[index];
          if (pet && pet.id !== selectedPet?.id) onSelect(pet.id);
        }}
      >
        {pets.map((pet) => {
          const selected = selectedPet?.id === pet.id;
          const identifier = pet.id.slice(-6).toUpperCase();
          return (
            <View
              key={pet.id}
              style={[styles.pet, { width: cardWidth }, selected && styles.petSelected]}
            >
              <View style={styles.idAccent} />
              <Ionicons name="paw" size={42} color={Colors.primary} style={styles.idWatermark} />
              <View style={styles.idCardTop}>
                <View style={styles.brandLockup}>
                  <View style={styles.brandIcon}>
                    <Ionicons name="paw" size={14} color={Colors.primary} />
                  </View>
                  <Text style={styles.idCardBrand}>MEGO 毛孩身份卡</Text>
                </View>
                {selected ? (
                  <View style={styles.currentBadge}>
                    <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
                    <Text style={styles.currentBadgeText}>目前照護</Text>
                  </View>
                ) : null}
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`選擇毛孩：${pet.name}`}
                style={styles.idCardBody}
                onPress={() => onSelect(pet.id)}
              >
                {pet.avatarAttachmentId ? (
                  <AuthenticatedPetAvatar
                    attachmentId={pet.avatarAttachmentId}
                    userId={pet.userId}
                    style={styles.avatar}
                    fallback={(
                      <View style={[styles.avatar, styles.avatarFallback]}>
                        <Text style={styles.avatarText}>{pet.name.slice(0, 1)}</Text>
                        <Ionicons name="paw" size={14} color={Colors.primary} style={styles.avatarPaw} />
                      </View>
                    )}
                  />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback]}>
                    <Text style={styles.avatarText}>{pet.name.slice(0, 1)}</Text>
                    <Ionicons
                      name="paw"
                      size={14}
                      color={Colors.primary}
                      style={styles.avatarPaw}
                    />
                  </View>
                )}
                <View style={styles.petInfo}>
                  <Text style={styles.idPetName} numberOfLines={1}>
                    {pet.name}
                  </Text>
                  <View style={styles.petTraits}>
                    <Trait label={pet.breed || '品種未設定'} />
                    <Trait label={genderText(pet.gender)} />
                    <Trait label={ageText(pet.birthDate)} />
                  </View>
                </View>
              </TouchableOpacity>
              <View style={styles.idCardFooter}>
                <View style={styles.idCodeGroup}>
                  <Ionicons name="id-card-outline" size={15} color={Colors.subtext} />
                  <Text style={styles.idCodeLabel}>識別碼</Text>
                  <Text style={styles.idCode}>M-{identifier}</Text>
                </View>
                {onEdit ? (
                  <RecordActionButton
                    kind="edit"
                    label="編輯"
                    accessibilityLabel={`編輯毛孩：${pet.name}`}
                    style={styles.editButton}
                    onPress={() => onEdit(pet)}
                  />
                ) : null}
              </View>
            </View>
          );
        })}
      </ScrollView>
      {showSwipeHint && pets.length > 1 ? (
        <>
          <View style={styles.cardSwipeHint}>
            <Ionicons name="swap-horizontal-outline" size={15} color={Colors.subtext} />
            <Text style={styles.cardSwipeHintText}>左右滑動或點選卡片切換毛孩</Text>
          </View>
          <View style={styles.cardDots}>
            {pets.map((pet) => (
              <View
                key={pet.id}
                style={[styles.cardDot, selectedPet?.id === pet.id && styles.cardDotActive]}
              />
            ))}
          </View>
        </>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  selectionHintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: Colors.peachSoft,
    borderRadius: 16,
    paddingHorizontal: 13,
    paddingVertical: 11,
    marginBottom: 10,
  },
  selectionHintText: { flex: 1, color: Colors.subtext, fontSize: 12, lineHeight: 18 },
  petCards: { gap: CARD_GAP, paddingVertical: 4 },
  cardSwipeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 2,
  },
  cardSwipeHintText: { color: Colors.subtext, fontSize: 12 },
  cardDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 7,
    marginBottom: 2,
  },
  cardDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.border },
  cardDotActive: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary },
  pet: {
    height: 210,
    flexShrink: 0,
    alignSelf: 'flex-start',
    borderRadius: 22,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    flexDirection: 'column',
    alignItems: 'stretch',
    paddingHorizontal: 15,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: Colors.surfaceSoft,
  },
  petSelected: { borderColor: Colors.primary, backgroundColor: '#FFFCF7' },
  idWatermark: { position: 'absolute', right: 10, bottom: 43, opacity: 0.06 },
  idAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: Colors.primary,
  },
  idCardTop: {
    minHeight: 25,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandLockup: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  brandIcon: {
    width: 23,
    height: 23,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.peachSoft,
  },
  idCardBrand: { color: Colors.primary, fontSize: 12, fontWeight: '900', letterSpacing: 0.3 },
  idCardBody: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 0 },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: Colors.surface,
    backgroundColor: Colors.peachSoft,
  },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: Colors.primary, fontSize: 27, fontWeight: '900' },
  avatarPaw: { position: 'absolute', right: 7, bottom: 6, opacity: 0.75 },
  petInfo: { flex: 1, minWidth: 0, justifyContent: 'center', gap: 8 },
  idPetName: { color: Colors.text, fontSize: 22, lineHeight: 27, fontWeight: '900' },
  petTraits: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 5 },
  trait: {
    maxWidth: '100%',
    borderRadius: 9,
    backgroundColor: Colors.peachSoft,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  traitText: { color: Colors.subtext, fontSize: 10, lineHeight: 14, fontWeight: '700' },
  currentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    minHeight: 24,
    borderRadius: 12,
    backgroundColor: Colors.successSoft,
  },
  currentBadgeText: { color: Colors.success, fontSize: 10, fontWeight: '800' },
  idCardFooter: {
    minHeight: 44,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    paddingTop: 6,
  },
  idCodeGroup: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5, minWidth: 0 },
  idCodeLabel: { color: Colors.subtext, fontSize: 10 },
  idCode: { color: Colors.text, fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  editButton: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
});

function Trait({ label }: { label: string }) {
  return (
    <View style={styles.trait}>
      <Text style={styles.traitText} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}
