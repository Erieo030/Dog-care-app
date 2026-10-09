import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HealthEventDetailScreen from '../screens/HealthEventDetailScreen';
import HealthEventEditScreen from '../screens/HealthEventEditScreen';
import HealthEventListScreen from '../screens/HealthEventListScreen';
import HealthObservationScreen from '../screens/HealthObservationScreen';
import MedicalVisitDetailScreen from '../screens/MedicalVisitDetailScreen';
import MedicalVisitFormScreen from '../screens/MedicalVisitFormScreen';
import MedicalVisitListScreen from '../screens/MedicalVisitListScreen';
import VetMapScreen from '../features/vet-map/VetMapScreen';
import ObservationHealthEventScreen from '../screens/ObservationHealthEventScreen';
import StoolHealthEventScreen from '../screens/StoolHealthEventScreen';
import VomitingHealthEventScreen from '../screens/VomitingHealthEventScreen';
import WeightFormScreen from '../screens/WeightFormScreen';
import WeightListScreen from '../screens/WeightListScreen';
import {
  DewormingDetailScreen,
  DewormingFormScreen,
  DewormingListScreen,
} from '../features/dewormings/screens';
import {
  MedicationDetailScreen,
  MedicationFormScreen,
  MedicationListScreen,
} from '../features/medications/screens';
import {
  VaccinationDetailScreen,
  VaccinationFormScreen,
  VaccinationListScreen,
} from '../features/vaccinations/screens';
import type { HomeStackParamList } from './types';

type HomeStackNavigator = ReturnType<typeof createNativeStackNavigator<HomeStackParamList>>;

/**
 * Navigator 子項必須直接是 Screen、Group 或 Fragment。
 * 這個 helper 以函式呼叫方式回傳 Fragment，不能用 JSX 當自訂元件掛在 Navigator 下。
 */
export function renderSharedHealthScreens(Screen: HomeStackNavigator) {
  return (
    <>
      <Screen.Screen
        name="HealthObservation"
        component={HealthObservationScreen}
        options={{ title: '健康觀察' }}
      />
      <Screen.Screen
        name="HealthEventList"
        component={HealthEventListScreen}
        options={{ title: '健康異常紀錄' }}
      />
      <Screen.Screen
        name="HealthEventDetail"
        component={HealthEventDetailScreen}
        options={{ title: '健康紀錄詳細內容' }}
      />
      <Screen.Screen
        name="HealthEventEdit"
        component={HealthEventEditScreen}
        options={{ title: '' }}
      />
      <Screen.Screen
        name="VomitingHealthEvent"
        component={VomitingHealthEventScreen}
        options={{ title: '嘔吐快速紀錄' }}
      />
      <Screen.Screen
        name="StoolHealthEvent"
        component={StoolHealthEventScreen}
        options={{ title: '排便異常快速紀錄' }}
      />
      <Screen.Screen
        name="ObservationHealthEvent"
        component={ObservationHealthEventScreen}
        options={{ title: '健康異常快速紀錄' }}
      />
      <Screen.Screen
        name="WeightList"
        component={WeightListScreen}
        options={{ title: '體重紀錄' }}
      />
      <Screen.Screen
        name="VaccinationList"
        component={VaccinationListScreen}
        options={{ title: '' }}
      />
      <Screen.Screen
        name="VaccinationForm"
        component={VaccinationFormScreen}
        options={{ title: '' }}
      />
      <Screen.Screen
        name="VaccinationDetail"
        component={VaccinationDetailScreen}
        options={{ title: '' }}
      />
      <Screen.Screen name="DewormingList" component={DewormingListScreen} options={{ title: '' }} />
      <Screen.Screen name="DewormingForm" component={DewormingFormScreen} options={{ title: '' }} />
      <Screen.Screen
        name="DewormingDetail"
        component={DewormingDetailScreen}
        options={{ title: '' }}
      />
      <Screen.Screen
        name="MedicationList"
        component={MedicationListScreen}
        options={{ title: '' }}
      />
      <Screen.Screen
        name="MedicationForm"
        component={MedicationFormScreen}
        options={{ title: '' }}
      />
      <Screen.Screen
        name="MedicationDetail"
        component={MedicationDetailScreen}
        options={{ title: '' }}
      />
      <Screen.Screen name="WeightForm" component={WeightFormScreen} options={{ title: '' }} />
      <Screen.Screen
        name="MedicalVisitList"
        component={MedicalVisitListScreen}
        options={{ title: '' }}
      />
      <Screen.Screen
        name="VetMap"
        component={VetMapScreen}
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Screen.Screen
        name="MedicalVisitForm"
        component={MedicalVisitFormScreen}
        options={{ title: '' }}
      />
      <Screen.Screen
        name="MedicalVisitDetail"
        component={MedicalVisitDetailScreen}
        options={{ title: '' }}
      />
    </>
  );
}
