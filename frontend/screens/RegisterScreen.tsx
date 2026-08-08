/** 用途：註冊畫面，驗證帳密與確認密碼。 */
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

interface RegisterScreenProps {
  onRegisterSuccess: (email: string, password: string) => void;
  onGoToLogin: () => void;
}

export default function RegisterScreen({ onRegisterSuccess, onGoToLogin }: RegisterScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleRegisterPress = () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert('提示', '請完整填寫註冊資料 🐾');
      return;
    }

    if (password.length < 8) {
      Alert.alert('提示', '密碼至少需要 8 個字元');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('提示', '兩次輸入的密碼不一致');
      return;
    }

    onRegisterSuccess(email, password);
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
              <Text style={styles.logoEmoji}>🐶</Text>
            </View>
            <Text style={styles.title}>建立帳號</Text>
            <Text style={styles.subtitle}>開始記錄毛孩生活</Text>
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

            <TextInput
              style={styles.input}
              placeholder="再次輸入密碼"
              placeholderTextColor={Colors.subtext}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />

            <TouchableOpacity style={styles.registerButton} onPress={handleRegisterPress}>
              <Text style={styles.registerButtonText}>註冊帳號</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.loginLinkButton} onPress={onGoToLogin}>
              <Text style={styles.loginLinkText}>已經有帳號？返回登入</Text>
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
  registerButton: {
    backgroundColor: Colors.primary,
    height: 60,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loginLinkButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  loginLinkText: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
});
