import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SoftButton, SoftEntrance } from '../../../components/SoftMotion';
import { Colors } from '../../../constants/Colors';
import type { HomeTheme } from '../../../constants/HomeThemes';
import type { Pet } from '../../../types';
import { calculatePetAge } from '../homeContent';
import AuthenticatedPetAvatar from '../../../components/AuthenticatedPetAvatar';

type Props = {
  selectedPet: Pet;
  pets: Pet[];
  theme: HomeTheme;
  compact: boolean;
  onEdit: () => void;
  onOpenPetSelector: () => void;
};

export function HomePetHeader({ selectedPet, pets, theme, compact, onEdit, onOpenPetSelector }: Props) {
  return (
    <SoftEntrance
      key={selectedPet.id}
      style={[styles.headerSurface, compact && styles.headerCompact]}
    >
      <Text style={[styles.pageTitle, compact && styles.pageTitleCompact]}>今天也一起好好生活</Text>
      <View accessible={false} style={[styles.titleAccent, { backgroundColor: theme.accent }]} />
      <Text style={styles.titleCaption}>把每天的照顧，變成安心的陪伴。</Text>
      <SoftButton
        accessibilityRole="button"
        accessibilityLabel="編輯目前毛孩"
        style={[styles.petSummary, compact && styles.petSummaryCompact]}
        onPress={onEdit}
      >
        {selectedPet.avatarAttachmentId ? (
          <AuthenticatedPetAvatar
            attachmentId={selectedPet.avatarAttachmentId}
            userId={selectedPet.userId}
            style={[styles.avatarSmall, compact && styles.avatarCompact]}
            fallback={(
              <View style={[styles.avatarFallbackSmall, compact && styles.avatarCompact]}>
                <Ionicons name="paw" size={21} color={Colors.primary} />
              </View>
            )}
          />
        ) : (
          <View style={[styles.avatarFallbackSmall, compact && styles.avatarCompact]}>
            <Ionicons name="paw" size={21} color={Colors.primary} />
          </View>
        )}
        <View style={styles.flex}>
          <Text style={styles.petNameSmall} numberOfLines={1}>
            {selectedPet.name}
          </Text>
          <Text style={styles.mutedSmall} numberOfLines={1}>
            {selectedPet.breed || '品種未設定'} · {calculatePetAge(selectedPet.birthDate)}
          </Text>
        </View>
        <View style={[styles.editIcon, { backgroundColor: theme.iconSurface }]}>
          <Ionicons name="pencil-outline" size={17} color={theme.iconColor} />
        </View>
      </SoftButton>
      {pets.length > 1 && (
        <SoftButton
          accessibilityRole="button"
          accessibilityLabel={`切換毛孩，目前是${selectedPet.name}`}
          style={styles.switchButton}
          onPress={onOpenPetSelector}
        >
          <Ionicons name="swap-horizontal-outline" size={18} color={theme.iconColor} />
          <Text style={[styles.switchButtonText, { color: theme.iconColor }]}>切換毛孩</Text>
          <Ionicons name="chevron-down" size={15} color={theme.iconColor} />
        </SoftButton>
      )}
    </SoftEntrance>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  headerSurface: {
    backgroundColor: 'transparent',
    padding: 0,
    marginBottom: 12,
    alignItems: 'center',
  },
  headerCompact: { marginBottom: 10 },
  pageTitle: {
    color: Colors.text,
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '800',
    marginTop: 3,
    textAlign: 'center',
    textShadowColor: 'rgba(255,250,242,0.72)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  pageTitleCompact: { fontSize: 20, lineHeight: 27, marginTop: 0 },
  titleAccent: {
    width: 68,
    height: 3,
    borderRadius: 3,
    marginTop: 3,
    marginBottom: 5,
    transform: [{ rotate: '-2deg' }],
    opacity: 0.82,
  },
  titleCaption: {
    color: Colors.subtext,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 8,
    textAlign: 'center',
  },
  petSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,250,242,0.88)',
    borderColor: 'rgba(255,255,255,0.76)',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 24,
    paddingVertical: 8,
    paddingHorizontal: 11,
    marginTop: 0,
    width: '100%',
    minHeight: 64,
  },
  petSummaryCompact: { minHeight: 58, paddingVertical: 6 },
  avatarSmall: { width: 44, height: 44, borderRadius: 16 },
  avatarCompact: { width: 40, height: 40 },
  avatarFallbackSmall: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  petNameSmall: { fontSize: 17, fontWeight: '800', color: Colors.text },
  mutedSmall: { color: Colors.subtext, fontSize: 13, marginTop: 2 },
  editIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  switchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: 7,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: 'rgba(255,250,242,0.82)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  switchButtonText: { fontSize: 13, lineHeight: 18, fontWeight: '800' },
});
