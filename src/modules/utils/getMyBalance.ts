import type { Wallet } from 'ethers';

export async function getUsdBalanceApprox(_wallet: Wallet): Promise<number> {
  // Stub for now; in production you would query USDC balance or portfolio value
  return 1000; // USD
}


