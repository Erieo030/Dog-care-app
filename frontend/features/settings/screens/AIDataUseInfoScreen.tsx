/** 用途：提供 MEGO AI 資料使用方式的唯讀說明。 */
import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Text, View, StyleSheet } from 'react-native';
import { SettingsPage, settingsPalette } from '../components/SettingsLayout';

const sections = [
  {
    title: '會送出哪些資料？',
    body: '你輸入的問題會送到 MEGO 設定的 AI 服務，以產生回答。若問題需要個人化照護資訊，MEGO 會依問題選取必要的毛孩資料，例如基本資料、過敏或慢性病資訊，以及相關的日常、健康、就醫、用藥、疫苗、驅蟲或提醒紀錄。',
  },
  {
    title: '什麼時候會使用毛孩紀錄？',
    body: '一般生活問題不會附帶毛孩紀錄。當問題提到毛孩個人狀況或照護紀錄時，系統才會選取可能相關的資料；未使用的紀錄類別不會一併提供。',
  },
  {
    title: '如何開始使用？',
    body: '第一次開始 MEGO AI 對話前，會先顯示資料使用確認。只有按下「我了解，繼續使用 MEGO AI」後，才會開始送出問題與必要資料；選擇稍後或關閉視窗，不會送出資料，也不會消耗 AI 次數。',
  },
  {
    title: '使用提醒',
    body: 'AI 回覆可能不完整或不正確，不是獸醫診斷、處方或緊急醫療服務。涉及症狀、治療或用藥，請向獸醫確認；疑似中毒、呼吸困難、昏厥等急症，請立即聯絡動物醫院。',
  },
];

export function AIDataUseInfoScreen() {
  return (
    <SettingsPage>
      <View style={styles.hero}>
        <View style={styles.icon}>
          <Ionicons name="lock-closed-outline" size={23} color={settingsPalette.primary} />
        </View>
        <Text style={styles.title}>MEGO AI 資料使用說明</Text>
        <Text style={styles.subtitle}>供你隨時查看 AI 問答與毛孩資料的使用方式。</Text>
      </View>
      {sections.map((section, index) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.number}>{String(index + 1).padStart(2, '0')}</Text>
          <View style={styles.copy}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.body}>{section.body}</Text>
          </View>
        </View>
      ))}
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  hero: { padding: 18, borderRadius: 20, backgroundColor: '#FFF', borderWidth: 1, borderColor: settingsPalette.border, marginBottom: 14 },
  icon: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#F3E1D5', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  title: { color: settingsPalette.text, fontSize: 21, fontWeight: '800' },
  subtitle: { color: settingsPalette.sub, fontSize: 14, lineHeight: 21, marginTop: 6 },
  section: { flexDirection: 'row', padding: 16, borderRadius: 18, backgroundColor: '#FFF', borderWidth: 1, borderColor: settingsPalette.border, marginBottom: 10 },
  number: { color: settingsPalette.primary, fontSize: 12, fontWeight: '800', marginRight: 12, marginTop: 2 },
  copy: { flex: 1 },
  sectionTitle: { color: settingsPalette.text, fontSize: 15, fontWeight: '800', marginBottom: 6 },
  body: { color: settingsPalette.sub, fontSize: 14, lineHeight: 22 },
});
