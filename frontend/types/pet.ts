export interface Pet {
  id: string;
  userId: string;
  name: string;
  species: 'dog' | 'cat' | 'other';
  gender: 'male' | 'female';
  breed?: string;
  breedType?: 'purebred' | 'mixed' | 'unknown';
  birthDate?: string;
  adoptionDate?: string;
  avatarUrl?: string;
  latestWeightKg?: number;
  latestWeightAt?: string;
  neutered: boolean;
  allergies?: string;
  chronicDiseases?: string;
  microchipNumber?: string;
  coatColor?: string;
  distinctiveFeatures?: string;
}
export type PetFormData = Omit<Pet, 'id' | 'userId' | 'species' | 'gender'> & {
  gender: 'male' | 'female' | '';
};
/** 建立與編輯毛孩表單的相容型別；欄位名稱保留後端 API convention。 */
export interface PetData {
  _id?: string;
  userId?: string;
  name: string;
  gender: 'male' | 'female' | '';
  breed: string;
  breedType: 'purebred' | 'mixed' | 'unknown';
  avatarUri: string;
  birthday: string;
  arrivalDate: string;
  neutered: boolean;
  allergies: string;
  chronicDiseases: string;
  microchipNumber: string;
  coatColor: string;
  distinctiveFeatures: string;
}
export const emptyPetData: PetData = {
  name: '',
  gender: '',
  breed: '',
  breedType: 'unknown',
  avatarUri: '',
  birthday: '',
  arrivalDate: '',
  neutered: false,
  allergies: '',
  chronicDiseases: '',
  microchipNumber: '',
  coatColor: '',
  distinctiveFeatures: '',
};
