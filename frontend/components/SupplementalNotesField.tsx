import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';
import { FORM_FIELD_FONT_SIZE, FORM_FIELD_RADIUS } from '../constants/FormTokens';

type Props = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  helperText?: string;
  placeholder?: string;
  maxLength?: number;
  accessibilityLabel?: string;
};

/** Unified modal editor for optional notes and other free-form multiline fields. */
export default function SupplementalNotesField({
  value,
  onChange,
  label = '補充備註',
  helperText,
  placeholder = '想補充的話可以寫在這裡',
  maxLength,
  accessibilityLabel,
}: Props) {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [draft, setDraft] = useState(value);
  const entrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    entrance.setValue(0);
    Animated.timing(entrance, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [entrance, visible]);

  const open = () => {
    setDraft(value);
    setVisible(true);
  };
  const close = (apply = false) => {
    if (apply) onChange(draft);
    Keyboard.dismiss();
    setVisible(false);
  };

  return (
    <>
      <Text style={styles.label}>{label}</Text>
      {helperText ? <Text style={styles.helperText}>{helperText}</Text> : null}
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || `編輯${label}`}
        style={styles.trigger}
        onPress={open}
      >
        <Text numberOfLines={3} style={[styles.triggerText, !value && styles.placeholder]}>
          {value || placeholder}
        </Text>
        <View style={styles.editIcon}>
          <Ionicons name="create-outline" size={20} color={Colors.primary} />
        </View>
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => close()}
      >
        <KeyboardAvoidingView
          style={styles.modalRoot}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Animated.View style={[styles.backdrop, { opacity: entrance }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="完成並關閉補充備註"
              style={StyleSheet.absoluteFill}
              onPress={() => close(true)}
            />
          </Animated.View>
          <Animated.View
            style={[
              styles.modalCard,
              {
                marginBottom: Math.max(insets.bottom, 16),
                opacity: entrance,
                transform: [
                  {
                    translateY: entrance.interpolate({
                      inputRange: [0, 1],
                      outputRange: [14, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={styles.titleGroup}>
                <Text style={styles.modalTitle}>補充備註</Text>
                <Text style={styles.modalHint}>記下想補充的內容</Text>
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="取消編輯補充備註"
                style={styles.closeButton}
                onPress={() => close()}
              >
                <Ionicons name="close" size={22} color={Colors.subtext} />
              </TouchableOpacity>
            </View>
            <TextInput
              autoFocus
              multiline
              value={draft}
              onChangeText={setDraft}
              maxLength={maxLength}
              placeholder={placeholder}
              placeholderTextColor={Colors.subtext}
              textAlignVertical="top"
              returnKeyType="default"
              style={styles.input}
            />
            {maxLength != null && (
              <Text style={styles.characterCount}>
                {draft.length}/{maxLength}
              </Text>
            )}
            <View style={styles.actions}>
              <TouchableOpacity
                accessibilityRole="button"
                style={styles.cancelButton}
                onPress={() => close()}
              >
                <Text style={styles.cancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                style={styles.saveButton}
                onPress={() => close(true)}
              >
                <Text style={styles.saveText}>完成</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  label: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 21,
    marginBottom: 8,
  },
  helperText: { color: Colors.subtext, fontSize: 12, marginBottom: 6 },
  trigger: {
    minHeight: 80,
    marginTop: 8,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: FORM_FIELD_RADIUS,
    backgroundColor: Colors.surface,
  },
  triggerText: {
    flex: 1,
    color: Colors.text,
    fontSize: FORM_FIELD_FONT_SIZE,
    lineHeight: 22,
  },
  placeholder: { color: Colors.subtext },
  editIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(39, 31, 26, 0.34)',
  },
  modalCard: {
    marginHorizontal: 18,
    padding: 20,
    borderRadius: 24,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.shadow,
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  titleGroup: { flex: 1 },
  modalTitle: { color: Colors.text, fontSize: 20, fontWeight: '800' },
  modalHint: { color: Colors.subtext, fontSize: 13, marginTop: 3 },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    minHeight: 150,
    maxHeight: 220,
    padding: 14,
    color: Colors.text,
    fontSize: FORM_FIELD_FONT_SIZE,
    lineHeight: 23,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    backgroundColor: Colors.surface,
  },
  characterCount: {
    alignSelf: 'flex-end',
    color: Colors.subtext,
    fontSize: 12,
    marginTop: 6,
  },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 26,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { color: Colors.text, fontSize: 16, fontWeight: '700' },
  saveButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 26,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
