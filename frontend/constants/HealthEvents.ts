/** 用途：提供健康異常類型與嚴重程度的共用顯示文字。 */
import { HealthEventType, Severity } from '../types';

export const HEALTH_EVENT_LABELS: Record<HealthEventType, string> = {
  vomiting: '嘔吐',
  abnormal_stool: '排便異常',
  low_appetite: '食慾下降',
  abnormal_drinking: '飲水異常',
  low_energy: '精神不佳',
  injury: '受傷',
  skin_issue: '皮膚異常',
  eye_ear_issue: '眼睛／耳朵異常',
  possible_ingestion: '疑似誤食',
  other: '其他異常',
};

export const SEVERITY_LABELS: Record<Severity, string> = {
  mild: '輕微',
  moderate: '需要注意',
  severe: '嚴重',
};
