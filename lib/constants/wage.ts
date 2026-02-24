/**
 * UMK 2025 (Upah Minimum Kabupaten/Kota) - Bali Province
 * Regional minimum wages for all 9 regencies/cities in Bali
 *
 * These values are used for "Rate Bali" compliance badge calculation.
 * A job is considered compliant if its wage meets or exceeds the UMK for its location.
 *
 * Source: Based on UMK 2025 official data from Bali Provincial Government
 */
export const UMK_2025 = {
  /** Kabupaten Badung - Rp 2,693,602 */
  Badung: 2693602,

  /** Kota Denpasar - Rp 2,513,191 */
  Denpasar: 2513191,

  /** Kabupaten Gianyar - Rp 2,376,375 */
  Gianyar: 2376375,

  /** Kabupaten Tabanan - Rp 2,363,745 */
  Tabanan: 2363745,

  /** Kabupaten Buleleng - Rp 2,282,689 */
  Buleleng: 2282689,

  /** Kabupaten Jembrana - Rp 2,282,689 */
  Jembrana: 2282689,

  /** Kabupaten Klungkung - Rp 2,282,689 */
  Klungkung: 2282689,

  /** Kabupaten Karangasem - Rp 2,282,689 */
  Karangasem: 2282689,

  /** Kabupaten Bangli - Rp 2,282,689 */
  Bangli: 2282689,
} as const

/**
 * Get UMK value by regency/city name (case-insensitive)
 * @param name - Name of the regency/city (e.g., "Badung", "denpasar", "KOTA DENPASAR")
 * @returns UMK value in IDR, or undefined if not found
 */
export function getUMK(name: string): number | undefined {
  const normalizedName = name.toLowerCase().replace(/^kota |kabupaten /gi, '').trim()

  const regencyMap: Record<string, number> = {
    badung: UMK_2025.Badung,
    denpasar: UMK_2025.Denpasar,
    gianyar: UMK_2025.Gianyar,
    tabanan: UMK_2025.Tabanan,
    buleleng: UMK_2025.Buleleng,
    jembrana: UMK_2025.Jembrana,
    klungkung: UMK_2025.Klungkung,
    karangasem: UMK_2025.Karangasem,
    bangli: UMK_2025.Bangli,
    singaraja: UMK_2025.Buleleng, // Alias for Buleleng regency capital
    negara: UMK_2025.Jembrana, // Alias for Jembrana regency capital
    semarapura: UMK_2025.Klungkung, // Alias for Klungkung regency capital
    amlapura: UMK_2025.Karangasem, // Alias for Karangasem regency capital
  }

  return regencyMap[normalizedName]
}

/**
 * Check if a wage is compliant with UMK for a specific location
 * @param wage - The wage amount to check (in IDR)
 * @param location - The regency/city name
 * @returns true if wage meets or exceeds UMK, false otherwise
 */
export function isUMKCompliant(wage: number, location: string): boolean {
  const umk = getUMK(location)
  if (!umk) return false
  return wage >= umk
}

/**
 * Get all available regency/city names
 * @returns Array of regency/city names
 */
export function getUMKLocations(): string[] {
  return Object.keys(UMK_2025)
}

/**
 * UMK 2025 type definition for type safety
 */
export type UMKLocation = keyof typeof UMK_2025
