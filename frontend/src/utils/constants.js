export const TRIP_TYPES = [
  { key: 'beach', label: 'Beach', emoji: '🏖️' },
  { key: 'cultural', label: 'Cultural', emoji: '🏛️' },
  { key: 'adventure', label: 'Adventure', emoji: '🧭' },
  { key: 'mountain', label: 'Mountain', emoji: '🏔️' },
  { key: 'city', label: 'City', emoji: '🏙️' },
];

export const DIET_OPTIONS = [
  { value: 'any', label: 'Any' },
  { value: 'veg', label: 'Veg' },
  { value: 'non-veg', label: 'Non-veg' },
  { value: 'jain', label: 'Jain' },
  { value: 'eggetarian', label: 'Eggetarian' },
];

export const SAMPLE_COVERS = {
  goa: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1600&q=70',
  manali:
    'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1600&q=70',
  jaipur:
    'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=1600&q=70',
  rishikesh:
    'https://images.unsplash.com/photo-1591019479261-1a103585c559?auto=format&fit=crop&w=1600&q=70',
  kerala:
    'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=1600&q=70',
  generic:
    'https://images.unsplash.com/photo-1500835556837-99ac94a94552?auto=format&fit=crop&w=1600&q=70',
};

// Pick a cover image URL based on destination text.
export function pickCover(destination = '') {
  const d = destination.toLowerCase();
  if (d.includes('goa')) return SAMPLE_COVERS.goa;
  if (d.includes('manali') || d.includes('himal')) return SAMPLE_COVERS.manali;
  if (d.includes('jaipur') || d.includes('rajasthan')) return SAMPLE_COVERS.jaipur;
  if (d.includes('rishikesh') || d.includes('haridwar'))
    return SAMPLE_COVERS.rishikesh;
  if (d.includes('kerala') || d.includes('backwater')) return SAMPLE_COVERS.kerala;
  return SAMPLE_COVERS.generic;
}

export const LS = {
  TOKEN: 'safarsplit.token',
  USER: 'safarsplit.user',
};