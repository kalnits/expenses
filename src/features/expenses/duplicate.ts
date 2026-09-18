export function normalizeMerchant(value: string): string { return value.trim().toLocaleLowerCase('ru-RU').replace(/[^\p{L}\p{N}]+/gu, ' ').replace(/\s+/g, ' ').trim() }
