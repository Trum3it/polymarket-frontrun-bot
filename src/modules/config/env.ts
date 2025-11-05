export type RuntimeEnv = {
  userAddresses: string[];
  proxyWallet: string;
  privateKey: string;
  mongoUri?: string;
  rpcUrl: string;
  fetchIntervalSeconds: number;
  tradeMultiplier: number;
  retryLimit: number;
  aggregationEnabled: boolean;
  aggregationWindowSeconds: number;
};

export function loadEnv(): RuntimeEnv {
  const parseList = (val: string | undefined): string[] => {
    if (!val) return [];
    try {
      const maybeJson = JSON.parse(val);
      if (Array.isArray(maybeJson)) return maybeJson.map(String);
    } catch (_) {
      // not JSON, parse as comma separated
    }
    return val
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  };

  const required = (name: string, v: string | undefined): string => {
    if (!v) throw new Error(`Missing required env var: ${name}`);
    return v;
  };

  const env: RuntimeEnv = {
    userAddresses: parseList(process.env.USER_ADDRESSES),
    proxyWallet: required('PROXY_WALLET', process.env.PROXY_WALLET),
    privateKey: required('PRIVATE_KEY', process.env.PRIVATE_KEY),
    mongoUri: process.env.MONGO_URI,
    rpcUrl: required('RPC_URL', process.env.RPC_URL),
    fetchIntervalSeconds: Number(process.env.FETCH_INTERVAL ?? 1),
    tradeMultiplier: Number(process.env.TRADE_MULTIPLIER ?? 1.0),
    retryLimit: Number(process.env.RETRY_LIMIT ?? 3),
    aggregationEnabled: String(process.env.TRADE_AGGREGATION_ENABLED ?? 'false') === 'true',
    aggregationWindowSeconds: Number(process.env.TRADE_AGGREGATION_WINDOW_SECONDS ?? 300),
  };

  return env;
}


