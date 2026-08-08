/** 新增毛孩畫面：沿用共用表單，保留原本元件名稱與呼叫方式。 */
import React from 'react';

import PetFormScreen from './PetFormScreen';
import { PetData } from '../types';

interface CreatePetScreenProps {
  onSubmit: (data: PetData) => void;
  onCancel?: () => void;
}

export default function CreatePetScreen(props: CreatePetScreenProps) {
  return (
    <PetFormScreen
      title="建立毛孩檔案 🐾"
      submitLabel="儲存毛孩資料"
      onSubmit={props.onSubmit}
      onCancel={props.onCancel}
    />
  );
}
