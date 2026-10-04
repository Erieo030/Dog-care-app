/** 用途：以輕量原生版面登入，鍵盤開啟時保持欄位與送出按鈕可操作。 */
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';

const LOGIN_DOG = require('../assets/artwork/auth/login-dog-v1.webp');
const LOGIN_PAW = require('../assets/artwork/auth/login-paw-v1.webp');

interface LoginScreenProps {
  onLoginSuccess: (email: string, password: string) => void | Promise<void>;
  onGoToRegister: () => void;
}

export default function LoginScreen({ onLoginSuccess, onGoToRegister }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const dogEntrance = useRef(new Animated.Value(0)).current;
  const dogFloat = useRef(new Animated.Value(0)).current;
  const loadingPawTurn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const keyboardHideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    });
    return () => keyboardHideSubscription.remove();
  }, []);

  useEffect(() => {
    const entrance = Animated.timing(dogEntrance, {
      toValue: 1,
      duration: 520,
      delay: 100,
      useNativeDriver: true,
    });
    const floating = Animated.loop(
      Animated.sequence([
        Animated.timing(dogFloat, { toValue: -5, duration: 1700, useNativeDriver: true }),
        Animated.timing(dogFloat, { toValue: 0, duration: 1700, useNativeDriver: true }),
      ]),
    );
    entrance.start();
    floating.start();
    return () => {
      entrance.stop();
      floating.stop();
    };
  }, [dogEntrance, dogFloat]);

  useEffect(() => {
    if (!isSubmitting) {
      loadingPawTurn.setValue(0);
      return;
    }
    const spinning = Animated.loop(
      Animated.timing(loadingPawTurn, { toValue: 1, duration: 900, useNativeDriver: true }),
    );
    spinning.start();
    return () => spinning.stop();
  }, [isSubmitting, loadingPawTurn]);

  const revealFormForKeyboard = () => {
    // KeyboardAvoidingView 先騰出空間，再將整個表單帶入可視區，避免欄位被遮住。
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
  };

  const handleLoginPress = async () => {
    if (!email || !password) {
      Alert.alert('提示', '請輸入帳號和密碼 🐾');
      return;
    }
    setIsSubmitting(true);
    try {
      await onLoginSuccess(email, password);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoiding}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <Animated.Image
              source={LOGIN_PAW}
              accessibilityElementsHidden
              style={[styles.decorativePaw, styles.decorativePawLeft]}
            />
            <Animated.Image
              source={LOGIN_PAW}
              accessibilityElementsHidden
              style={[styles.decorativePaw, styles.decorativePawRight]}
            />
            <Animated.Image
              source={LOGIN_DOG}
              accessibilityLabel="友善狗狗插畫"
              style={[
                styles.dogArtwork,
                {
                  opacity: dogEntrance,
                  transform: [
                    {
                      translateY: Animated.add(
                        dogFloat,
                        dogEntrance.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }),
                      ),
                    },
                  ],
                },
              ]}
            />
            <Text style={styles.brandName}>MEGO</Text>
            <Text style={styles.brandSlogan}>記錄毛孩成長的每一刻</Text>
          </View>

          <View style={styles.formSection}>
            <Text style={styles.welcomeTitle}>歡迎回來</Text>
            <Text style={styles.welcomeSubtitle}>登入後，繼續陪伴毛孩的每一天。</Text>

            <View style={styles.form}>
              <View style={styles.inputShell}>
                <Ionicons name="mail-outline" size={21} color={Colors.subtext} />
                <TextInput
                  style={styles.input}
                  placeholder="你的電子郵件"
                  placeholderTextColor={Colors.subtext}
                  value={email}
                  onChangeText={setEmail}
                  onFocus={revealFormForKeyboard}
                  editable={!isSubmitting}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordInputRef.current?.focus()}
                />
              </View>

              <View style={styles.inputShell}>
                <Ionicons name="lock-closed-outline" size={21} color={Colors.subtext} />
                <TextInput
                  ref={passwordInputRef}
                  style={styles.input}
                  placeholder="你的密碼"
                  placeholderTextColor={Colors.subtext}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={revealFormForKeyboard}
                  editable={!isSubmitting}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleLoginPress}
                />
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? '隱藏密碼' : '顯示密碼'}
                  style={styles.visibilityButton}
                  onPress={() => setShowPassword((visible) => !visible)}
                  disabled={isSubmitting}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={21}
                    color={Colors.subtext}
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                accessibilityRole="button"
                accessibilityState={{ disabled: isSubmitting, busy: isSubmitting }}
                style={[styles.loginButton, isSubmitting && styles.loginButtonSubmitting]}
                onPress={handleLoginPress}
                disabled={isSubmitting}
              >
                {isSubmitting && (
                  <Animated.Image
                    source={LOGIN_PAW}
                    accessibilityElementsHidden
                    style={[
                      styles.loadingPaw,
                      {
                        transform: [
                          {
                            rotate: loadingPawTurn.interpolate({
                              inputRange: [0, 1],
                              outputRange: ['0deg', '360deg'],
                            }),
                          },
                        ],
                      },
                    ]}
                  />
                )}
                <Text style={styles.loginButtonText}>
                  {isSubmitting ? '正在登入…' : '開啟紀錄之旅'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                accessibilityRole="button"
                style={styles.registerLinkButton}
                onPress={onGoToRegister}
                disabled={isSubmitting}
              >
                <Text style={styles.registerSecondary}>還沒有帳號？</Text>
                <Text style={styles.registerAccent}>立即註冊</Text>
                <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  keyboardAvoiding: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: 30,
    paddingTop: 26,
    paddingBottom: 28,
  },
  hero: { alignItems: 'center', paddingTop: 2, paddingBottom: 30 },
  dogArtwork: { width: 142, height: 142, resizeMode: 'contain' },
  decorativePaw: {
    position: 'absolute',
    width: 31,
    height: 31,
    opacity: 0.19,
    resizeMode: 'contain',
  },
  decorativePawLeft: { left: '14%', top: 25, transform: [{ rotate: '-18deg' }] },
  decorativePawRight: { right: '15%', bottom: 33, transform: [{ rotate: '20deg' }] },
  brandName: {
    marginTop: 3,
    color: Colors.primary,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 2.6,
  },
  brandSlogan: { marginTop: 7, color: Colors.subtext, fontSize: 14 },
  formSection: { width: '100%', maxWidth: 480, alignSelf: 'center' },
  welcomeTitle: { color: Colors.text, fontSize: 25, fontWeight: '800' },
  welcomeSubtitle: { color: Colors.subtext, fontSize: 15, lineHeight: 22, marginTop: 7 },
  form: { marginTop: 27, gap: 15 },
  inputShell: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 18,
    paddingRight: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: 'rgba(255,255,255,0.72)',
  },
  input: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 12,
    color: Colors.text,
    fontSize: 16,
  },
  visibilityButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButton: {
    height: 56,
    marginTop: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    gap: 8,
  },
  loginButtonSubmitting: { opacity: 0.88 },
  loginButtonText: { color: '#FFF9F1', fontSize: 18, fontWeight: '700', letterSpacing: 0.3 },
  loadingPaw: { width: 22, height: 22, resizeMode: 'contain', tintColor: '#FFF9F1' },
  registerLinkButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    marginTop: 2,
  },
  registerSecondary: { color: Colors.subtext, fontSize: 15 },
  registerAccent: { color: Colors.primary, fontSize: 15, fontWeight: '700' },
});
