import React, { useState } from 'react';
import { Alert } from 'react-native';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import CreatePetScreen from './screens/CreatePetScreen';
import HomeScreen from './screens/HomeScreen';

const API_BASE_URL = 'http://192.168.0.101:8000';

export default function App() {
  const [screenMode, setScreenMode] = useState('login');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isProfileComplete, setIsProfileComplete] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);

  const [petData, setPetData] = useState({
    name: '',
    gender: '',
    breed: '',
    birthday: '',
  });

  const goToHomeOrCreatePet = (result) => {
    setCurrentUserId(result.userId);
    setIsLoggedIn(true);

    if (result.hasPet) {
      setPetData(result.petData);
      setIsProfileComplete(true);
    } else {
      setIsProfileComplete(false);
    }
  };

  const handleLogin = async (email, password) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (result.success) {
        goToHomeOrCreatePet(result);
      } else {
        Alert.alert('登入失敗', result.message || '帳號或密碼錯誤');
      }
    } catch (error) {
      console.error(error);
      Alert.alert(
        '網路錯誤',
        '無法連線至後端伺服器，請檢查 IP 或防火牆設定'
      );
    }
  };

  const handleRegister = async (email, password) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (result.success) {
        Alert.alert('註冊成功', '請建立狗狗資料 🐾');
        goToHomeOrCreatePet(result);
      } else {
        Alert.alert('註冊失敗', result.message || '無法建立帳號');
      }
    } catch (error) {
      console.error(error);
      Alert.alert(
        '網路錯誤',
        '註冊時無法連線至後端伺服器，請檢查 IP 或防火牆設定'
      );
    }
  };

  const handleCreatePet = async (data) => {
    if (!currentUserId) {
      Alert.alert('錯誤', '找不到使用者 ID，請重新登入');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/create-pet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUserId,
          ...data,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setPetData(data);
        setIsProfileComplete(true);
      } else {
        Alert.alert('儲存失敗', result.message || '無法將資料寫入資料庫');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('網路錯誤', '儲存時發生問題');
    }
  };

  const handleLogout = () => {
    setScreenMode('login');
    setIsLoggedIn(false);
    setIsProfileComplete(false);
    setCurrentUserId(null);
    setPetData({
      name: '',
      gender: '',
      breed: '',
      birthday: '',
    });
  };

  if (!isLoggedIn) {
    if (screenMode === 'register') {
      return (
        <RegisterScreen
          onRegisterSuccess={handleRegister}
          onGoToLogin={() => setScreenMode('login')}
        />
      );
    }

    return (
      <LoginScreen
        onLoginSuccess={handleLogin}
        onGoToRegister={() => setScreenMode('register')}
      />
    );
  }

  if (!isProfileComplete) {
    return <CreatePetScreen onSubmit={handleCreatePet} />;
  }

  return <HomeScreen petData={petData} onLogout={handleLogout} />;
}