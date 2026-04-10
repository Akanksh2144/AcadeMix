from typing import Any, Dict, Optional

class DomainException(Exception):
    """Base exception for all custom domain errors in AcadMix."""
    def __init__(self, message: str, status_code: int = 400, details: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.details = details or {}

class ResourceNotFoundError(DomainException):
    """Raised when a requested resource is not found."""
    def __init__(self, resource_name: str, resource_id: Any):
        super().__init__(
            message=f"{resource_name} with ID '{resource_id}' not found.",
            status_code=404,
            details={"resource": resource_name, "identifier": str(resource_id)}
        )

class BusinessLogicError(DomainException):
    """Raised when an operation violates a business rule (e.g., eligibility, quota)."""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message=message, status_code=422, details=details)

class AuthorizationError(DomainException):
    """Raised when a user lacks permission to perform an action."""
    def __init__(self, message: str = "Not authorized to perform this operation."):
        super().__init__(message=message, status_code=403)

class DatabaseIntegrityError(DomainException):
    """Raised when a data constraint is violated (e.g., unique key violation)."""
    def __init__(self, message: str = "A data constraint was violated."):
        super().__init__(message=message, status_code=409)
