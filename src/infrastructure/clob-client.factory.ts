import { Wallet, providers } from 'ethers';
import { ClobClient, Chain } from '@polymarket/clob-client';
import type { ApiKeyCreds } from '@polymarket/clob-client';

export type CreateClientInput = {
  rpcUrl: string;
  privateKey: string;
  apiKey?: string;
  apiSecret?: string;
  apiPassphrase?: string;
};

export async function createPolymarketClient(
  input: CreateClientInput,
): Promise<ClobClient & { wallet: Wallet }> {
  // Configure for Polygon network (chainId: 137) and disable ENS
  const network = {
    chainId: 137,
    name: 'matic',
    ensAddress: undefined, // Disable ENS - Polygon doesn't support it
  };
  const provider = new providers.JsonRpcProvider(input.rpcUrl, network);
  const wallet = new Wallet(input.privateKey, provider);
  
  let creds: ApiKeyCreds | undefined;
  if (input.apiKey && input.apiSecret && input.apiPassphrase) {
    creds = {
      key: input.apiKey,
      secret: input.apiSecret,
      passphrase: input.apiPassphrase,
    };
  }

  const client = new ClobClient(
    'https://clob.polymarket.com',
    Chain.POLYGON,
    wallet,
    creds,
  );
  return Object.assign(client, { wallet });
}

