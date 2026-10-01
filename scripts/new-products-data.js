export const NEW_CATEGORIES = [
  {
    id: 'cat-namkeen-snacks',
    name: 'Namkeen & Snacks',
    slug: 'namkeen-snacks',
    description: 'A crisp, savory selection of traditional namkeen and snacks.',
    image_url: '',
    display_order: 7,
    is_active: true,
  }
];

export const RAW_PRODUCTS = [
  { name: 'Mini Samosa', slug: 'mini-samosa', skuBase: 'MINI-SAMOSA', p250: 170, p500: 340, p1kg: 680, categoryId: 'cat-namkeen-snacks' },
  { name: 'Mini Khasta', slug: 'mini-khasta', skuBase: 'MINI-KHASTA', p250: 170, p500: 340, p1kg: 680, categoryId: 'cat-namkeen-snacks' },
  { name: 'Plain Mathri', slug: 'plain-mathri', skuBase: 'PLAIN-MATHRI', p250: 170, p500: 340, p1kg: 680, categoryId: 'cat-namkeen-snacks' },
  { name: 'Achari Mathri', slug: 'achari-mathri', skuBase: 'ACHARI-MATHRI', p250: 180, p500: 360, p1kg: 720, categoryId: 'cat-namkeen-snacks' },
  { name: 'Achari Samosa', slug: 'achari-samosa', skuBase: 'ACHARI-SAMOSA', p250: 190, p500: 380, p1kg: 760, categoryId: 'cat-namkeen-snacks' },
  { name: 'Mewa Samosa', slug: 'mewa-samosa', skuBase: 'MEWA-SAMOSA', p250: 190, p500: 380, p1kg: 760, categoryId: 'cat-namkeen-snacks' },
  { name: 'Masoor Dalmoth', slug: 'masoor-dalmoth', skuBase: 'MASOOR-DALMOTH', p250: 200, p500: 400, p1kg: 800, categoryId: 'cat-namkeen-snacks' },
  { name: 'Pudina Mixture', slug: 'pudina-mixture', skuBase: 'PUDINA-MIXTURE', p250: 225, p500: 450, p1kg: 900, categoryId: 'cat-namkeen-snacks' },
  { name: 'Kaju Dalmoth', slug: 'kaju-dalmoth', skuBase: 'KAJU-DALMOTH', p250: 300, p500: 600, p1kg: 1200, categoryId: 'cat-namkeen-snacks' },
  { name: 'Sev (Besan)', slug: 'sev-besan', skuBase: 'SEV-BESAN', p250: 150, p500: 300, p1kg: 600, categoryId: 'cat-namkeen-snacks' },
  { name: 'Ganthe', slug: 'ganthe', skuBase: 'GANTHE', p250: 150, p500: 300, p1kg: 600, categoryId: 'cat-namkeen-snacks' }
].map(p => ({
  ...p,
  desc: `A crispy savory snack – ${p.name.toLowerCase()}.`,
  ingredients: '',
  shelfLife: 30,
  pureGhee: false,
  badge: 'Namkeen'
}));
