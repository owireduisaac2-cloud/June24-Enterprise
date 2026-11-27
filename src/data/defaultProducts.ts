import type { Product } from '../types';

export interface HeroSlide {
  id: string;
  kicker: string;
  titlePrefix: string;
  titleHighlight: string;
  subtitle: string;
  ctaLabel: string;
  ctaCategory: 'cadet' | 'ghana';
  imageUrl: string;
  imageAlt: string;
  captionTitle: string;
  captionPrice: string;
}

export const HERO_SLIDES: HeroSlide[] = [
  {
    id: 'slide-tactical',
    kicker: 'Official Enterprise Store',
    titlePrefix: 'High-Quality Boots,',
    titleHighlight: 'Cadet & Tactical Gear',
    subtitle:
      'Serving security agencies, schools, cadet corps, and individual buyers across Ghana with durable footwear and authentic goods.',
    ctaLabel: 'Shop Cadet Gear',
    ctaCategory: 'cadet',
    imageUrl: '/src/assets/images/hero_tactical_boots_1795777812064.jpg',
    imageAlt: 'Matte black tactical military boots and polished cadet parade shoes on dark basalt stone',
    captionTitle: 'Cadet & Security Special',
    captionPrice: 'Starting at GH₵ 280.00',
  },
  {
    id: 'slide-ghana',
    kicker: 'Made In Ghana',
    titlePrefix: 'Authentic Handcrafted',
    titleHighlight: 'Ghanaian Leather Shoes',
    subtitle:
      'Locally sourced, handmade leather loafers, slippers, and formal shoes designed for comfort and everyday style.',
    ctaLabel: 'Browse Ghanaian Wear',
    ctaCategory: 'ghana',
    imageUrl: '/src/assets/images/hero_ghana_leather_1795777812548.jpg',
    imageAlt: 'Handcrafted Ghanaian cognac leather loafers and native leather slippers in an artisan workshop',
    captionTitle: 'Handmade Leather Footwear',
    captionPrice: 'From GH₵ 180.00',
  },
];

