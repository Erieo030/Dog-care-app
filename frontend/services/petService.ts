/** 用途：封裝毛孩查詢、新增、編輯與刪除 API。 */
import { apiData } from './api';
import { Pet, PetFormData } from '../types';

const normalizePet = (pet: Record<string, unknown>): Pet => ({
  id: String(pet._id ?? pet.id ?? ''),
  userId: String(pet.userId ?? ''),
  name: String(pet.name ?? ''),
  species: 'dog',
  gender: pet.gender === 'female' ? 'female' : 'male',
  breed: String(pet.breed ?? ''),
  breedType: (pet.breedType === 'purebred' || pet.breedType === 'mixed' ? pet.breedType : 'unknown'),
  birthDate: String(pet.birthday ?? ''),
  adoptionDate: String(pet.arrivalDate ?? ''),
  avatarUrl: String(pet.avatarUri ?? ''),
  neutered: Boolean(pet.neutered),
  allergies: String(pet.allergies ?? ''),
  chronicDiseases: String(pet.chronicDiseases ?? ''),
  microchipNumber: String(pet.microchipNumber ?? ''),
  coatColor: String(pet.coatColor ?? ''),
  distinctiveFeatures: String(pet.distinctiveFeatures ?? ''),
  latestWeightKg: pet.latestWeightKg == null ? undefined : Number(pet.latestWeightKg),
  latestWeightAt: pet.latestWeightAt ? String(pet.latestWeightAt) : undefined,
});

const toPayload = (data: PetFormData) => ({
  name: data.name,
  gender: data.gender,
  breed: data.breed,
  breedType: data.breedType,
  birthday: data.birthDate,
  arrivalDate: data.adoptionDate,
  avatarUri: data.avatarUrl,
  neutered: data.neutered,
  allergies: data.allergies,
  chronicDiseases: data.chronicDiseases,
  microchipNumber: data.microchipNumber,
  coatColor: data.coatColor,
  distinctiveFeatures: data.distinctiveFeatures,
});

export const normalizePets = (pets: unknown[] = []) =>
  pets.map((pet) => normalizePet(pet as Record<string, unknown>));

export const listPets = async (userId: string) => {
  const result = await apiData<{ pets: Record<string, unknown>[] }>(`/api/pets/${userId}`);
  return normalizePets(result.pets);
};

export const createPet = async (userId: string, data: PetFormData) => {
  const result = await apiData<{ petData: Record<string, unknown> }>('/api/create-pet', {
    method: 'POST',
    body: JSON.stringify({ userId, ...toPayload(data) }),
  });
  return normalizePet(result.petData);
};

export const updatePet = async (userId: string, petId: string, data: PetFormData) => {
  const result = await apiData<{ petData: Record<string, unknown> }>(
    `/api/pets/${petId}?userId=${encodeURIComponent(userId)}`,
    { method: 'PUT', body: JSON.stringify(toPayload(data)) },
  );
  return normalizePet(result.petData);
};

export const deletePet = (userId: string, petId: string) =>
  apiData(`/api/pets/${petId}?userId=${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  });
