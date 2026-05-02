class LCMSException(Exception):
    def __init__(self, message: str, status_code: int = 400):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)


class NotFoundError(LCMSException):
    def __init__(self, resource: str, identifier: str | int):
        super().__init__(
            message=f"{resource} with identifier '{identifier}' not found",
            status_code=404,
        )


class AlreadyExistsError(LCMSException):
    def __init__(self, resource: str, identifier: str):
        super().__init__(
            message=f"{resource} '{identifier}' already exists",
            status_code=409,
        )


class InvalidCredentialsError(LCMSException):
    def __init__(self):
        super().__init__(
            message="Invalid email or password",
            status_code=401,
        )


class InvalidTokenError(LCMSException):
    def __init__(self, message: str = "Invalid or expired token"):
        super().__init__(message=message, status_code=401)


class InvalidStatusTransitionError(LCMSException):
    def __init__(self, message: str):
        super().__init__(message=message, status_code=400)


class ForbiddenError(LCMSException):
    def __init__(self, message: str = "You don't have permission to perform this action"):
        super().__init__(message=message, status_code=403)
