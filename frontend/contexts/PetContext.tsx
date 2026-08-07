/** 用途：集中管理毛孩清單、目前選取毛孩與重新整理狀態。 */
import React, {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useAuth } from './AuthContext';
import * as petService from '../services/petService';
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
  const [selectedPetId, setSelectedPetId] = useState<string | null>(
    session?.pets[0]?.id ?? null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const nextPets = session?.pets ?? [];
    setPets(nextPets);
    setSelectedPetId(nextPets[0]?.id ?? null);
  }, [session]);

  const loadPets = async (refreshing = false) => {
    if (!session?.userId) return;
    refreshing ? setIsRefreshing(true) : setIsLoading(true);
    setError(null);
    try {
      const result = await petService.listPets(session.userId);
      setPets(result);
      setSelectedPetId((current) =>
        result.some((pet) => pet.id === current) ? current : result[0]?.id ?? null
      );
    } catch (requestError) {
      setError((requestError as Error).message || '無法載入毛孩資料');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const selectedPet =
    pets.find((pet) => pet.id === selectedPetId) ?? pets[0] ?? null;

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
        const pet = await petService.createPet(session.userId, data);
        setPets((current) => [...current, pet]);
        setSelectedPetId(pet.id);
        return pet;
      },
      updateSelectedPet: async (data) => {
        if (!session?.userId || !selectedPet) return;
        const updated = await petService.updatePet(
          session.userId,
          selectedPet.id,
          data
        );
        setPets((current) =>
          current.map((pet) => (pet.id === updated.id ? updated : pet))
        );
      },
      deleteSelectedPet: async () => {
        if (!session?.userId || !selectedPet) return;
        await petService.deletePet(session.userId, selectedPet.id);
        setPets((current) => current.filter((pet) => pet.id !== selectedPet.id));
        setSelectedPetId(null);
      },
    }),
    [
      pets,
      selectedPet,
      isLoading,
      isRefreshing,
      error,
      session?.userId,
    ]
  );

  return <PetContext.Provider value={value}>{children}</PetContext.Provider>;
}

export function usePet() {
  const context = useContext(PetContext);
  if (!context) throw new Error('usePet 必須在 PetProvider 內使用');
  return context;
}
