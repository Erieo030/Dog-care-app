/** 前後端共用的毛孩資料形狀，畫面與 service 都應引用此型別。 */
export interface PetData {
  _id?: string;
  userId?: string;
  name: string;
  gender: string;
  breed: string;
  avatarUri: string;
  birthday: string;
  arrivalDate: string;
  neutered: boolean;
  allergies: string;
  chronicDiseases: string;
}

/** 建立空白表單時使用，避免各畫面自行維護不同預設值。 */
export const emptyPetData: PetData = {
  name: '',
  gender: '',
  breed: '',
  avatarUri: '',
  birthday: '',
  arrivalDate: '',
  neutered: false,
  allergies: '',
  chronicDiseases: '',
};
