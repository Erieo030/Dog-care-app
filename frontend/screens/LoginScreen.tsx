/** 用途：登入畫面，驗證必填欄位並提交帳密。 */
import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
} from 'react-native';
import { Colors } from '../constants/Colors';

interface LoginScreenProps {
  onLoginSuccess: (email: string, password: string) => void;
  onGoToRegister: () => void;
}

export default function LoginScreen({ onLoginSuccess, onGoToRegister }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLoginPress = () => {
    if (!email || !password) {
      Alert.alert('提示', '請輸入帳號和密碼 🐾');
      return;
    }

    onLoginSuccess(email, password);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.innerContainer}
        >
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoEmoji}>🐾</Text>
            </View>
            <Text style={styles.title}>PawLog</Text>
            <Text style={styles.subtitle}>記錄毛孩成長的每一刻</Text>
          </View>

          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="你的電子郵件"
              placeholderTextColor={Colors.subtext}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TextInput
              style={styles.input}
              placeholder="你的密碼"
              placeholderTextColor={Colors.subtext}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <TouchableOpacity style={styles.loginButton} onPress={handleLoginPress}>
              <Text style={styles.loginButtonText}>開啟紀錄之旅</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.registerLinkButton} onPress={onGoToRegister}>
              <Text style={styles.registerLinkText}>還沒有帳號？立即註冊</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  innerContainer: {
    flex: 1,
    paddingHorizontal: 35,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 50,
  },
  logoContainer: {
    width: 90,
    height: 90,
    backgroundColor: Colors.surface,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  logoEmoji: {
    fontSize: 45,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.subtext,
    marginTop: 8,
  },
  form: {
    width: '100%',
  },
  input: {
    backgroundColor: Colors.surface,
    height: 60,
    borderRadius: 18,
    paddingHorizontal: 20,
    fontSize: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.text,
  },
  loginButton: {
    backgroundColor: Colors.primary,
    height: 60,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  registerLinkButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  registerLinkText: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
});