export const DEFAULT_PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'ASICS Gel-Picteer Trail Sneakers',
    category: 'footwear',
    price: 420,
    icon: 'fa-shoe-prints',
    tag: 'Hot Release',
    imageUrls: ['/src/assets/images/product_asics_trail_1795777812585.jpg'],
    description:
      'Rugged trail sneakers featuring gel cushioning and reinforced rubber outsole for superior outdoor grip.',
    source: 'default',
    reviews: [
      {
        id: 'curated-1-1',
        productId: '1',
        author: 'Kwame Boateng',
        location: 'East Legon, Accra',
        rating: 5,
        comment:
          'Solid grip on wet concrete and gravel. Delivered within 24 hours and the sizing fit true to EU 43.',
        createdAtText: 'Oct 18, 2026',
        verifiedBuyer: true,
        source: 'curated',
      },
      {
        id: 'curated-1-2',
        productId: '1',
        author: 'Abena Mensah',
        location: 'Kumasi',
        rating: 5,
        comment:
          'Bought a pair for morning runs—very light on the feet with firm heel support.',
        createdAtText: 'Nov 02, 2026',
        verifiedBuyer: true,
        source: 'curated',
      },
    ],
  },
  {
    id: '2',
    name: 'High-Cut Tactical Military Boot',
    category: 'cadet',
    price: 340,
    icon: 'fa-person-military-rifle',
    tag: 'Best Seller',
    imageUrls: ['/src/assets/images/product_tactical_boot_1795777813629.jpg'],
    description:
      'Heavy-duty high-cut tactical boots for security officers and cadets. Features water-resistant leather.',
    source: 'default',
    reviews: [
      {
        id: 'curated-2-1',
        productId: '2',
        author: 'Sgt. Emmanuel Tetteh',
        location: 'Tema',
        rating: 5,
        comment:
          'Ordered 12 pairs for our private security detail. Stitching holds up through long night patrols.',
        createdAtText: 'Oct 29, 2026',
        verifiedBuyer: true,
        source: 'curated',
      },
      {
        id: 'curated-2-2',
        productId: '2',
        author: 'Nana Yaw Osei',
        location: 'Takoradi',
        rating: 4,
        comment:
          'Tough leather and strong ankle support. Takes a day to break in, then feels great.',
        createdAtText: 'Nov 10, 2026',
        verifiedBuyer: true,
        source: 'curated',
      },
    ],
  },
  {
    id: '3',
    name: 'Made in Ghana Handmade Leather Loafers',
    category: 'ghana',
    price: 220,
    icon: 'fa-shoe-prints',
    tag: 'Ghana Crafted',
    imageUrls: ['/src/assets/images/product_ghana_loafers_1795777813156.jpg'],
    description:
      '100% genuine Ghanaian handcrafted leather loafers. Comfortable and durable for formal or semi-formal wear.',
    source: 'default',
    reviews: [
      {
        id: 'curated-3-1',
        productId: '3',
        author: 'Kofi Annan-Forson',
        location: 'Airport Residential, Accra',
        rating: 5,
        comment:
          'Clean finishing and genuine leather smell right out of the box. Proudly wears well with kaftan or suits.',
        createdAtText: 'Nov 04, 2026',
        verifiedBuyer: true,
        source: 'curated',
      },
      {
        id: 'curated-3-2',
        productId: '3',
        author: 'Samuel Adjei',
        location: 'Koforidua',
        rating: 5,
        comment:
          'Soft insole for full office days and church on Sundays. Great local craftsmanship.',
        createdAtText: 'Nov 14, 2026',
        verifiedBuyer: true,
        source: 'curated',
      },
    ],
  },
  {
    id: '4',
    name: 'School Cadet Parade Officers Shoe',
    category: 'cadet',
    price: 280,
    icon: 'fa-user-tie',
    tag: 'Cadet Spec',
    imageUrls: ['/src/assets/images/product_cadet_parade_shoe_1795777813939.jpg'],
    description:
      'Polished Oxford-style parade shoes designed for school cadet corps inspections and official events.',
    source: 'default',
    reviews: [
      {
        id: 'curated-4-1',
        productId: '4',
        author: 'Cadet Cmdr. Bright Appiah',
        location: 'Cape Coast',
        rating: 5,
        comment:
          'Mirror shine straight out of the box and sturdy sole for parade drills. Passed inspection easily.',
        createdAtText: 'Oct 25, 2026',
        verifiedBuyer: true,
        source: 'curated',
      },
    ],
  },
  {
    id: '5',
    name: 'Ghana National Team Streetwear Jersey',
    category: 'clothing',
    price: 160,
    icon: 'fa-shirt',
    tag: 'Official Edition',
    imageUrls: ['/src/assets/images/product_ghana_jersey_1795777814326.jpg'],
    description:
      'Breathable polyester fan jersey with authentic national emblem embroidery.',
    source: 'default',
    reviews: [
      {
        id: 'curated-5-1',
        productId: '5',
        author: 'Yaw Amoako',
        location: 'Osu, Accra',
        rating: 5,
        comment:
          'Fabric stays cool in afternoon heat and the crest embroidery is neat.',
        createdAtText: 'Nov 08, 2026',
        verifiedBuyer: true,
        source: 'curated',
      },
    ],
  },
  {
    id: '6',
    name: 'Heavy Duty Security Belt & Accessories Set',
    category: 'cadet',
    price: 120,
    icon: 'fa-shield-halved',
    tag: 'Gear',
    imageUrls: ['/src/assets/images/product_tactical_belt_set_1795777815575.jpg'],
    description:
      'Complete tactical utility belt with heavy-duty brass buckle and pouch attachments.',
    source: 'default',
    reviews: [
      {
        id: 'curated-6-1',
        productId: '6',
        author: 'Isaac Nyarko',
        location: 'Tamale',
        rating: 5,
        comment:
          'Thick webbing and brass buckle does not slip even with pouch attachments loaded.',
        createdAtText: 'Nov 06, 2026',
        verifiedBuyer: true,
        source: 'curated',
      },
    ],
  },
  {
    id: '7',
    name: 'Handcrafted Male Native Leather Slippers',
    category: 'ghana',
    price: 180,
    icon: 'fa-shoe-prints',
    tag: '100% Leather',
    imageUrls: ['/src/assets/images/hero_ghana_leather_1795777812548.jpg'],
    description:
      'Traditional Ghanaian leather slippers crafted for longevity and traditional occasions.',
    source: 'default',
    reviews: [
      {
        id: 'curated-7-1',
        productId: '7',
        author: 'Kwadwo Frimpong',
        location: 'Adum, Kumasi',
        rating: 5,
        comment:
          'Very neat Kumasi-style stitching and comfortable strap width. Paired nicely with kente.',
        createdAtText: 'Nov 12, 2026',
        verifiedBuyer: true,
        source: 'curated',
      },
    ],
  },
  {
    id: '8',
    name: 'Low-Top Urban Casual Sneakers',
    category: 'footwear',
    price: 250,
    icon: 'fa-shoe-prints',
    tag: 'New Arrival',
    description: 'Lightweight casual sneakers designed for everyday street wear.',
    source: 'default',
    reviews: [
      {
        id: 'curated-8-1',
        productId: '8',
        author: 'Esi Arthur',
        location: 'Dansoman, Accra',
        rating: 4,
        comment:
          'Light everyday pair for campus walks and errands. Easy to wipe clean.',
        createdAtText: 'Nov 15, 2026',
        verifiedBuyer: true,
        source: 'curated',
      },
    ],
  },
  {
    id: '9',
    name: 'Customized Enterprise Crewneck Sweater',
    category: 'clothing',
    price: 195,
    icon: 'fa-shirt',
    tag: 'Apparel',
    description:
      'Soft fleece cotton crewneck sweater featuring June 24 Enterprise insignia.',
    source: 'default',
    reviews: [
      {
        id: 'curated-9-1',
        productId: '9',
        author: 'Daniel Ofori',
        location: 'Spintex, Accra',
        rating: 5,
        comment:
          'Warm interior fleece without feeling bulky. Print stayed sharp after washing.',
        createdAtText: 'Nov 11, 2026',
        verifiedBuyer: true,
        source: 'curated',
      },
    ],
  },
];

export const CATEGORY_LABELS: Record<string, string> = {
  all: 'All Items',
  footwear: 'Boots & Shoes',
  cadet: 'Uniforms & Tactical',
  ghana: 'Made In Ghana',
  clothing: 'Sneakers & More',
};
