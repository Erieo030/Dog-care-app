/** 用途：設定資料範圍、追蹤匯出進度，並分享或儲存完成檔案。 */
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { AppButton } from '../components/AppButton';
import { Colors } from '../constants/Colors';
import { useAuth } from '../contexts/AuthContext';
import { usePet } from '../contexts/PetContext';
import * as exportService from '../services/exportService';
import { useTabContentBottomPadding } from '../components/navigation/useTabContentBottomPadding';
import { ExportJob, ExportPeriod, ExportScope } from '../types';
const periods: [ExportPeriod, string][] = [
  ['30_days', '最近 30 天'],
  ['90_days', '最近 90 天'],
  ['all', '全部'],
];
const Choice = ({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) => (
  <TouchableOpacity onPress={onPress} style={[styles.choice, active && styles.choiceActive]}>
    <Text style={[styles.choiceText, active && styles.choiceTextActive]}>{label}</Text>
  </TouchableOpacity>
);
export default function ExportCenterScreen() {
  const isFocused = useIsFocused();
  const bottomContentPadding = useTabContentBottomPadding();
  const { session } = useAuth();
  const { selectedPet } = usePet();
  const [scope, setScope] = useState<ExportScope>('current_pet');
  const [period, setPeriod] = useState<ExportPeriod>('30_days');
  const [job, setJob] = useState<ExportJob | null>(null);
  const [sharing, setSharing] = useState(false);
  const requestRef = useRef<(() => Promise<void>) | undefined>(undefined);
  const run = async () => {
    if (!session?.userId || (scope === 'current_pet' && !selectedPet)) {
      Alert.alert('無法匯出', '請先選擇毛孩');
      return;
    }
    try {
      setJob(null);
      const result = await exportService.createExport(session.userId, {
        format: 'pdf',
        scope,
        petId: scope === 'current_pet' ? selectedPet?.id : undefined,
        period,
        includeAiSummary: true,
      });
      setJob(result);
    } catch (e) {
      Alert.alert('匯出失敗', (e as Error).message);
    }
  };
  requestRef.current = run;
  useEffect(() => {
    if (!isFocused || !session?.userId || !job || !['queued', 'processing'].includes(job.status))
      return;
    const controller = new AbortController();
    const timer = setTimeout(
      () =>
        exportService
          .getExport(session.userId, job.id, controller.signal)
          .then((updatedJob) => {
            if (!controller.signal.aborted) setJob(updatedJob);
          })
          .catch((e) => {
            if (!controller.signal.aborted)
              setJob((x) => (x ? { ...x, status: 'failed', error: (e as Error).message } : x));
          }),
      900,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [isFocused, job, session?.userId]);
  const share = async () => {
    if (!session?.userId || !job) return;
    try {
      setSharing(true);
      await exportService.downloadAndShareExport(session.userId, job);
      Alert.alert('分享成功 🐾', '照護報告已準備好，帶著 MEGO 一起照顧毛孩吧！');
    } catch (e) {
      Alert.alert('檔案處理失敗', (e as Error).message);
    } finally {
      setSharing(false);
    }
  };
  const cancel = async () => {
    if (session?.userId && job) setJob(await exportService.cancelExport(session.userId, job.id));
  };
  const busy = job && ['queued', 'processing'].includes(job.status);
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomContentPadding }]}>
        <View style={styles.intro}>
          <View style={styles.introIcon}>
            <Ionicons name="document-text-outline" size={24} color={Colors.primary} />
          </View>
          <View style={styles.introCopy}>
            <Text style={styles.eyebrow}>照護資料</Text>
            <Text style={styles.title}>整理成照護報告</Text>
            <Text style={styles.lead}>方便自己保存，或帶給獸醫參考。</Text>
          </View>
        </View>
        <View style={styles.infoCard}>
          <View style={styles.infoHeading}>
            <View style={styles.infoIcon}>
              <Ionicons name="document-text-outline" size={20} color={Colors.primary} />
            </View>
            <Text style={styles.infoTitle}>PDF 健康照護報告</Text>
          </View>
          <Text style={styles.muted}>適合日常查看、保存，或帶給獸醫參考。</Text>
        </View>
        <Text style={styles.label}>毛孩範圍</Text>
        <View style={styles.wrap}>
          <Choice
            active={scope === 'current_pet'}
            label={`目前毛孩${selectedPet ? `：${selectedPet.name}` : ''}`}
            onPress={() => setScope('current_pet')}
          />
          <Choice
            active={scope === 'all_pets'}
            label="所有毛孩"
            onPress={() => setScope('all_pets')}
          />
        </View>
        <Text style={styles.label}>日期範圍</Text>
        <View style={styles.wrap}>
          {periods.map(([v, l]) => (
            <Choice key={v} active={period === v} label={l} onPress={() => setPeriod(v)} />
          ))}
        </View>
        <AppButton
          variant="primary"
          disabled={!!busy}
          busy={!!busy}
          onPress={run}
          style={[styles.primary, busy && styles.disabled]}
          accessibilityLabel={busy ? '正在建立 PDF 報告' : '建立 PDF 報告'}
        >
          <Ionicons
            name={busy ? 'hourglass-outline' : 'arrow-down-circle-outline'}
            size={19}
            color="#FFF"
          />
          <Text style={styles.primaryText}>{busy ? '匯出中…' : '建立 PDF 報告'}</Text>
        </AppButton>
        {job && (
          <View style={styles.status}>
            <View style={styles.statusHeading}>
              <View style={styles.statusIcon}>
                <Ionicons
                  name={
                    job.status === 'completed'
                      ? 'checkmark'
                      : job.status === 'failed'
                        ? 'alert-outline'
                        : job.status === 'cancelled'
                          ? 'close'
                          : 'hourglass-outline'
                  }
                  size={18}
                  color={job.status === 'failed' ? Colors.danger : Colors.primary}
                />
              </View>
              <Text style={styles.statusTitle}>
                {job.status === 'completed'
                  ? '報告已完成'
                  : job.status === 'failed'
                    ? '匯出失敗'
                    : job.status === 'cancelled'
                      ? '已取消匯出'
                      : '正在整理資料'}
              </Text>
            </View>
            {busy && (
              <>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${job.progress}%` }]} />
                </View>
                <Text style={styles.muted}>{job.progress}%</Text>
                <TouchableOpacity onPress={cancel}>
                  <Text style={styles.danger}>取消</Text>
                </TouchableOpacity>
              </>
            )}
            {job.status === 'failed' && (
              <>
                <Text style={styles.error}>{job.error || '請稍後重試'}</Text>
                <TouchableOpacity onPress={() => requestRef.current?.()}>
                  <Text style={styles.link}>重試</Text>
                </TouchableOpacity>
              </>
            )}
            {job.status === 'completed' && (
              <View style={styles.actions}>
                <TouchableOpacity disabled={sharing} style={styles.secondary} onPress={share}>
                  <Text style={styles.link}>{sharing ? '準備檔案中…' : '分享／下載'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondary} onPress={run}>
                  <Text style={styles.link}>重新匯出</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
        <Text style={styles.notice}>
          報告會整理毛孩資料、健康紀錄、提醒與就醫資訊，不包含圖片。
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingBottom: 40 },
  intro: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  introIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  introCopy: { flex: 1 },
  eyebrow: { color: Colors.primary, fontSize: 13, fontWeight: '800', marginBottom: 2 },
  title: { color: Colors.text, fontSize: 24, fontWeight: '800' },
  lead: { fontSize: 13, color: Colors.subtext, lineHeight: 19, marginTop: 3 },
  label: { fontSize: 16, fontWeight: '800', color: Colors.text, marginTop: 22, marginBottom: 9 },
  labelInline: { fontSize: 16, fontWeight: '800', color: Colors.text },
  infoCard: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoHeading: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },
  infoTitle: { flex: 1, fontSize: 17, fontWeight: '800', color: Colors.text },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: {
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  choiceActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  choiceText: { color: Colors.text, fontWeight: '600' },
  choiceTextActive: { color: '#fff' },
  dateRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
    marginTop: 14,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 22,
    padding: 14,
    backgroundColor: Colors.surface,
    borderRadius: 16,
  },
  muted: { color: Colors.subtext, fontSize: 12, lineHeight: 18 },
  primary: {
    backgroundColor: Colors.primary,
    borderRadius: 18,
    padding: 14,
    minHeight: 52,
    alignItems: 'center',
    marginTop: 26,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  disabled: { opacity: 0.55 },
  primaryText: { color: '#fff', fontWeight: '800' },
  status: {
    marginTop: 18,
    padding: 16,
    backgroundColor: Colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statusHeading: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  statusIcon: {
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },
  statusTitle: { fontSize: 17, fontWeight: '800', color: Colors.text },
  track: { height: 8, backgroundColor: Colors.border, borderRadius: 5, overflow: 'hidden' },
  fill: { height: 8, backgroundColor: Colors.primary },
  danger: { color: Colors.danger, fontWeight: '700', marginTop: 12 },
  error: { color: Colors.danger },
  link: { color: Colors.primary, fontWeight: '800' },
  actions: { flexDirection: 'row', gap: 10 },
  secondary: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  notice: { color: Colors.subtext, fontSize: 12, lineHeight: 18, marginTop: 20 },
});
