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
  ScrollView,
} from 'react-native';
import { Colors } from '../constants/Colors';
import { Ionicons } from '@expo/vector-icons';

interface RegisterScreenProps {
  onRegisterSuccess: (email: string, password: string) => void;
  onGoToLogin: () => void;
}

export default function RegisterScreen({ onRegisterSuccess, onGoToLogin }: RegisterScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
    <View style={styles.background}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.root}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <ScrollView
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <TouchableOpacity style={styles.backButton} onPress={onGoToLogin} hitSlop={8}>
                <Ionicons name="chevron-back" size={22} color={Colors.text} />
              </TouchableOpacity>
              <View style={styles.hero}>
                <View style={styles.heroMark}><Ionicons name="paw" size={30} color={Colors.primary} /></View>
                <Text style={styles.brand}>MEGO</Text>
                <Text style={styles.title}>建立帳號</Text>
                <Text style={styles.subtitle}>開始記錄毛孩生活</Text>
              </View>
              <View style={styles.form}>
                <View style={styles.inputShell}>
                  <Ionicons name="mail-outline" size={21} color={Colors.subtext} />
                  <TextInput style={styles.input} placeholder="你的電子郵件" placeholderTextColor={Colors.subtext} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
                </View>
                <View style={styles.inputShell}>
                  <Ionicons name="lock-closed-outline" size={21} color={Colors.subtext} />
                  <TextInput style={styles.input} placeholder="你的密碼" placeholderTextColor={Colors.subtext} value={password} onChangeText={setPassword} secureTextEntry={!showPassword} />
                  <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword((value) => !value)} accessibilityRole="button" accessibilityLabel={showPassword ? '隱藏密碼' : '顯示密碼'}>
                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={21} color={Colors.subtext} />
                  </TouchableOpacity>
                </View>
                <View style={styles.inputShell}>
                  <Ionicons name="shield-checkmark-outline" size={21} color={Colors.subtext} />
                  <TextInput style={styles.input} placeholder="再次輸入密碼" placeholderTextColor={Colors.subtext} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry={!showConfirmPassword} />
                  <TouchableOpacity style={styles.eyeButton} onPress={() => setShowConfirmPassword((value) => !value)} accessibilityRole="button" accessibilityLabel={showConfirmPassword ? '隱藏確認密碼' : '顯示確認密碼'}>
                    <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={21} color={Colors.subtext} />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.registerButton} onPress={handleRegisterPress}>
                  <Text style={styles.registerButtonText}>註冊帳號</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.loginLinkButton} onPress={onGoToLogin}>
                  <Text style={styles.loginSecondary}>已有帳號？ </Text>
                  <Text style={styles.loginAccent}>立即登入</Text>
                  <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
                </TouchableOpacity>
              </View>
            </ScrollView>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: Colors.background },
  safeArea: { flex: 1, backgroundColor: Colors.background },
  root: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 28, paddingTop: 18, paddingBottom: 32 },
  backButton: { width: 44, height: 44, alignItems: 'flex-start', justifyContent: 'center' },
  hero: { alignItems: 'center', marginTop: 8, marginBottom: 24 },
  heroMark: { width: 64, height: 64, borderRadius: 22, backgroundColor: '#F7E4D8', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  brand: { fontSize: 30, fontWeight: '800', letterSpacing: 2, color: Colors.text, marginBottom: 8 },
  title: { fontSize: 26, fontWeight: '700', color: Colors.text },
  subtitle: { marginTop: 8, fontSize: 15, color: Colors.subtext },
  form: { width: '100%', maxWidth: 480, alignSelf: 'center', gap: 12 },
  inputShell: { height: 56, flexDirection: 'row', alignItems: 'center', borderRadius: 20, borderWidth: 1, borderColor: '#E8DDD4', backgroundColor: 'rgba(255,255,255,0.78)', paddingHorizontal: 18 },
  input: { flex: 1, height: '100%', paddingHorizontal: 12, fontSize: 16, color: Colors.text },
  eyeButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  registerButton: { height: 56, marginTop: 8, borderRadius: 28, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.primary },
  registerButtonText: { color: '#FFF9F1', fontSize: 18, fontWeight: '700' },
  loginLinkButton: { minHeight: 44, marginTop: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  loginSecondary: { color: Colors.subtext, fontSize: 15 },
  loginAccent: { color: Colors.primary, fontSize: 15, fontWeight: '700' },
});
