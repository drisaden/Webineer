import { getPrisma } from "@/server/db/prisma";

/** Platform-wide money settings. Defaults apply until an administrator changes them. */
export const DEFAULT_PLATFORM_FEE_PERCENT = 10;
export const DEFAULT_HOLD_DAYS = 2;

type Db = Pick<ReturnType<typeof getPrisma>, "platformSetting">;

async function readNumber(db: Db, key: string, fallback: number, min: number, max: number): Promise<number> {
  const row = await db.platformSetting.findUnique({ where: { key } });
  const n = typeof row?.value === "number" ? row.value : Number(row?.value);
  return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
}

export const getPlatformFeePercent = (db: Db = getPrisma()) => readNumber(db, "platform_fee_percent", DEFAULT_PLATFORM_FEE_PERCENT, 0, 50);
export const getHoldDays = (db: Db = getPrisma()) => readNumber(db, "payout_hold_days", DEFAULT_HOLD_DAYS, 0, 30);

export async function setPlatformSetting(key: "platform_fee_percent" | "payout_hold_days", value: number, updatedBy: string | null) {
  const range = key === "platform_fee_percent" ? [0, 50] : [0, 30];
  if (!Number.isFinite(value) || value < range[0] || value > range[1]) throw new Error(`Enter a value between ${range[0]} and ${range[1]}.`);
  const rounded = Math.round(value * 100) / 100;
  await getPrisma().platformSetting.upsert({ where: { key }, create: { key, value: rounded, updatedBy }, update: { value: rounded, updatedBy } });
  return rounded;
}

/** Fee on a gross amount in major units, rounded to the nearest kobo/cent. */
export function feeFor(gross: number, percent: number): number {
  return Math.round(gross * percent) / 100;
}
