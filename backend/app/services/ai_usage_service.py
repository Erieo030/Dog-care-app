from app.timezone import now_taipei
import os
from fastapi import HTTPException
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError
from bson import ObjectId
from app.db import db

DEFAULT_DAILY_LIMIT = 20
db.ai_usage.create_index([('userId', 1), ('day', 1)], unique=True, name='ai_usage_user_day')

def limit_enabled() -> bool:
    return os.getenv('AI_DAILY_REQUEST_LIMIT_ENABLED', 'false').strip().lower() in {'1', 'true', 'yes', 'on'}

def daily_limit() -> int:
    try: return max(1, int(os.getenv('AI_DAILY_REQUEST_LIMIT', str(DEFAULT_DAILY_LIMIT))))
    except ValueError: return DEFAULT_DAILY_LIMIT

def _usage(item, day, limit):
    count = int(item.get('count', 0))
    return {'dailyLimit': limit, 'used': count, 'remaining': max(0, limit - count) if limit is not None else None, 'unlimited': limit is None, 'tokensUsed': int(item.get('tokens', 0)), 'date': day}

def _day() -> str:
    return now_taipei().date().isoformat()


def get_usage(user_id: str) -> dict:
    try:
        valid_user = db.users.find_one({'_id': ObjectId(user_id)}, {'_id': 1})
    except Exception as exc:
        raise HTTPException(status_code=404, detail='找不到使用者資料') from exc
    if not valid_user:
        raise HTTPException(status_code=404, detail='找不到使用者資料')
    return _usage_for_user(user_id)


def _usage_for_user(user_id: str) -> dict:
    day = _day()
    item = db.ai_usage.find_one({'userId': user_id, 'day': day}) or {'count': 0, 'tokens': 0}
    return _usage(item, day, daily_limit() if limit_enabled() else None)


def consume(user_id: str) -> dict:
    """Reserve one request; caller must release on failed model generation."""
    day = _day()
    limit = daily_limit() if limit_enabled() else None
    query = {'userId': user_id, 'day': day}
    if limit is not None:
        query['count'] = {'$lt': limit}
    update = {
        '$inc': {'count': 1},
        '$set': {'updatedAt': now_taipei()},
        '$setOnInsert': {'userId': user_id, 'day': day, 'tokens': 0},
    }
    item = db.ai_usage.find_one_and_update(query, update, upsert=False, return_document=ReturnDocument.AFTER)
    if item:
        return _usage(item, day, limit)
    try:
        item = db.ai_usage.insert_one({
            'userId': user_id,
            'day': day,
            'count': 1,
            'tokens': 0,
            'updatedAt': now_taipei(),
        })
        return _usage({'count': 1, 'tokens': 0}, day, limit)
    except DuplicateKeyError:
        item = db.ai_usage.find_one_and_update(query, update, upsert=False, return_document=ReturnDocument.AFTER)
        if item:
            return _usage(item, day, limit)
    if limit is None:
        raise HTTPException(status_code=500, detail='AI 用量記錄暫時無法建立')
    raise HTTPException(status_code=429, detail=f'今日 AI 用量已用完（{limit} 次），明天再試。')


def release(user_id: str) -> dict:
    """Return reserved request after provider failure/fallback."""
    day = _day()
    limit = daily_limit() if limit_enabled() else None
    item = db.ai_usage.find_one_and_update(
        {'userId': user_id, 'day': day, 'count': {'$gt': 0}},
        {'$inc': {'count': -1}, '$set': {'updatedAt': now_taipei()}},
        return_document=ReturnDocument.AFTER,
    )
    return _usage(item or {'count': 0, 'tokens': 0}, day, limit)


def add_tokens(user_id: str, tokens: int) -> dict:
    day = _day()
    limit = daily_limit() if limit_enabled() else None
    item = db.ai_usage.find_one_and_update(
        {'userId': user_id, 'day': day},
        {'$inc': {'tokens': max(0, tokens)}, '$set': {'updatedAt': now_taipei()}},
        return_document=ReturnDocument.AFTER,
    )
    return _usage(item, day, limit) if item else _usage_for_user(user_id)



def finalize(user_id: str, fallback: bool, tokens: int = 0) -> dict:
    """完成一次模型請求；fallback 退回預約次數，成功才累計用量。"""
    return release(user_id) if fallback else add_tokens(user_id, tokens)
