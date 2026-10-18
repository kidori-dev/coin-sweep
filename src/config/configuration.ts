/**
 * .env 값을 코드에서 쓰기 좋은 형태로 묶는다.
 * 사용 예) config.get<string>('alchemy.apiKey')
 */
export default () => ({
  alchemy: {
    url: process.env.ALCHEMY_URL ?? '',
    chainId: parseInt(process.env.CHAIN_ID ?? '0', 10),
    apiKey: process.env.ALCHEMY_API_KEY ?? '',
    subApiKey: process.env.ALCHEMY_SUB_API_KEY ?? '',
    pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS ?? '3000', 10),
  },
  database: {
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USERNAME ?? 'postgres',
    password: process.env.DB_PASSWORD ?? 'postgres',
    name: process.env.DB_NAME ?? 'coin',
  },
});
