import secrets

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import hash_password, password_hasher, verify_password
from app.models import User
from app.schemas.auth import RegisterRequest

_DUMMY_PASSWORD_HASH = password_hasher.hash(secrets.token_urlsafe(32))


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(User.email == email))


def register_user(db: Session, request: RegisterRequest) -> User:
    user = User(
        name=request.name,
        email=str(request.email),
        password_hash=hash_password(request.password),
    )
    db.add(user)
    return user


def authenticate_user(db: Session, email: str, password: str) -> User | None:
    user = get_user_by_email(db, email)
    if user is None:
        verify_password(password, _DUMMY_PASSWORD_HASH)
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user
