export interface PositionType {
  value: string
  label: string
  category: string
}

export const POSITION_TYPES: PositionType[] = [
  // Front of House
  { value: 'server', label: 'Server', category: 'Front of House' },
  { value: 'bartender', label: 'Bartender', category: 'Front of House' },
  { value: 'receptionist', label: 'Receptionist', category: 'Front of House' },
  { value: 'host_hostess', label: 'Host/Hostess', category: 'Front of House' },

  // Housekeeping
  { value: 'housekeeping', label: 'Housekeeping', category: 'Housekeeping' },
  { value: 'laundry_staff', label: 'Laundry Staff', category: 'Housekeeping' },
  { value: 'public_area_attendant', label: 'Public Area Attendant', category: 'Housekeeping' },

  // Kitchen
  { value: 'kitchen_staff', label: 'Kitchen Staff', category: 'Kitchen' },
  { value: 'chef', label: 'Chef', category: 'Kitchen' },
  { value: 'sous_chef', label: 'Sous Chef', category: 'Kitchen' },
  { value: 'line_cook', label: 'Line Cook', category: 'Kitchen' },
  { value: 'dishwasher', label: 'Dishwasher', category: 'Kitchen' },
  { value: 'steward', label: 'Steward', category: 'Kitchen' },

  // Service & Support
  { value: 'driver', label: 'Driver', category: 'Service & Support' },
  { value: 'bellman', label: 'Bellman', category: 'Service & Support' },
  { value: 'concierge', label: 'Concierge', category: 'Service & Support' },
  { value: 'porter', label: 'Porter', category: 'Service & Support' },

  // Wellness & Recreation
  { value: 'spa_therapist', label: 'Spa Therapist', category: 'Wellness & Recreation' },
  { value: 'pool_attendant', label: 'Pool Attendant', category: 'Wellness & Recreation' },
  { value: 'fitness_instructor', label: 'Fitness Instructor', category: 'Wellness & Recreation' },
  { value: 'tour_guide', label: 'Tour Guide', category: 'Wellness & Recreation' },

  // Facilities & Maintenance
  { value: 'maintenance', label: 'Maintenance', category: 'Facilities & Maintenance' },
  { value: 'gardener', label: 'Gardener', category: 'Facilities & Maintenance' },
  { value: 'technician', label: 'Technician', category: 'Facilities & Maintenance' },

  // Events
  { value: 'event_staff', label: 'Event Staff', category: 'Events' },
  { value: 'setup_crew', label: 'Setup Crew', category: 'Events' },
  { value: 'security', label: 'Security', category: 'Events' },

  // Management & Supervision
  { value: 'supervisor', label: 'Supervisor', category: 'Management' },
  { value: 'manager', label: 'Manager', category: 'Management' },
]

export const POSITION_TYPE_CATEGORIES = [
  'Front of House',
  'Housekeeping',
  'Kitchen',
  'Service & Support',
  'Wellness & Recreation',
  'Facilities & Maintenance',
  'Events',
  'Management',
]

export function getPositionTypeByValue(value: string): PositionType | undefined {
  return POSITION_TYPES.find(type => type.value === value)
}

export function getPositionTypesByCategory(category: string): PositionType[] {
  return POSITION_TYPES.filter(type => type.category === category)
}
