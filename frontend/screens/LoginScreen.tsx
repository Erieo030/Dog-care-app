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
  ImageBackground,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';

interface LoginScreenProps {
  onLoginSuccess: (email: string, password: string) => void;
  onGoToRegister: () => void;
}

export default function LoginScreen({
  onLoginSuccess,
  onGoToRegister,
}: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { height: viewportHeight } = useWindowDimensions();
  const panelTop = Math.min(Math.max(viewportHeight * 0.38, 250), 360);

  const handleCreateAccountPress = () => onGoToRegister();

  const handleLoginPress = () => {
    if (!email || !password) {
      Alert.alert('提示', '請輸入帳號和密碼 🐾');
      return;
    }

    onLoginSuccess(email, password);
  };

  return (
    <ImageBackground source={require('../assets/home-scene/login.webp')} style={styles.background} imageStyle={styles.backgroundImage}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.root}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.pageContent}>
              <View style={styles.heroBrand}>
                <Text style={styles.heroBrandName}>MEGO</Text>
                <Text style={styles.heroBrandSubtitle}>記錄毛孩成長的每一刻</Text>
              </View>
              <View style={[styles.loginPanelBackdrop, { top: panelTop }]} accessibilityElementsHidden />
                  <View style={[styles.loginContent, { top: panelTop + 178 }]}>
                <View style={styles.form}>
                  <View style={styles.inputShell}>
                    <Ionicons
                      name="mail-outline"
                      size={21}
                      color={Colors.subtext}
                    />

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
                  </View>

                  <View style={styles.inputShell}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={21}
                      color={Colors.subtext}
                    />

                    <TextInput
                      style={styles.input}
                      placeholder="你的密碼"
                      placeholderTextColor={Colors.subtext}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                    />

                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel={
                        showPassword ? '隱藏密碼' : '顯示密碼'
                      }
                      hitSlop={10}
                      onPress={() =>
                        setShowPassword((visible) => !visible)
                      }
                    >
                      <Ionicons
                        name={
                          showPassword
                            ? 'eye-off-outline'
                            : 'eye-outline'
                        }
                        size={21}
                        color={Colors.subtext}
                      />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={styles.registerLinkButton}
                    onPress={handleCreateAccountPress}
                  >
                    <Text style={styles.registerSecondary}>
                      沒有帳號？{' '}
                    </Text>

                    <Text style={styles.registerAccent}>
                      建立帳號
                    </Text>

                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={Colors.primary}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.loginButton}
                    onPress={handleLoginPress}
                  >
                    <Text style={styles.loginButtonText}>
                      開啟紀錄之旅
                    </Text>
                  </TouchableOpacity>

                  </View>
                </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: Colors.background },
  backgroundImage: { resizeMode: 'cover' },


  safeArea: {
    flex: 1,
  },

  root: {
    flex: 1,
  },

  pageContent: { flex: 1, position: 'relative' },
  heroBrand: { position: 'absolute', top: 42, left: 0, right: 0, alignItems: 'center' },
  heroBrandName: { fontSize: 34, fontWeight: '800', letterSpacing: 2, color: Colors.text },
  heroBrandSubtitle: { marginTop: 8, fontSize: 15, color: Colors.subtext },

  loginPanelBackdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },

  loginContent: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 30,
    paddingBottom: 20,
  },


  form: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    gap: 8,
  },

  inputShell: {
    height: 56,

    flexDirection: 'row',
    alignItems: 'center',

    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#E5CFC0',

    backgroundColor: 'rgba(255,255,255,0.55)',

    paddingHorizontal: 18,
  },

  input: {
    flex: 1,
    height: '100%',

    paddingHorizontal: 12,

    fontSize: 16,
    color: Colors.text,
  },

  loginButton: {
    height: 56,

    marginTop: 4,

    borderRadius: 28,

    justifyContent: 'center',
    alignItems: 'center',

    backgroundColor: Colors.primary,
  },

  loginButtonText: {
    color: '#FFF9F1',
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  registerLinkButton: {
    minHeight: 44,

    marginTop: 0,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  registerSecondary: {
    color: '#8A7165',
    fontSize: 15,
  },

  registerAccent: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
});
