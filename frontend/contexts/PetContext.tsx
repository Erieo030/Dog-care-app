/** 用途：集中管理毛孩清單、目前選取毛孩與重新整理狀態。 */
import React, {
  createContext,
  PropsWithChildren,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useAuth } from './AuthContext';
import * as petService from '../services/petService';
import { deleteAttachment, uploadPetAvatarImage } from '../services/attachmentService';
import { Pet, PetFormData } from '../types';

interface PetContextValue {
  pets: Pet[];
  selectedPet: Pet | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  selectPet: (petId: string) => void;
  refreshPets: () => Promise<void>;
  createPet: (data: PetFormData) => Promise<Pet>;
  updateSelectedPet: (data: PetFormData) => Promise<void>;
  deleteSelectedPet: () => Promise<void>;
}

const PetContext = createContext<PetContextValue | undefined>(undefined);

export function PetProvider({ children }: PropsWithChildren) {
  const { session } = useAuth();
  const [pets, setPets] = useState<Pet[]>(session?.pets ?? []);
  const [selectedPetId, setSelectedPetId] = useState<string | null>(session?.pets[0]?.id ?? null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadRequestId = useRef(0);

  useEffect(() => {
    // Invalidate refreshes before replacing one account's pet list with another's.
    loadRequestId.current += 1;
    const nextPets = session?.pets ?? [];
    setPets(nextPets);
    setSelectedPetId(nextPets[0]?.id ?? null);
    setIsLoading(false);
    setIsRefreshing(false);
    setError(null);
  }, [session]);

  const loadPets = useCallback(
    async (refreshing = false) => {
      if (!session?.userId) return;
      const requestId = ++loadRequestId.current;
      const userId = session.userId;
      if (refreshing) setIsRefreshing(true);
      else setIsLoading(true);
      setError(null);
      try {
        const result = await petService.listPets(userId);
        if (requestId !== loadRequestId.current) return;
        setPets(result);
        setSelectedPetId((current) =>
          result.some((pet) => pet.id === current) ? current : (result[0]?.id ?? null),
        );
      } catch (requestError) {
        if (requestId === loadRequestId.current)
          setError((requestError as Error).message || '無法載入毛孩資料');
      } finally {
        if (requestId === loadRequestId.current) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [session?.userId],
  );

  const selectedPet = pets.find((pet) => pet.id === selectedPetId) ?? pets[0] ?? null;

  const value = useMemo<PetContextValue>(
    () => ({
      pets,
      selectedPet,
      isLoading,
      isRefreshing,
      error,
      selectPet: setSelectedPetId,
      refreshPets: () => loadPets(true),
      createPet: async (data) => {
        if (!session?.userId) throw new Error('找不到登入使用者');
        let pet = await petService.createPet(session.userId, {
          ...data,
          avatarUri: '',
          avatarAttachmentId: undefined,
        });
        if (data.avatarUri) {
          try {
            const avatar = await uploadPetAvatarImage(session.userId, pet.id, data.avatarUri);
            pet = await petService.updatePet(session.userId, pet.id, {
              ...data,
              avatarUri: '',
              avatarAttachmentId: avatar.id,
            });
          } catch (error) {
            await petService.deletePet(session.userId, pet.id).catch(() => undefined);
            throw new Error(`毛孩照片上傳失敗，尚未完成新增：${(error as Error).message}`);
          }
        }
        setPets((current) => [...current, pet]);
        setSelectedPetId(pet.id);
        return pet;
      },
      updateSelectedPet: async (data) => {
        if (!session?.userId || !selectedPet) return;
        let avatarAttachmentId = data.avatarAttachmentId;
        let uploadedAvatar: Awaited<ReturnType<typeof uploadPetAvatarImage>> | null = null;
        if (data.avatarUri) {
          uploadedAvatar = await uploadPetAvatarImage(session.userId, selectedPet.id, data.avatarUri);
          avatarAttachmentId = uploadedAvatar.id;
        }
        let updated: Pet;
        try {
          updated = await petService.updatePet(session.userId, selectedPet.id, {
            ...data,
            avatarUri: '',
            avatarAttachmentId,
          });
        } catch (error) {
          if (uploadedAvatar) await deleteAttachment(session.userId, uploadedAvatar).catch(() => undefined);
          throw error;
        }
        setPets((current) => current.map((pet) => (pet.id === updated.id ? updated : pet)));
      },
      deleteSelectedPet: async () => {
        if (!session?.userId || !selectedPet) return;
        await petService.deletePet(session.userId, selectedPet.id);
        setPets((current) => current.filter((pet) => pet.id !== selectedPet.id));
        setSelectedPetId(null);
      },
    }),
    [pets, selectedPet, isLoading, isRefreshing, error, session?.userId, loadPets],
  );

  return <PetContext.Provider value={value}>{children}</PetContext.Provider>;
}

export function usePet() {
  const context = useContext(PetContext);
  if (!context) throw new Error('usePet 必須在 PetProvider 內使用');
  return context;
}
