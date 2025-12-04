"""
User model for authentication and user management.
"""
from typing import Dict, Any, Optional
from werkzeug.security import generate_password_hash, check_password_hash
from .base_model import BaseModel, ValidationError, DatabaseError, NotFoundError


class User(BaseModel):
    """User model for authentication and user management."""
    
    def __init__(self, user_id: Optional[int] = None, username: str = "", email: str = "", 
                 password_hash: str = "", role: str = "admin"):
        self.user_id = user_id
        self.username = username
        self.email = email
        self.password_hash = password_hash
        self.role = role
    
    @property
    def table_name(self) -> str:
        return "users"
    
    @property
    def primary_key(self) -> str:
        return "user_id"
    
    def to_dict(self, include_password_hash: bool = False) -> Dict[str, Any]:
        """Convert user instance to dictionary.
        
        Args:
            include_password_hash: Whether to include the password hash (for internal use)
        """
        data = {
            "user_id": self.user_id,
            "username": self.username,
            "email": self.email,
            "role": self.role
        }
        
        if include_password_hash:
            data["password_hash"] = self.password_hash
            
        return data
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'User':
        """Create user instance from dictionary."""
        return cls(
            user_id=data.get("user_id"),
            username=data.get("username", ""),
            email=data.get("email", ""),
            password_hash=data.get("password_hash", ""),
            role=data.get("role", "admin")
        )
    
    def set_password(self, password: str) -> None:
        """Set password with hashing."""
        if not password or len(password.strip()) == 0:
            raise ValidationError(
                "Password cannot be empty",
                error_code="EMPTY_PASSWORD"
            )
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password: str) -> bool:
        """Check if provided password matches the stored hash."""
        return check_password_hash(self.password_hash, password)
    
    def validate(self) -> None:
        """Validate user data."""
        required_fields = ["username", "email", "password_hash"]
        self._validate_required_fields(self.to_dict(include_password_hash=True), required_fields)
        
        if not self.username.strip():
            raise ValidationError(
                "Username cannot be empty",
                error_code="EMPTY_USERNAME"
            )
        
        if not self.email.strip():
            raise ValidationError(
                "Email cannot be empty",
                error_code="EMPTY_EMAIL"
            )
        
        if "@" not in self.email:
            raise ValidationError(
                "Invalid email format",
                error_code="INVALID_EMAIL_FORMAT"
            )
        
        if self.role not in ["admin", "user"]:
            raise ValidationError(
                f"Invalid role: {self.role}. Must be 'admin' or 'user'",
                error_code="INVALID_ROLE"
            )
    
    def save(self) -> 'User':
        """Save user to database."""
        self.validate()
        
        # Check for duplicate username or email
        if self._username_exists(self.username, self.user_id):
            raise ValidationError(
                f"Username '{self.username}' already exists",
                error_code="USERNAME_EXISTS"
            )
        
        if self._email_exists(self.email, self.user_id):
            raise ValidationError(
                f"Email '{self.email}' already exists",
                error_code="EMAIL_EXISTS"
            )
        
        if self.user_id is None:
            # Insert new user
            result = self._execute_query(
                """
                INSERT INTO users (username, email, password_hash, role)
                VALUES (:username, :email, :password_hash, :role)
                RETURNING user_id
                """,
                {
                    "username": self.username,
                    "email": self.email,
                    "password_hash": self.password_hash,
                    "role": self.role
                }
            )
            
            row = result.mappings().first()
            if not row:
                raise DatabaseError(
                    "Failed to create user",
                    error_code="USER_CREATION_FAILED"
                )
            
            self.user_id = row["user_id"]
        else:
            # Update existing user
            result = self._execute_query(
                """
                UPDATE users 
                SET username = :username, email = :email, 
                    password_hash = :password_hash, role = :role
                WHERE user_id = :user_id
                """,
                {
                    "user_id": self.user_id,
                    "username": self.username,
                    "email": self.email,
                    "password_hash": self.password_hash,
                    "role": self.role
                }
            )
            
            if not result or result.rowcount == 0:
                raise NotFoundError(
                    f"User with ID {self.user_id} not found",
                    error_code="USER_NOT_FOUND"
                )
        
        return self
    
    def delete(self) -> bool:
        """Delete user from database."""
        if self.user_id is None:
            raise ValidationError(
                "Cannot delete user without ID",
                error_code="NO_USER_ID"
            )
        
        result = self._execute_query(
            "DELETE FROM users WHERE user_id = :user_id",
            {"user_id": self.user_id}
        )
        
        return bool(result and result.rowcount > 0)
    
    def _username_exists(self, username: str, exclude_user_id: Optional[int] = None) -> bool:
        """Check if username already exists."""
        query = "SELECT 1 FROM users WHERE username = :username"
        params = {"username": username}
        
        if exclude_user_id:
            query += " AND user_id != :user_id"
            params["user_id"] = exclude_user_id
        
        result = self._execute_query(query, params)
        return result.scalar() is not None
    
    def _email_exists(self, email: str, exclude_user_id: Optional[int] = None) -> bool:
        """Check if email already exists."""
        query = "SELECT 1 FROM users WHERE email = :email"
        params = {"email": email}
        
        if exclude_user_id:
            query += " AND user_id != :user_id"
            params["user_id"] = exclude_user_id
        
        result = self._execute_query(query, params)
        return result.scalar() is not None
    
    @classmethod
    def find_by_email(cls, email: str) -> Optional['User']:
        """Find user by email."""
        instance = cls()
        result = instance._execute_query(
            """
            SELECT user_id, username, email, password_hash, role
            FROM users
            WHERE email = :email
            """,
            {"email": email}
        )
        
        row = result.mappings().first() if result else None
        return cls.from_dict(dict(row)) if row else None

    @classmethod
    def get_all(cls) -> list['User']:
        """Get all users."""
        instance = cls()
        result = instance._execute_query(
            "SELECT user_id, username, email, role FROM users ORDER BY user_id ASC"
        )
        rows = result.mappings().all() if result else []
        return [cls.from_dict(dict(row)) for row in rows]
    
    @classmethod
    def find_by_username(cls, username: str) -> Optional['User']:
        """Find user by username."""
        instance = cls()
        result = instance._execute_query(
            """
            SELECT user_id, username, email, password_hash, role
            FROM users
            WHERE username = :username
            """,
            {"username": username}
        )
        
        row = result.mappings().first() if result else None
        return cls.from_dict(dict(row)) if row else None
    
    @classmethod
    def find_by_id(cls, user_id: int) -> Optional['User']:
        """Find user by ID."""
        instance = cls()
        result = instance._execute_query(
            """
            SELECT user_id, username, email, password_hash, role
            FROM users
            WHERE user_id = :user_id
            """,
            {"user_id": user_id}
        )
        
        row = result.mappings().first() if result else None
        return cls.from_dict(dict(row)) if row else None
    
    @classmethod
    def authenticate(cls, email: str, password: str) -> Optional['User']:
        """Authenticate user with email and password."""
        user = cls.find_by_email(email)
        if user and user.check_password(password):
            return user
        return None
