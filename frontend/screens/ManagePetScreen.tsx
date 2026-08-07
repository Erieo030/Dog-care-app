/** 用途：將既有毛孩表單接入 React Navigation，支援新增與編輯。 */
import React from 'react';
import { Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { usePet } from '../contexts/PetContext';
import { HomeStackParamList } from '../navigation/types';
import PetFormScreen from './PetFormScreen';
import { PetData } from '../types/models';

type AddProps = NativeStackScreenProps<HomeStackParamList, 'AddPet'>;
type EditProps = NativeStackScreenProps<HomeStackParamList, 'EditPet'>;

const toFormData = (data: PetData) => ({
  name: data.name,
  gender: data.gender,
  breed: data.breed,
  birthDate: data.birthday,
  adoptionDate: data.arrivalDate,
  avatarUrl: data.avatarUri,
  neutered: data.neutered,
  allergies: data.allergies,
  chronicDiseases: data.chronicDiseases,
});

export function AddPetScreen({ navigation }: AddProps) {
  const { createPet } = usePet();
  const submit = async (data: PetData) => {
    try {
      await createPet(toFormData(data));
      navigation.goBack();
    } catch (error) {
      Alert.alert('新增失敗', (error as Error).message);
    }
  };
  return (
    <PetFormScreen
      title="新增毛孩"
      submitLabel="儲存毛孩資料"
      onSubmit={submit}
      onCancel={() => navigation.goBack()}
    />
  );
}

export function EditPetScreen({ navigation }: EditProps) {
  const { selectedPet, updateSelectedPet } = usePet();
  if (!selectedPet) return null;
  const initialData: PetData = {
    name: selectedPet.name,
    gender: selectedPet.gender,
    breed: selectedPet.breed ?? '',
    birthday: selectedPet.birthDate ?? '',
    arrivalDate: selectedPet.adoptionDate ?? '',
    avatarUri: selectedPet.avatarUrl ?? '',
    neutered: selectedPet.neutered,
    allergies: selectedPet.allergies ?? '',
    chronicDiseases: selectedPet.chronicDiseases ?? '',
  };
  const submit = async (data: PetData) => {
    try {
      await updateSelectedPet(toFormData(data));
      navigation.goBack();
    } catch (error) {
      Alert.alert('更新失敗', (error as Error).message);
    }
  };
  return (
    <PetFormScreen
      title="編輯毛孩資料"
      submitLabel="儲存變更"
      initialData={initialData}
      onSubmit={submit}
      onCancel={() => navigation.goBack()}
    />
  );
}
