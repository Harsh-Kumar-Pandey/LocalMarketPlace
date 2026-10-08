const productImages = {
  food: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=82',
  clothing: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=900&q=82',
  home: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=900&q=82',
  other: 'https://images.unsplash.com/photo-1490312278390-ab64016e0aa9?auto=format&fit=crop&w=900&q=82',
};

export function productImage(category = '', name = '') {
  const label = `${category} ${name}`.toLowerCase();

  if (/food|pickle|preserve|spice|snack|fruit|bake|sweet/.test(label)) return productImages.food;
  if (/cloth|wear|textile|towel|weave|fabric/.test(label)) return productImages.clothing;
  if (/home|decor|runner|jute|kitchen|craft/.test(label)) return productImages.home;

  return productImages.other;
}
