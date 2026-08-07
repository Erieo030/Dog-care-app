/** 管理登入狀態、目前畫面及多毛孩清單，讓 App 只負責畫面選擇。 */
import { useState } from 'react';
import { Alert } from 'react-native';

import { API_BASE_URL } from '../api/client';
import * as authService from '../services/authService';
import * as petService from '../services/petService';

export const useAppFlow = () => {
  const [screenMode, setScreenMode] = useState('login');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [pets, setPets] = useState([]);
  const [selectedPetId, setSelectedPetId] = useState(null);

  const selectedPet =
    pets.find((pet) => pet._id === selectedPetId) || pets[0] || null;

  const applySession = (result) => {
    const sessionPets = result.pets || (result.petData ? [result.petData] : []);
    setCurrentUserId(result.userId);
    setPets(sessionPets);
    setSelectedPetId(sessionPets[0]?._id || null);
    setIsLoggedIn(true);
    setScreenMode(sessionPets.length ? 'home' : 'createPet');
  };

  const runAuth = async (request, email, password, isRegistration = false) => {
    try {
      const result = await request(email, password);
      if (isRegistration) {
        Alert.alert('註冊成功', '請建立狗狗資料 🐾');
      }
      applySession(result);
    } catch (error) {
      console.error(error);
      Alert.alert(
        '操作失敗',
        `${error.message || '無法連線至後端伺服器'}\n\nAPI: ${API_BASE_URL}`
      );
    }
  };

  const handleCreatePet = async (data) => {
    if (!currentUserId) return;
    try {
      const result = await petService.createPet(currentUserId, data);
      const newPet = result.petData;
      setPets((items) => [...items, newPet]);
      setSelectedPetId(newPet._id);
      setScreenMode('home');
    } catch (error) {
      Alert.alert('新增失敗', error.message || '無法儲存毛孩資料');
    }
  };

  const handleUpdatePet = async (data) => {
    if (!currentUserId || !selectedPet?._id) return;
    try {
      const result = await petService.updatePet(
        currentUserId,
        selectedPet._id,
        data
      );
      setPets((items) =>
        items.map((pet) => (pet._id === result.petData._id ? result.petData : pet))
      );
      setScreenMode('home');
      Alert.alert('完成', '毛孩資料已更新');
    } catch (error) {
      Alert.alert('更新失敗', error.message || '無法更新毛孩資料');
    }
  };

  const handleDeletePet = () => {
    if (!currentUserId || !selectedPet?._id) return;
    Alert.alert('刪除毛孩', `確定要刪除 ${selectedPet.name} 的資料嗎？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '刪除',
        style: 'destructive',
        onPress: async () => {
          try {
            await petService.deletePet(currentUserId, selectedPet._id);
            const remaining = pets.filter((pet) => pet._id !== selectedPet._id);
            setPets(remaining);
            setSelectedPetId(remaining[0]?._id || null);
            setScreenMode(remaining.length ? 'home' : 'createPet');
          } catch (error) {
            Alert.alert('刪除失敗', error.message || '無法刪除毛孩資料');
          }
        },
      },
    ]);
  };

  const handleLogout = () => {
    setScreenMode('login');
    setIsLoggedIn(false);
    setCurrentUserId(null);
    setPets([]);
    setSelectedPetId(null);
  };

  return {
    screenMode,
    isLoggedIn,
    pets,
    selectedPet,
    showLogin: () => setScreenMode('login'),
    showRegister: () => setScreenMode('register'),
    showCreatePet: () => setScreenMode('createPet'),
    showEditPet: () => setScreenMode('editPet'),
    showHome: () => setScreenMode('home'),
    selectPet: setSelectedPetId,
    handleLogin: (email, password) =>
      runAuth(authService.login, email, password),
    handleRegister: (email, password) =>
      runAuth(authService.register, email, password, true),
    handleCreatePet,
    handleUpdatePet,
    handleDeletePet,
    handleLogout,
  };
};
