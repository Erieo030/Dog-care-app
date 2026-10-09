import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  getVetVisitBrief,
  type VetBriefSection,
  type VetVisitBrief,
} from '../../../services/aiService';

interface BriefState {
  scope: string;
  brief: VetVisitBrief | null;
  loading: boolean;
  narrativeLoading: boolean;
  error: string;
  narrativeError: string;
}

/** 天數、毛孩或資料類別改變時取消舊請求，避免舊摘要覆蓋新範圍。 */
export function usePreVetBrief(
  userId: string | undefined,
  petId: string | undefined,
  range: number,
  sections: VetBriefSection[],
) {
  const [revision, setRevision] = useState(0);
  const scope = JSON.stringify([userId, petId, range, [...sections].sort(), revision]);
  const requestRef = useRef<AbortController | null>(null);
  const empty: BriefState = {
    scope,
    brief: null,
    loading: Boolean(userId && petId),
    narrativeLoading: false,
    error: '',
    narrativeError: '',
  };
  const [state, setState] = useState<BriefState>(empty);
  const current = state.scope === scope ? state : empty;

  useFocusEffect(
    useCallback(() => {
      const controller = new AbortController();
      requestRef.current = controller;
      setState({
        scope,
        brief: null,
        loading: Boolean(userId && petId),
        narrativeLoading: false,
        error: userId && petId ? '' : '請先選擇要整理資料的毛孩。',
        narrativeError: '',
      });
      const isCurrent = () => !controller.signal.aborted && requestRef.current === controller;
      if (userId && petId) {
        void getVetVisitBrief(userId, petId, range, false, sections, controller.signal)
          .then((brief) => {
            if (isCurrent()) setState((previous) => ({ ...previous, brief }));
          })
          .catch((caught: Error) => {
            if (isCurrent())
              setState((previous) => ({ ...previous, error: caught.message || '摘要載入失敗' }));
          })
          .finally(() => {
            if (isCurrent()) {
              requestRef.current = null;
              setState((previous) => ({ ...previous, loading: false }));
            }
          });
      } else {
        requestRef.current = null;
      }
      return () => {
        controller.abort();
        requestRef.current?.abort();
        requestRef.current = null;
      };
    }, [userId, petId, range, sections, scope]),
  );

  const enhanceWithAI = useCallback(async () => {
    if (!userId || !petId || !current.brief || requestRef.current) return;
    const controller = new AbortController();
    requestRef.current = controller;
    setState((previous) => ({ ...previous, narrativeLoading: true, narrativeError: '' }));
    const isCurrent = () => !controller.signal.aborted && requestRef.current === controller;
    try {
      const brief = await getVetVisitBrief(userId, petId, range, true, sections, controller.signal);
      if (isCurrent()) setState((previous) => ({ ...previous, brief }));
    } catch (caught) {
      if (isCurrent())
        setState((previous) => ({
          ...previous,
          narrativeError:
            (caught as Error).message || 'AI 整理未完成；系統摘要與原始紀錄仍可查看及分享。',
        }));
    } finally {
      if (isCurrent()) {
        requestRef.current = null;
        setState((previous) => ({ ...previous, narrativeLoading: false }));
      }
    }
  }, [current.brief, userId, petId, range, sections]);

  return { ...current, enhanceWithAI, retry: () => setRevision((value) => value + 1) };
}
