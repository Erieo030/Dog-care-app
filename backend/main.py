from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from psycopg.rows import dict_row
from database import get_connection
from schemas import LoginRequest, RegisterRequest, PetCreateRequest

app = FastAPI(
    title="Pet App Backend",
    description="FastAPI backend for React Native Pet App",
    version="1.0.0",
)

# CORS 設定
# 開發階段可以先 allow_origins=["*"]
# 正式環境建議改成你的前端網域或 App API 來源
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def test_database_connection():
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1;")
        print("✅ 成功連接到 PostgreSQL 資料庫")
    except Exception as err:
        print("❌ 資料庫連線失敗:", err)


@app.get("/")
def root():
    return {
        "message": "FastAPI backend is running",
        "docs": "/docs",
    }


# 註冊 API
@app.post("/api/register")
def register(data: RegisterRequest):
    email = data.email
    password = data.password

    print("--- 註冊嘗試 ---")
    print(f"Email: [{email}]")

    if not email or not password:
        raise HTTPException(
            status_code=400,
            detail={
                "success": False,
                "message": "帳號與密碼不可空白",
            },
        )

    try:
        with get_connection() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                cur.execute(
                    """
                    SELECT id
                    FROM users
                    WHERE email = %s
                    """,
                    (email,),
                )

                existing_user = cur.fetchone()

                if existing_user:
                    raise HTTPException(
                        status_code=400,
                        detail={
                            "success": False,
                            "message": "此帳號已經註冊過",
                        },
                    )

                cur.execute(
                    """
                    INSERT INTO users (email, password)
                    VALUES (%s, %s)
                    RETURNING id
                    """,
                    (email, password),
                )

                new_user = cur.fetchone()
                conn.commit()

                user_id = new_user["id"]

                return {
                    "success": True,
                    "message": "註冊成功",
                    "userId": user_id,
                    "hasPet": False,
                    "petData": None,
                }

    except HTTPException:
        raise

    except Exception as err:
        print("🔥 註冊 API 發生錯誤:", err)
        raise HTTPException(
            status_code=500,
            detail={
                "success": False,
                "message": "註冊失敗，伺服器內部錯誤",
            },
        )


# 登入 API
@app.post("/api/login")
def login(data: LoginRequest):
    email = data.email
    password = data.password

    print("--- 登入嘗試 ---")
    print(f"Email: [{email}]")
    print(f"Password: [{password}]")

    try:
        with get_connection() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                # 驗證用戶
                cur.execute(
                    """
                    SELECT id
                    FROM users
                    WHERE email = %s AND password = %s
                    """,
                    (email, password),
                )

                user = cur.fetchone()

                if not user:
                    print("❌ 登入失敗: 找不到匹配的帳號或密碼")
                    raise HTTPException(
                        status_code=401,
                        detail={
                            "success": False,
                            "message": "帳號或密碼錯誤",
                        },
                    )

                user_id = user["id"]
                print(f"✅ 登入成功，User ID: {user_id}")

                # 查詢該用戶是否有狗狗資料
                cur.execute(
                    """
                    SELECT
                        name,
                        gender,
                        breed,
                        birthday::text AS birthday
                    FROM pets
                    WHERE user_id = %s
                    LIMIT 1
                    """,
                    (user_id,),
                )

                pet = cur.fetchone()
                has_pet = pet is not None

                print(f"   是否有寵物資料: {has_pet}")

                return {
                    "success": True,
                    "hasPet": has_pet,
                    "petData": pet if pet else None,
                    "userId": user_id,
                }

    except HTTPException:
        raise

    except Exception as err:
        print("🔥 登入 API 發生錯誤:", err)
        raise HTTPException(
            status_code=500,
            detail={
                "success": False,
                "message": "伺服器內部錯誤",
            },
        )


# 儲存狗狗資料 API
@app.post("/api/create-pet")
def create_pet(data: PetCreateRequest):
    print("--- 儲存寵物資料 ---")
    print(f"User ID: {data.userId}, Name: {data.name}")

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO pets (
                        user_id,
                        name,
                        gender,
                        breed,
                        birthday
                    )
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (
                        data.userId,
                        data.name,
                        data.gender,
                        data.breed,
                        data.birthday,
                    ),
                )

                conn.commit()

        print("✅ 資料儲存成功")

        return {
            "success": True,
        }

    except Exception as err:
        print("🔥 儲存 API 發生錯誤:", err)
        raise HTTPException(
            status_code=500,
            detail={
                "success": False,
                "message": "儲存失敗",
            },
        )
