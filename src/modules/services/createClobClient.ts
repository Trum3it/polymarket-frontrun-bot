import { Wallet, providers } from 'ethers';
import { createClobClient as createClient, ClobClient } from '@polymarket/clob-client';

export type CreateClientInput = {
  rpcUrl: string;
  privateKey: string;
};

export async function createPolymarketClient(
  input: CreateClientInput,
): Promise<ClobClient & { wallet: Wallet } > {
  const provider = new providers.JsonRpcProvider(input.rpcUrl);
  const wallet = new Wallet(input.privateKey, provider);
  const client = await createClient({ wallet });
  return Object.assign(client, { wallet });
}


