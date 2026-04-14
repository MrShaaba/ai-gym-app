import type { WeightUnit } from '@/types/workout';

const LB_PER_KG = 2.20462;

function round(value: number, digits: number) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function convertKgToUnit(kg: number, unit: WeightUnit): number {
  if (unit === 'lb') return kg * LB_PER_KG;
  return kg;
}

export function convertUnitToKg(value: number, unit: WeightUnit): number {
  if (unit === 'lb') return value / LB_PER_KG;
  return value;
}

export function normalizeStoredKg(value: number): number {
  return round(value, 2);
}

export function parseWeightInputToKg(value: string, unit: WeightUnit): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  return normalizeStoredKg(convertUnitToKg(numeric, unit));
}

export function formatWeightValue(kg: number, unit: WeightUnit): string {
  const converted = convertKgToUnit(kg, unit);
  const rounded = round(converted, Number.isInteger(converted) ? 0 : 1);
  return rounded.toLocaleString(undefined, {
    maximumFractionDigits: Number.isInteger(rounded) ? 0 : 1,
  });
}

export function formatWeightWithUnit(kg: number, unit: WeightUnit): string {
  return `${formatWeightValue(kg, unit)} ${unit}`;
}

export function formatVolumeWithUnit(volumeKg: number, unit: WeightUnit): string {
  const converted = convertKgToUnit(volumeKg, unit);
  const rounded = round(converted, Number.isInteger(converted) ? 0 : 1);
  return `${rounded.toLocaleString(undefined, {
    maximumFractionDigits: Number.isInteger(rounded) ? 0 : 1,
  })} ${unit}`;
}

export function getWarmupWeightKg(workingWeightKg: number): number {
  return workingWeightKg > 0 ? normalizeStoredKg(workingWeightKg * 0.65) : 0;
}

export function getWarmupReps(workingReps: number): number {
  if (workingReps <= 0) return 0;
  return Math.max(4, Math.round(workingReps * 0.6));
}