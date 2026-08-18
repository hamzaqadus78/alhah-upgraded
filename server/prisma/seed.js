/**
 * Seeds the shop catalogue from the 9 products already known to the site
 * (previously only usable as no-price enquiry items in js/cart.js).
 *
 * Prices/descriptions below are DEMO DATA ONLY — for trying out the full
 * shop flow locally. MOQ/stock figures reuse the real MOQ values already
 * shown elsewhere on the site (index.html/DentalSurgery.html product
 * cards); prices are placeholders. Replace with real figures in Prisma
 * Studio (`npm run prisma:studio`) before this ever goes live — see plan
 * Part B10, item 1.
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const products = [
  {
    sku: 'DENTAL-001',
    name: 'Dental Extraction Forceps Set',
    slug: 'dental-extraction-forceps-set',
    category: 'Dental Surgery',
    description: '[DEMO DATA] Precision forceps set for tooth extraction procedures.',
    images: ['img/Dental3.jpg'],
    priceCents: 2400, moq: 10, stock: 100,
  },
  {
    sku: 'DENTAL-002',
    name: 'Periodontal Probe & Explorer',
    slug: 'periodontal-probe-explorer',
    category: 'Dental Surgery',
    description: '[DEMO DATA] Combination probe and explorer for periodontal examination.',
    images: ['img/DENTAL1.jpg'],
    priceCents: 950, moq: 25, stock: 250,
  },
  {
    sku: 'DENTAL-003',
    name: 'Luxating Elevator Set (5-piece)',
    slug: 'luxating-elevator-set-5-piece',
    category: 'Dental Surgery',
    description: '[DEMO DATA] 5-piece luxating elevator set for atraumatic tooth extraction.',
    images: ['img/Dental2.webp'],
    priceCents: 4500, moq: 5, stock: 50,
  },
  {
    sku: 'DENTAL-004',
    name: 'Sickle Scaler & Curette Set',
    slug: 'sickle-scaler-curette-set',
    category: 'Dental Surgery',
    description: '[DEMO DATA] Sickle scaler and curette set for scaling and root planing.',
    images: ['img/img1.jpg'],
    priceCents: 1400, moq: 20, stock: 200,
  },
  {
    sku: 'DENTAL-005',
    name: 'Mouth Mirror & Tweezers Set',
    slug: 'mouth-mirror-tweezers-set',
    category: 'Dental Surgery',
    description: '[DEMO DATA] Standard mouth mirror and dental tweezers set.',
    images: ['img/img2.jpg'],
    priceCents: 650, moq: 50, stock: 500,
  },
  {
    sku: 'DENTAL-006',
    name: 'Dental Needle Holder (Mathieu)',
    slug: 'dental-needle-holder-mathieu',
    category: 'Dental Surgery',
    description: '[DEMO DATA] Mathieu-pattern needle holder for dental suturing.',
    images: ['img/img4.jpg'],
    priceCents: 1100, moq: 15, stock: 150,
  },
  // Non-dental categories are out of scope for now — kept here (commented)
  // so they're easy to bring back later instead of retyping from scratch.
  // {
  //   sku: 'PLASTIC-001',
  //   name: 'Metzenbaum Dissecting Scissors',
  //   slug: 'metzenbaum-dissecting-scissors',
  //   category: 'Plastic Surgery',
  //   description: '[DEMO DATA] Fine dissecting scissors for delicate tissue handling.',
  //   images: ['img/plastic.webp'],
  //   priceCents: 1800, moq: 12, stock: 120,
  // },
  // {
  //   sku: 'PLASTIC-002',
  //   name: 'Skin Hook & Retractor Set',
  //   slug: 'skin-hook-retractor-set',
  //   category: 'Plastic Surgery',
  //   description: '[DEMO DATA] Skin hook and retractor set for plastic surgery procedures.',
  //   images: ['img/spinal.jpg'],
  //   priceCents: 2200, moq: 8, stock: 80,
  // },
  // {
  //   sku: 'OPHTHAL-001',
  //   name: 'Micro Forceps & Needle Holder Set',
  //   slug: 'micro-forceps-needle-holder-set',
  //   category: 'Ophthalmic Surgery',
  //   description: '[DEMO DATA] Micro-surgical forceps and needle holder set for ophthalmic procedures.',
  //   images: ['img/ophthalmic.jpg'],
  //   priceCents: 3800, moq: 10, stock: 100,
  // },
];

async function main() {
  for (const p of products) {
    await prisma.product.upsert({
      where: { sku: p.sku },
      update: { ...p, currency: 'USD', active: true },
      create: { ...p, currency: 'USD', active: true },
    });
  }

  // Site is dental-only for now. Deactivate any previously-seeded products
  // in other categories instead of deleting them, so nothing 404s if an
  // old order still references one, and they're one flip away from back on.
  const { count } = await prisma.product.updateMany({
    where: { category: { not: 'Dental Surgery' } },
    data: { active: false },
  });

  console.log(`Seeded ${products.length} products with DEMO pricing (active: true). Deactivated ${count} non-dental product(s). Replace with real prices in Prisma Studio before going live.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
