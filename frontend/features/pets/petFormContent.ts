export type PetTextFieldKey =
  | 'name'
  | 'breed'
  | 'birthday'
  | 'arrivalDate'
  | 'allergies'
  | 'chronicDiseases'
  | 'microchipNumber'
  | 'coatColor'
  | 'distinctiveFeatures';

export type PetFormTextField = {
  key: PetTextFieldKey;
  label: string;
  placeholder: string;
  multiline?: boolean;
};

export const PET_FORM_FIELDS: PetFormTextField[] = [
  { key: 'name', label: '毛孩姓名（必填）', placeholder: '例如：Kuro' },
  { key: 'breed', label: '品種（必填）', placeholder: '例如：柴犬、米克斯' },
  { key: 'birthday', label: '出生日期', placeholder: '不知道可留空：YYYY-MM-DD' },
  { key: 'arrivalDate', label: '到家日期（必填）', placeholder: 'YYYY-MM-DD' },
  { key: 'allergies', label: '過敏資訊', placeholder: '沒有可留空', multiline: true },
  { key: 'chronicDiseases', label: '慢性病', placeholder: '沒有可留空', multiline: true },
  { key: 'microchipNumber', label: '晶片號碼', placeholder: '可留空' },
  { key: 'coatColor', label: '毛色', placeholder: '例如：黑色' },
  {
    key: 'distinctiveFeatures',
    label: '明顯特徵',
    placeholder: '例如：胸口有白毛',
    multiline: true,
  },
];
