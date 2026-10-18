import * as Joi from 'joi';

/** 앱 시작 시 .env 를 검사한다. 값이 없거나 형식이 틀리면 바로 실패한다. */
export const envValidationSchema = Joi.object({
  ALCHEMY_URL: Joi.string().uri().required(),
  CHAIN_ID: Joi.number().integer().min(1).required(),
  ALCHEMY_API_KEY: Joi.string().required(),
  ALCHEMY_SUB_API_KEY: Joi.string().allow('').default(''),
  POLL_INTERVAL_MS: Joi.number().min(100).default(3000),

  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().default(5432),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_NAME: Joi.string().required(),
});
