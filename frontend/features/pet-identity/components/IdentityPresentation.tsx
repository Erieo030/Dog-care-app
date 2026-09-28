/** 用途：毛孩身份設定與 QR 頁共用的標頭、資訊提示及視覺樣式。 */
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../../constants/Colors';
import {
  FORM_FIELD_FONT_SIZE,
  FORM_FIELD_HEIGHT,
  FORM_FIELD_LABEL_FONT_SIZE,
  FORM_FIELD_LABEL_FONT_WEIGHT,
  FORM_FIELD_PADDING_HORIZONTAL,
  FORM_FIELD_RADIUS,
  FORM_PAGE_HORIZONTAL_PADDING,
} from '../../../constants/FormTokens';

export function IdentityHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <View style={identityStyles.headerRow}>
      <View style={identityStyles.iconBadge}>
        <Ionicons name="qr-code-outline" size={24} color={Colors.primary} />
      </View>
      <View style={identityStyles.headerCopy}>
        <Text style={identityStyles.eyebrow}>{eyebrow}</Text>
        <Text style={identityStyles.title}>{title}</Text>
        <Text style={identityStyles.subtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

export function IdentityInfoBox({
  icon,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
}) {
  return (
    <View style={identityStyles.infoBox}>
      <Ionicons name={icon} size={20} color={Colors.success} />
      <Text style={identityStyles.infoText}>{text}</Text>
    </View>
  );
}

export const identityStyles = StyleSheet.create({
  page: {
    paddingHorizontal: FORM_PAGE_HORIZONTAL_PADDING,
    paddingTop: 20,
    gap: 14,
    paddingBottom: 40,
    backgroundColor: Colors.background,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  iconBadge: {
    width: 50,
    height: 50,
    borderRadius: 17,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: { flex: 1 },
  eyebrow: { color: Colors.primary, fontSize: 13, fontWeight: '800', marginBottom: 2 },
  title: { fontSize: 24, fontWeight: '800', color: Colors.text },
  subtitle: { color: Colors.subtext, fontSize: 13, lineHeight: 18, marginTop: 3 },
  petCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  petAvatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  petAvatarImage: { width: '100%', height: '100%', borderRadius: 29 },
  petInfo: { flex: 1, minWidth: 0, marginLeft: 14 },
  petName: { fontSize: 21, fontWeight: '800', color: Colors.text },
  petMeta: { color: Colors.subtext, marginTop: 3 },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: Colors.successSoft,
    borderRadius: 16,
    padding: 13,
  },
  infoText: { flex: 1, color: '#526D60', fontSize: 13, lineHeight: 20 },
  qrCard: {
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  qrFrame: { backgroundColor: '#FFF', borderRadius: 18, padding: 13 },
  qrCaption: { marginTop: 14, color: Colors.subtext, fontSize: 13 },
  primary: {
    backgroundColor: Colors.primary,
    padding: 14,
    minHeight: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryText: { color: '#fff', fontWeight: '700' },
  secondary: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.success,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  secondaryText: { color: Colors.success, fontWeight: '700' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: Colors.background,
  },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginTop: 12, color: Colors.text },
  fieldSurface: {
    gap: 14,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 15,
  },
  optionSurface: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  previewSurface: {
    backgroundColor: Colors.surfaceSoft,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    gap: 10,
  },
  previewHeading: { color: Colors.text, fontSize: 16, fontWeight: '800' },
  previewSubheading: { color: Colors.subtext, fontSize: 12, lineHeight: 18 },
  previewPetRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  previewAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  previewAvatarLabel: { color: Colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  previewPetName: { color: Colors.text, fontSize: 20, fontWeight: '800' },
  previewSectionTitle: { color: Colors.success, fontSize: 14, fontWeight: '800', marginTop: 2 },
  previewDetail: { color: Colors.subtext, fontSize: 14, lineHeight: 21 },
  previewContact: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  previewContactText: { color: Colors.text, fontSize: 14, fontWeight: '700', flex: 1 },
  previewEmpty: { color: Colors.subtext, fontSize: 13, lineHeight: 19 },
  optionRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  optionControl: {
    width: 56,
    height: 44,
    marginLeft: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  optionCopy: { flex: 1 },
  optionLabel: { fontSize: 15, fontWeight: '700', color: Colors.text },
  optionState: { fontSize: 12, color: Colors.subtext, marginTop: 3 },
  note: { color: Colors.subtext, lineHeight: 20, fontSize: 13 },
  fieldGroup: { gap: 4 },
  fieldLabel: {
    fontSize: FORM_FIELD_LABEL_FONT_SIZE,
    fontWeight: FORM_FIELD_LABEL_FONT_WEIGHT,
    color: Colors.text,
  },
  fieldHint: { fontSize: 12, color: Colors.subtext, marginBottom: 3 },
  input: {
    fontSize: FORM_FIELD_FONT_SIZE,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: FORM_FIELD_RADIUS,
    paddingHorizontal: FORM_FIELD_PADDING_HORIZONTAL,
    minHeight: FORM_FIELD_HEIGHT,
    backgroundColor: Colors.surface,
    color: Colors.text,
  },
});
