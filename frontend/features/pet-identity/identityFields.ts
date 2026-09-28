/** 用途：毛孩身份 QR 的預設公開範圍與欄位文案。 */
import type { LostProfile } from '../../services/lostPetService';

export const DEFAULT_PROFILE: Omit<LostProfile, 'publicToken'> = {
  enabled: false,
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  showBreed: true,
  showSex: true,
  showNeutered: false,
  showCoatColor: true,
  showDistinctiveFeatures: true,
  showAvatar: true,
  showContactName: true,
  showContactEmail: false,
  showContactPhone: true,
  showAlternatePhone: false,
  showContactMessage: true,
  lostMode: false,
};

export const contactFields = [
  ['contactName', '聯絡人姓名（選填）', '可選擇是否顯示在掃描頁'],
  ['contactEmail', 'Email（選填）', '公開後，掃描者可直接寄送 Email'],
  ['contactPhone', '主要電話（選填）', '公開後，掃描者可直接撥打電話'],
  ['alternatePhone', '備用電話（選填）', '適合填寫其他照護者的聯絡電話'],
  ['contactMessage', '給掃描者的聯絡提醒（選填）', '例如：請先傳簡訊，若未回覆再來電'],
] as const;

export const petVisibilityFields = [
  ['showBreed', '品種'],
  ['showSex', '性別'],
  ['showNeutered', '結紮狀態'],
  ['showCoatColor', '毛色'],
  ['showDistinctiveFeatures', '明顯特徵'],
  ['showAvatar', '毛孩照片'],
] as const;

export const contactVisibilityFields = [
  ['showContactName', '聯絡人姓名'],
  ['showContactPhone', '主要電話'],
  ['showAlternatePhone', '備用電話'],
  ['showContactEmail', 'Email'],
  ['showContactMessage', '聯絡留言'],
] as const;

export type VisibilityKey =
  | (typeof petVisibilityFields)[number][0]
  | (typeof contactVisibilityFields)[number][0];
