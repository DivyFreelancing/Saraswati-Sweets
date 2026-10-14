import { Category } from '../types/database';

export const SEED_CATEGORIES: Category[] = [
  {
    id: 'c1000000-0000-0000-0000-000000000002',
    name: 'Meva',
    slug: 'meva',
    description: 'Finest artisanal cashews, almonds, pistachios, figs, and royal dry-fruit confections.',
    image_url: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=80',
    display_order: 1,
    is_active: true,
  },
  {
    id: '883ae551-dee9-47e0-84e3-651883073ccb',
    name: 'Bengali',
    slug: 'bengali',
    description: 'Fresh milk chhena sweets, soft, spongy, and steeped in aromatic saffron and rose nectars.',
    image_url: 'https://images.unsplash.com/photo-1541832676-9b763b0239ab?auto=format&fit=crop&w=600&q=80',
    display_order: 2,
    is_active: true,
  },
  {
    id: 'c1000000-0000-0000-0000-000000000001',
    name: 'Ghee',
    slug: 'ghee',
    description: 'Handcrafted in 100% pure cow desi ghee with traditional Awadhi heritage recipes since 1989.',
    image_url: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=600&q=80',
    display_order: 3,
    is_active: true,
  },
  {
    id: '284272ed-691e-4720-ba2b-11a711478638',
    name: 'Khoya',
    slug: 'khoya',
    description: 'Slow-roasted condensed buffalo milk pedas, rich burfis, and classic mawa confections.',
    image_url: 'https://images.unsplash.com/photo-1505253758473-96b7015fcd40?auto=format&fit=crop&w=600&q=80',
    display_order: 4,
    is_active: true,
  },
  {
    id: 'c1000000-0000-0000-0000-000000000005',
    name: 'Namkeen',
    slug: 'namkeen',
    description: 'Crunchy traditional Awadhi snacks, dalmoth, mathri, and savory treats fried fresh in cold-pressed oil.',
    image_url: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=600&q=80',
    display_order: 5,
    is_active: true,
  },
];
