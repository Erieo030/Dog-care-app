/** 用途：集中管理三種健康紀錄的附件限制。 */
export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
export const ATTACHMENT_LIMITS = {
  weight: 3,
  health_event: 5,
  medical_visit: 10,
} as const;
export const ATTACHMENT_ALLOWED_MIME = ['image/jpeg', 'image/png'] as const;
