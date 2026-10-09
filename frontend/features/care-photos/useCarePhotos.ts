import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { getCarePhotos, type CarePhotoPage } from '../../services/carePhotoService';
import { getValidAccessToken } from '../../services/api';
import { CARE_PHOTO_PAGE_SIZE, type CarePhotoCategory } from './carePhotoContent';

const emptyPage: CarePhotoPage = { items: [], total: 0, hasMore: false };

export function useCarePhotos(
  userId: string | undefined,
  petId: string | undefined,
  month: string,
  category: CarePhotoCategory,
) {
  const [revision, setRevision] = useState(0);
  const scope = JSON.stringify([userId, petId, month, category, revision]);
  const [state, setState] = useState({
    scope: '',
    page: emptyPage,
    token: null as string | null,
    loading: true,
    loadingMore: false,
    error: '',
  });
  const controllerRef = useRef<AbortController | null>(null);
  const busyRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      const controller = new AbortController();
      controllerRef.current = controller;
      busyRef.current = true;
      setState({
        scope,
        page: emptyPage,
        token: null,
        loading: true,
        loadingMore: false,
        error: '',
      });
      if (!userId || !petId) {
        busyRef.current = false;
        setState({
          scope,
          page: emptyPage,
          token: null,
          loading: false,
          loadingMore: false,
          error: '',
        });
        return () => controller.abort();
      }
      void Promise.all([
        getCarePhotos(
          userId,
          petId,
          { month, category, limit: CARE_PHOTO_PAGE_SIZE },
          controller.signal,
        ),
        getValidAccessToken(),
      ])
        .then(([page, token]) => {
          if (!controller.signal.aborted)
            setState({ scope, page, token, loading: false, loadingMore: false, error: '' });
        })
        .catch((error: Error) => {
          if (!controller.signal.aborted)
            setState((current) => ({
              ...current,
              loading: false,
              error: error.message || '照片暫時無法載入',
            }));
        })
        .finally(() => {
          if (controllerRef.current === controller) busyRef.current = false;
        });
      return () => {
        controller.abort();
        if (controllerRef.current === controller) busyRef.current = false;
      };
    }, [userId, petId, month, category, scope]),
  );

  const current =
    state.scope === scope
      ? state
      : { ...state, page: emptyPage, token: null, loading: true, error: '' };
  const loadMore = async () => {
    const controller = controllerRef.current;
    if (
      !userId ||
      !petId ||
      !controller ||
      controller.signal.aborted ||
      busyRef.current ||
      !current.page.hasMore
    )
      return;
    busyRef.current = true;
    setState((value) => ({ ...value, loadingMore: true, error: '' }));
    try {
      const page = await getCarePhotos(
        userId,
        petId,
        { month, category, skip: current.page.items.length, limit: CARE_PHOTO_PAGE_SIZE },
        controller.signal,
      );
      if (controller.signal.aborted) return;
      setState((value) => ({
        ...value,
        loadingMore: false,
        page: {
          ...page,
          items: [
            ...new Map(
              [...value.page.items, ...page.items].map((item) => [item.id, item]),
            ).values(),
          ],
        },
      }));
    } catch (error) {
      if (!controller.signal.aborted)
        setState((value) => ({
          ...value,
          loadingMore: false,
          error: (error as Error).message || '更多照片暫時無法載入',
        }));
    } finally {
      if (controllerRef.current === controller) busyRef.current = false;
    }
  };
  return { ...current, loadMore, refresh: () => setRevision((value) => value + 1) };
}
