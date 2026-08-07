/** 用途：封裝毛孩查詢、新增、編輯與刪除 API。 */
import { apiRequest } from './api';
import { Pet, PetFormData } from '../types';

const normalizePet = (pet: Record<string, unknown>): Pet => ({
  id: String(pet._id ?? pet.id ?? ''),
  userId: String(pet.userId ?? ''),
  name: String(pet.name ?? ''),
  species: 'dog',
  gender: String(pet.gender ?? ''),
  breed: String(pet.breed ?? ''),
  birthDate: String(pet.birthday ?? pet.birthDate ?? ''),
  adoptionDate: String(pet.arrivalDate ?? pet.adoptionDate ?? ''),
  avatarUrl: String(pet.avatarUri ?? pet.avatarUrl ?? ''),
  neutered: Boolean(pet.neutered),
  allergies: String(pet.allergies ?? ''),
  chronicDiseases: String(pet.chronicDiseases ?? ''),
  latestWeightKg: pet.latestWeightKg == null ? undefined : Number(pet.latestWeightKg),
  latestWeightAt: pet.latestWeightAt ? String(pet.latestWeightAt) : undefined,
});

const toPayload = (data: PetFormData) => ({
  name: data.name,
  gender: data.gender,
  breed: data.breed,
  birthday: data.birthDate,
  arrivalDate: data.adoptionDate,
  avatarUri: data.avatarUrl,
  neutered: data.neutered,
  allergies: data.allergies,
  chronicDiseases: data.chronicDiseases,
});

export const normalizePets = (pets: unknown[] = []) =>
  pets.map((pet) => normalizePet(pet as Record<string, unknown>));

export const listPets = async (userId: string) => {
  const result = await apiRequest<{ pets: Record<string, unknown>[] }>(
    `/api/pets/${userId}`
  );
  return normalizePets(result.pets);
};

export const createPet = async (userId: string, data: PetFormData) => {
  const result = await apiRequest<{ petData: Record<string, unknown> }>(
    '/api/create-pet',
    {
      method: 'POST',
      body: JSON.stringify({ userId, ...toPayload(data) }),
    }
  );
  return normalizePet(result.petData);
};

export const updatePet = async (
  userId: string,
  petId: string,
  data: PetFormData
) => {
  const result = await apiRequest<{ petData: Record<string, unknown> }>(
    `/api/pets/${petId}?userId=${encodeURIComponent(userId)}`,
    { method: 'PUT', body: JSON.stringify(toPayload(data)) }
  );
  return normalizePet(result.petData);
};

export const deletePet = (userId: string, petId: string) =>
  apiRequest(`/api/pets/${petId}?userId=${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  });
