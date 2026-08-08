/** 用途：管理首次登入但尚未建立毛孩時的設定流程。 */
import React from 'react';
import { Alert } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { usePet } from '../contexts/PetContext';
import CreatePetScreen from '../screens/CreatePetScreen';
import { PetData } from '../types';
import { PetSetupStackParamList } from './types';

const Stack = createNativeStackNavigator<PetSetupStackParamList>();

export default function PetSetupStack() {
  const { createPet } = usePet();

  const handleCreate = async (data: PetData) => {
    try {
      await createPet({
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
    } catch (error) {
      Alert.alert('新增失敗', (error as Error).message);
    }
  };

  return (
    <Stack.Navigator id="PetSetupStack">
      <Stack.Screen name="CreatePet" options={{ title: '建立毛孩資料', headerBackVisible: false }}>
        {() => <CreatePetScreen onSubmit={handleCreate} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
