/** 用途：設定資料範圍、追蹤匯出進度，並分享或儲存完成檔案。 */
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import DatePickerField from '../components/DatePickerField';
import { Colors } from '../constants/Colors';
import { useAuth } from '../contexts/AuthContext';
import { usePet } from '../contexts/PetContext';
import * as exportService from '../services/exportService';
import { CsvExportType, ExportFormat, ExportJob, ExportPeriod, ExportScope } from '../types';
const formats: [ExportFormat, string][] = [
  ['pdf', 'PDF 健康報告'],
  ['csv', 'CSV 資料表'],
  ['json', 'JSON 完整備份'],
];
const periods: [ExportPeriod, string][] = [
  ['30_days', '最近 30 天'],
  ['90_days', '最近 90 天'],
  ['all', '全部'],
  ['custom', '自訂日期'],
];
const csvTypes: [CsvExportType, string][] = [
  ['weight', '體重'],
  ['health_event', '健康事件'],
  ['medical_visit', '就醫紀錄'],
  ['reminder', '提醒'],
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
  const { session } = useAuth();
  const { selectedPet } = usePet();
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [scope, setScope] = useState<ExportScope>('current_pet');
  const [period, setPeriod] = useState<ExportPeriod>('30_days');
  const [csvType, setCsvType] = useState<CsvExportType>('weight');
  const [includeImages, setIncludeImages] = useState(false);
  const [includeAiSummary, setIncludeAiSummary] = useState(true);
  const [start, setStart] = useState(new Date(Date.now() - 30 * 86400000));
  const [end, setEnd] = useState(new Date());
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
        format,
        scope,
        petId: scope === 'current_pet' ? selectedPet?.id : undefined,
        period,
        startAt: period === 'custom' ? start.toISOString() : undefined,
        endAt: period === 'custom' ? end.toISOString() : undefined,
        csvType: format === 'csv' ? csvType : undefined,
        includeImages: format !== 'csv' && includeImages,
        includeAiSummary: format === 'pdf' && includeAiSummary,
      });
      setJob(result);
    } catch (e) {
      Alert.alert('匯出失敗', (e as Error).message);
    }
  };
  requestRef.current = run;
  useEffect(() => {
    if (!session?.userId || !job || !['queued', 'processing'].includes(job.status)) return;
    const timer = setTimeout(
      () =>
        exportService
          .getExport(session.userId, job.id)
          .then(setJob)
          .catch((e) =>
            setJob((x) => (x ? { ...x, status: 'failed', error: (e as Error).message } : x)),
          ),
      900,
    );
    return () => clearTimeout(timer);
  }, [job, session?.userId]);
  const share = async () => {
    if (!session?.userId || !job) return;
    try {
      setSharing(true);
      await exportService.downloadAndShareExport(session.userId, job);
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
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.lead}>將 PawLog 紀錄整理成健康報告或可攜式資料檔。</Text>
        <Text style={styles.label}>格式</Text>
        <View style={styles.wrap}>
          {formats.map(([v, l]) => (
            <Choice key={v} active={format === v} label={l} onPress={() => setFormat(v)} />
          ))}
        </View>
        {format === 'csv' && (
          <>
            <Text style={styles.label}>CSV 資料</Text>
            <View style={styles.wrap}>
              {csvTypes.map(([v, l]) => (
                <Choice key={v} active={csvType === v} label={l} onPress={() => setCsvType(v)} />
              ))}
            </View>
          </>
        )}
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
        {period === 'custom' && (
          <View style={styles.dateRow}>
            <DatePickerField label="開始日期" value={start} onChange={setStart} maximumDate={new Date()} />
            <DatePickerField label="結束日期" value={end} onChange={setEnd} maximumDate={new Date()} />
          </View>
        )}
        {format === 'pdf' && (
          <View style={styles.switchRow}>
            <Text style={styles.label}>包含智慧健康摘要</Text>
            <Switch value={includeAiSummary} onValueChange={setIncludeAiSummary} />
          </View>
        )}
        {format !== 'csv' && (
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.labelInline}>包含圖片</Text>
              <Text style={styles.muted}>
                本機附件會加入報告或 ZIP；舊裝置 URI 只保留 metadata。
              </Text>
            </View>
            <Switch value={includeImages} onValueChange={setIncludeImages} />
          </View>
        )}
        <TouchableOpacity
          disabled={!!busy}
          onPress={run}
          style={[styles.primary, busy && styles.disabled]}
        >
          <Text style={styles.primaryText}>{busy ? '匯出中…' : '開始匯出'}</Text>
        </TouchableOpacity>
        {job && (
          <View style={styles.status}>
            <Text style={styles.statusTitle}>
              {job.status === 'completed'
                ? '匯出完成'
                : job.status === 'failed'
                  ? '匯出失敗'
                  : job.status === 'cancelled'
                    ? '已取消'
                    : '正在整理資料'}
            </Text>
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
          JSON 備份預留未來匯入相容性；目前尚未提供 Import、Restore 或雲端備份。
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 18, paddingBottom: 40 },
  lead: { fontSize: 16, color: Colors.subtext, lineHeight: 23 },
  label: { fontSize: 16, fontWeight: '800', color: Colors.text, marginTop: 22, marginBottom: 9 },
  labelInline: { fontSize: 16, fontWeight: '800', color: Colors.text },
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
  dateRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
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
    borderRadius: 14,
    padding: 14,
    minHeight: 52,
    alignItems: 'center',
    marginTop: 26,
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
  statusTitle: { fontSize: 17, fontWeight: '800', color: Colors.text, marginBottom: 10 },
  track: { height: 8, backgroundColor: Colors.border, borderRadius: 5, overflow: 'hidden' },
  fill: { height: 8, backgroundColor: Colors.primary },
  danger: { color: '#C94C4C', fontWeight: '700', marginTop: 12 },
  error: { color: '#C94C4C' },
  link: { color: Colors.primary, fontWeight: '800' },
  actions: { flexDirection: 'row', gap: 10 },
  secondary: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  notice: { color: Colors.subtext, fontSize: 12, lineHeight: 18, marginTop: 20 },
});
