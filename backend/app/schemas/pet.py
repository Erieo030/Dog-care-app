"""毛孩資料的 API 驗證模型，集中管理欄位格式與長度限制。"""

from pydantic import BaseModel, Field


class PetFields(BaseModel):
    """建立與編輯毛孩時共用的健康及基本資料。"""

    name: str = Field(min_length=1, max_length=50)
    gender: str = Field(min_length=1, max_length=20)
    breed: str = Field(min_length=1, max_length=50)
    avatarUri: str = Field(default="", max_length=2000)
    birthday: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    arrivalDate: str = Field(default="", pattern=r"^$|^\d{4}-\d{2}-\d{2}$")
    neutered: bool = False
    allergies: str = Field(default="", max_length=1000)
    chronicDiseases: str = Field(default="", max_length=1000)
    microchipNumber: str = Field(default="", max_length=100)
    coatColor: str = Field(default="", max_length=100)
    distinctiveFeatures: str = Field(default="", max_length=500)


class PetCreateRequest(PetFields):
    """新增毛孩時必須帶入所屬使用者 ID。"""

    userId: str = Field(min_length=24, max_length=24)


class PetUpdateRequest(PetFields):
    """編輯毛孩資料的完整更新內容。"""
