from pydantic import BaseModel


class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    email: str
    password: str


class PetCreateRequest(BaseModel):
    userId: int
    name: str
    gender: str
    breed: str
    birthday: str