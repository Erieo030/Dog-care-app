"""Signed short-lived access tokens and revocable rotating refresh sessions."""
from __future__ import annotations

import hashlib
import secrets
import time
from datetime import datetime, timedelta, timezone
from pymongo import ReturnDocument

import jwt
from fastapi import HTTPException

from app.core.config import get_settings
from app.db import db


def issue_access_token(user_id: str, session_id: str) -> tuple[str, int]:
    lifetime = get_settings().access_token_minutes * 60
    now = int(time.time())
    token = jwt.encode(
        {
            "sub": user_id,
            "sid": session_id,
            "iss": "mego-api",
            "aud": "mego-mobile",
            "iat": now,
            "nbf": now,
            "exp": now + lifetime,
            "typ": "access",
        },
        get_settings().auth_secret_key,
        algorithm="HS256",
    )
    return token, lifetime


def verify_access_token(token: str) -> str:
    try:
        data = jwt.decode(
            token,
            get_settings().auth_secret_key,
            algorithms=["HS256"],
            issuer="mego-api",
            audience="mego-mobile",
            options={"require": ["sub", "sid", "iss", "aud", "iat", "nbf", "exp"]},
        )
        if data.get("typ") != "access":
            raise jwt.InvalidTokenError("wrong token type")
        user_id, session_id = str(data["sub"]), str(data["sid"])
        active_session = db.auth_sessions.find_one({
            "sessionId": session_id,
            "userId": user_id,
            "expiresAt": {"$gt": datetime.now(timezone.utc)},
        }, {"_id": 1})
        if not active_session:
            raise jwt.InvalidTokenError("revoked session")
        return user_id
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status_code=401, detail="登入狀態已失效，請重新登入") from exc


def issue_refresh_session(user_id: str) -> tuple[str, int, str]:
    settings = get_settings()
    lifetime = settings.refresh_token_days * 24 * 60 * 60
    token = secrets.token_urlsafe(48)
    session_id = secrets.token_urlsafe(24)
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=lifetime)
    db.auth_sessions.insert_one({
        "userId": user_id,
        "sessionId": session_id,
        "tokenHash": hashlib.sha256(token.encode()).hexdigest(),
        "expiresAt": expires_at,
        "createdAt": datetime.now(timezone.utc),
    })
    return token, lifetime, session_id


def rotate_refresh_session(refresh_token: str) -> tuple[str, str, str, int, int]:
    token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
    next_token = secrets.token_urlsafe(48)
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(days=get_settings().refresh_token_days)
    session = db.auth_sessions.find_one_and_update({
        "tokenHash": token_hash,
        "expiresAt": {"$gt": now},
    }, {"$set": {"tokenHash": hashlib.sha256(next_token.encode()).hexdigest(), "expiresAt": expires_at, "rotatedAt": now}}, return_document=ReturnDocument.AFTER)
    if not session:
        raise HTTPException(status_code=401, detail="登入狀態已失效，請重新登入")
    user_id = str(session["userId"])
    access, access_lifetime = issue_access_token(user_id, str(session["sessionId"]))
    return user_id, access, next_token, access_lifetime, get_settings().refresh_token_days * 24 * 60 * 60


def revoke_refresh_session(refresh_token: str | None) -> None:
    if refresh_token:
        db.auth_sessions.delete_one({"tokenHash": hashlib.sha256(refresh_token.encode()).hexdigest()})


def authenticate_request_token(authorization: str | None) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="請先登入")
    return verify_access_token(authorization[7:].strip())
