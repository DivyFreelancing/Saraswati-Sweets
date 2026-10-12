export interface CertificationDocument {
  id: string;
  title: string;
  hindiTitle?: string;
  category: 'food-safety' | 'agricultural-programme' | 'facility-safety';
  categoryLabel: string;
  classification: 'Statutory State License' | 'State Programme Certificate' | 'Safety Equipment Service Record';
  authority: string;
  recipient: string;
  premises: string;
  identifierLabel: string;
  identifierValue: string;
  dateOrValidity: string;
  image: string;
  thumbnail: string;
  aspectRatio: string; // e.g. '3/4' or '4/3'
  altText: string;
  featured: boolean;
  factualSummary: string;
  highlights: string[];
  signatories?: string[];
  disclaimer?: string;
}

export const CERTIFICATION_DOCUMENTS: CertificationDocument[] = [
  {
    id: 'fssai-state-license',
    title: 'FSSAI Food Safety State License (Form C)',
    hindiTitle: 'खाद्य सुरक्षा एवं मानक प्राधिकरण राज्य लाइसेंस (फॉर्म सी)',
    category: 'food-safety',
    categoryLabel: 'Food Safety & Regulation',
    classification: 'Statutory State License',
    authority: 'Department of Food Safety and Drug Administration, Government of Uttar Pradesh (FSSAI)',
    recipient: 'Saraswati Sweets',
    premises: 'Chaya Chauraha, Food Safety Zone-01, Nagar Palika Barabanki, Uttar Pradesh - 225001',
    identifierLabel: 'License Number',
    identifierValue: '12714022000190',
    dateOrValidity: 'Issued: 29-06-2024 · Valid Upto: 03-08-2029',
    image: '/images/certifications/fssai-state-license-form-c.webp',
    thumbnail: '/images/certifications/fssai-state-license-form-c.webp',
    aspectRatio: '3/4',
    altText: 'Official FSSAI State License Form C for Saraswati Sweets at Chaya Chauraha Barabanki, License Number 12714022000190, valid until 2029',
    featured: true,
    factualSummary:
      'Official Form C State License granted under the Food Safety and Standards Act, 2006 by the Department of Food Safety and Drug Administration, Uttar Pradesh. Authorizes Saraswati Sweets as a licensed food retail establishment complying with statutory hygiene and food safety standards.',
    highlights: [
      'Statutory State License under FSS Act, 2006',
      'Valid through August 3, 2029 (Renewal)',
      'Designated Zone: Food Safety Zone-01, Barabanki',
      'Kind of Business: Retailer / Sweet Confectionery',
    ],
    signatories: ['Designated Officer, Food Safety & Drug Administration, Barabanki'],
  },
  {
    id: 'up-millets-programme-2024-25',
    title: 'UP Millets Revival Programme Award (2024–25)',
    hindiTitle: 'उत्तर प्रदेश मिलेट्स पुनरोद्धार कार्यक्रम प्रमाण-पत्र (2024-25)',
    category: 'agricultural-programme',
    categoryLabel: 'Government Programme Certificate',
    classification: 'State Programme Certificate',
    authority: 'Department of Agriculture, Government of Uttar Pradesh & District Administration, Barabanki',
    recipient: 'Saraswati Sweets, Barabanki',
    premises: 'Kisan Kalyan Kendra, Barabanki',
    identifierLabel: 'Event & Recognition',
    identifierValue: '1st Prize (प्रथम स्थान) · ₹5,000/- Award',
    dateOrValidity: 'Awarded: 21 January 2025',
    image: '/images/certifications/up-millets-revival-programme-2024-25.webp',
    thumbnail: '/images/certifications/up-millets-revival-programme-2024-25.webp',
    aspectRatio: '4/3',
    altText: 'Government of Uttar Pradesh Millets Revival Programme 2024-25 First Prize Certificate awarded to Saraswati Sweets Barabanki on 21 January 2025',
    featured: false,
    factualSummary:
      'Award certificate presented to Saraswati Sweets for securing 1st Prize in the Millets Confectionery & Recipe Innovation event organized at Kisan Kalyan Kendra, Barabanki under the state sector Millets Revival Programme.',
    highlights: [
      'First Prize (प्रथम स्थान) in Millets Sweet Preparation',
      'Organized by Dept. of Agriculture, UP at Kisan Kalyan Kendra',
      'Official DBT prize disbursement of ₹5,000/-',
      'Event Date: 21 January 2025',
    ],
    signatories: [
      'Shashank Tripathi (I.A.S., District Magistrate / जिलाधिकारी, Barabanki)',
      'Anna Sudan (I.A.S., Chief Development Officer / मुख्य विकास अधिकारी, Barabanki)',
      'Shrawan Kumar (Deputy Director Agriculture / उप कृषि निदेशक, Barabanki)',
    ],
  },
  {
    id: 'up-millets-programme-2023-24',
    title: 'UP Millets Revival Programme Recognition (2023–24)',
    hindiTitle: 'उत्तर प्रदेश मिलेट्स पुनरोद्धार कार्यक्रम प्रमाण पत्र (2023-24)',
    category: 'agricultural-programme',
    categoryLabel: 'Government Programme Certificate',
    classification: 'State Programme Certificate',
    authority: 'Department of Agriculture, Government of Uttar Pradesh (State Sector)',
    recipient: 'Saraswati Sweets, Barabanki',
    premises: 'Government Girls Inter College (GGIC), Barabanki',
    identifierLabel: 'Event & Recognition',
    identifierValue: '2nd Prize Recognition · ₹3,500/- Award',
    dateOrValidity: 'Awarded: 15 February 2024',
    image: '/images/certifications/up-millets-revival-programme-2023-24.webp',
    thumbnail: '/images/certifications/up-millets-revival-programme-2023-24.webp',
    aspectRatio: '4/3',
    altText: 'Department of Agriculture UP Millets Revival Programme 2023-24 certificate awarded to Saraswati Sweets Barabanki for Shree Anna mithai creation',
    featured: false,
    factualSummary:
      'Certificate of achievement presented by the Department of Agriculture, Uttar Pradesh in recognition of traditional Shree Anna (millets) sweet confectionery crafted during the International Year of Millets initiative at GGIC, Barabanki.',
    highlights: [
      'Celebrated under the International Year of Millets & LiFE campaign',
      'Recognition for traditional Shree Anna sweet making',
      'Official DBT prize disbursement of ₹3,500/-',
      'Event Date: 15 February 2024',
    ],
    signatories: [
      'Satyendra Kumar (I.A.S., District Magistrate / जिलाधिकारी, Barabanki)',
      'A. Sudan (Chief Development Officer / मुख्य विकास अधिकारी, Barabanki)',
      'Shrawan Kumar (Deputy Director Agriculture / उप कृषि निदेशक, Barabanki)',
    ],
  },
  {
    id: 'fire-safety-refill-cert',
    title: 'Fire Safety Equipment Service & Refill Certificate',
    hindiTitle: 'अग्निशमन उपकरण सर्विस एवं रीफिल प्रमाण पत्र',
    category: 'facility-safety',
    categoryLabel: 'Store Safety Maintenance',
    classification: 'Safety Equipment Service Record',
    authority: 'New National Enterprises (Fire Fighting & Safety Maintenance Service)',
    recipient: 'M/s Saraswati Sweets',
    premises: 'Indira Market, Barabanki',
    identifierLabel: 'Service Ref. & Units',
    identifierValue: 'Ref: Ref-NNE/209 · 2× ABC (4kg) & 2× CO2 (4.5kg)',
    dateOrValidity: 'Serviced: 25-05-2026 · Cycle Thru: 24-05-2027',
    image: '/images/certifications/fire-extinguisher-service-certificate.webp',
    thumbnail: '/images/certifications/fire-extinguisher-service-certificate.webp',
    aspectRatio: '3/4',
    altText: 'Fire Extinguisher Refill & Inspection Certificate by New National Enterprises for Saraswati Sweets premises at Indira Market Barabanki',
    featured: false,
    factualSummary:
      'On-site fire safety maintenance record confirming the periodic testing, recharging, and operational fitness of commercial fire extinguishers deployed across the Saraswati Sweets kitchen and retail premises.',
    highlights: [
      'Active commercial fire-fighting apparatus maintenance',
      '2× ABC Dry Powder (4kg) and 2× CO2 gas (4.5kg) units tested',
      'Annual periodic refill protocol (25-05-2026 to 24-05-2027)',
      'Servicing Branch: Lakhpedabagh, Barabanki',
    ],
    signatories: ['Authorized Service Engineer, New National Enterprises'],
    disclaimer:
      'Factual Notice: This document represents routine commercial equipment testing and refill service by an authorized safety vendor. It is a safety maintenance record and not a statutory government license.',
  },
];
