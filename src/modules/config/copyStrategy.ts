export type CopyInputs = {
  yourUsdBalance: number;
  traderUsdBalance: number;
  traderTradeUsd: number;
  multiplier: number; // e.g., 1.0, 2.0
};

export type SizingResult = {
  targetUsdSize: number; // final USD size to place
  ratio: number; // your balance vs trader after trade
};

export function computeProportionalSizing(input: CopyInputs): SizingResult {
  const { yourUsdBalance, traderUsdBalance, traderTradeUsd, multiplier } = input;
  const denom = Math.max(1, traderUsdBalance + Math.max(0, traderTradeUsd));
  const ratio = Math.max(0, yourUsdBalance / denom);
  const base = Math.max(0, traderTradeUsd * ratio);
  const targetUsdSize = Math.max(1, base * Math.max(0, multiplier));
  return { targetUsdSize, ratio };
}


