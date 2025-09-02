export const COMMON_CONSTANT = {
  BCRYPT_SALT_ROUND: 10,
  JWT_DECODED_REQUEST_PARAM: 'jwtDecoded',
  REDIS_DEFAULT_NAMESPACE: 'redisDefault',

  RESPONSE_SUCCESS: {
    CODE: 0,
    MESSAGE: 'ok',
  },

  THROTTLER: {
    TTL: 60,
    LIMIT: 5000,
  },

  TIME: {
    DATE_TIME_FORMAT: 'YYYY-MM-DDTHH:mm:ss',
  },

  DATASOURCE: {
    DEFAULT: 'datasourceDefault',
  },
};

export const CHAIN_ID = {
  BASE: 8453,
  BASE_GOERLI: 84531,
  HYPER_LIQUID: 999,
};
