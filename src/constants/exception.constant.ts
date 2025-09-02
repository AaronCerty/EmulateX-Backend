export const ERROR = {
  INVALID_SIGNATURE: {
    message: 'invalid signature',
    code: -2,
  },
  UNKNOWN_ERROR: {
    message: 'internal server error',
    code: -1,
  },
  USER_NOT_EXIST: {
    message: 'user not exist',
    code: 1,
  },
  WRONG_USERNAME_OR_PASSWORD: {
    message: 'wrong username or password',
    code: 2,
  },
  USER_EXISTED: {
    message: 'user existed',
    code: 3,
  },
  UNAUTHORIZED: {
    message: 'unauthorized',
    code: 4,
  },
  FORBIDDEN: {
    message: 'forbidden',
    code: 5,
  },
  TOO_MANY_REQUESTS: {
    message: 'too many requests',
    code: 6,
  },
  REFRESH_TOKEN_FAIL: {
    message: 'refresh token fail',
    code: 7,
  },
  REFRESH_TOKEN_EXPIRED: {
    message: 'refresh token expired',
    code: 8,
  },
  LEADER_NOT_FOUND: {
    message: 'leader not found',
    code: 9,
  },
  COPIER_NOT_FOUND: {
    message: 'copier not found',
    code: 19,
  },
  COPY_TRADE_NOT_CONFIRM_SHARING: {
    message: 'Confirm sharing is required',
    code: 10,
  },
  COPY_TRADE_NOT_AGREE_SERVICE_TERMS: {
    message: 'Agree service terms is required',
    code: 11,
  },
  INSUFFICIENT_BALANCE: {
    message: 'Insufficient balance',
    code: 12,
  },
  INSUFFICIENT_AVAILABLE_BALANCE: {
    message: 'Insufficient available balance',
    code: 13,
  },
  BALANCE_NOT_FOUND: {
    message: 'Balance not found',
    code: 14,
  },
  COPY_TRADE_SESSION_ALREADY_EXISTS: {
    message: 'Copy trade session already exists or is creating',
    code: 15,
  },
  COPY_TRADE_COPIER_NOT_FOUND: {
    message: 'Copier not found',
    code: 16,
  },
  COPY_TRADE_SESSION_NOT_FOUND: {
    message: 'Copy trade session not found',
    code: 16,
  },
  COPY_TRADE_SESSION_NOT_RUNNING: {
    message: 'Copy trade session not running',
    code: 17,
  },
  LOCK_ADDRESS_ADMIN_IS_UNAVAILABLE: {
    message: 'Lock address admin is unavailable',
    code: 18,
  },
  CAN_NOT_FETCH_TOKEN_METADATA: {
    message: 'Can not fetch token metadata',
    code: 19,
  },
  CAN_NOT_STOP_COPY_TRADE: {
    message: 'Can not stop copy trade. Please try again later',
    code: 20,
  },
};
