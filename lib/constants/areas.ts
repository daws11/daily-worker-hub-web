export interface Area {
  value: string
  label: string
  regency: string
}

export const BALI_AREAS: Area[] = [
  // Badung
  { value: 'kuta', label: 'Kuta', regency: 'Badung' },
  { value: 'legian', label: 'Legian', regency: 'Badung' },
  { value: 'seminyak', label: 'Seminyak', regency: 'Badung' },
  { value: 'canggu', label: 'Canggu', regency: 'Badung' },
  { value: 'uluwatu', label: 'Uluwatu', regency: 'Badung' },
  { value: 'nusa_dua', label: 'Nusa Dua', regency: 'Badung' },
  { value: 'jimbaran', label: 'Jimbaran', regency: 'Badung' },
  { value: 'mengwi', label: 'Mengwi', regency: 'Badung' },
  { value: 'abiansemal', label: 'Abiansemal', regency: 'Badung' },
  { value: 'kuta_selatan', label: 'Kuta Selatan', regency: 'Badung' },
  { value: 'kuta_utara', label: 'Kuta Utara', regency: 'Badung' },

  // Denpasar
  { value: 'denpasar_selatan', label: 'Denpasar Selatan', regency: 'Denpasar' },
  { value: 'denpasar_timur', label: 'Denpasar Timur', regency: 'Denpasar' },
  { value: 'denpasar_barat', label: 'Denpasar Barat', regency: 'Denpasar' },
  { value: 'denpasar_utara', label: 'Denpasar Utara', regency: 'Denpasar' },

  // Gianyar
  { value: 'ubud', label: 'Ubud', regency: 'Gianyar' },
  { value: 'sanur', label: 'Sanur', regency: 'Gianyar' },
  { value: 'sukawati', label: 'Sukawati', regency: 'Gianyar' },
  { value: 'gianyar_town', label: 'Gianyar Town', regency: 'Gianyar' },
  { value: 'blahbatuh', label: 'Blahbatuh', regency: 'Gianyar' },
  { value: 'tampaksiring', label: 'Tampaksiring', regency: 'Gianyar' },

  // Tabanan
  { value: 'tabanan_town', label: 'Tabanan Town', regency: 'Tabanan' },
  { value: 'tanah_lot', label: 'Tanah Lot', regency: 'Tabanan' },
  { value: 'kerambitan', label: 'Kerambitan', regency: 'Tabanan' },
  { value: 'baturiti', label: 'Baturiti', regency: 'Tabanan' },
  { value: 'selemadeg', label: 'Selemadeg', regency: 'Tabanan' },

  // Buleleng (North Bali)
  { value: 'singaraja', label: 'Singaraja', regency: 'Buleleng' },
  { value: 'lovina', label: 'Lovina', regency: 'Buleleng' },
  { value: 'tejakula', label: 'Tejakula', regency: 'Buleleng' },
  { value: 'kalibukbuk', label: 'Kalibukbuk', regency: 'Buleleng' },
  { value: 'gerokgak', label: 'Gerokgak', regency: 'Buleleng' },

  // Karangasem (East Bali)
  { value: 'amlapura', label: 'Amlapura', regency: 'Karangasem' },
  { value: 'candidasa', label: 'Candidasa', regency: 'Karangasem' },
  { value: 'tirta_gangga', label: 'Tirta Gangga', regency: 'Karangasem' },
  { value: 'sidemen', label: 'Sidemen', regency: 'Karangasem' },
  { value: 'abang', label: 'Abang', regency: 'Karangasem' },

  // Klungkung
  { value: 'semarapura', label: 'Semarapura', regency: 'Klungkung' },
  { value: 'nusapenida', label: 'Nusa Penida', regency: 'Klungkung' },
  { value: 'nusalembongan', label: 'Nusa Lembongan', regency: 'Klungkung' },

  // Bangli
  { value: 'bangli_town', label: 'Bangli Town', regency: 'Bangli' },
  { value: 'kintamani', label: 'Kintamani', regency: 'Bangli' },
  { value: 'tembuku', label: 'Tembuku', regency: 'Bangli' },

  // Jembrana (West Bali)
  { value: 'negara', label: 'Negara', regency: 'Jembrana' },
  { value: 'gilimanuk', label: 'Gilimanuk', regency: 'Jembrana' },
  { value: 'medewi', label: 'Medewi', regency: 'Jembrana' },
  { value: 'pecatu', label: 'Pecatu', regency: 'Jembrana' },
]

export const REGENCIES = [
  'Badung',
  'Denpasar',
  'Gianyar',
  'Tabanan',
  'Buleleng',
  'Karangasem',
  'Klungkung',
  'Bangli',
  'Jembrana',
]

export function getAreaByValue(value: string): Area | undefined {
  return BALI_AREAS.find(area => area.value === value)
}

export function getAreasByRegency(regency: string): Area[] {
  return BALI_AREAS.filter(area => area.regency === regency)
}
