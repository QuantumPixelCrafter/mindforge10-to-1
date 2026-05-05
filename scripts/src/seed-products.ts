import { getUncachableStripeClient } from '../../artifacts/api-server/src/stripeClient';

const SUPPORT_TIERS = [
  {
    name: 'Supporter',
    description: 'Buy us a coffee! Every bit helps keep Mind Forge running.',
    amount: 200,
    emoji: '☕',
    category: 'support',
  },
  {
    name: 'Champion',
    description: 'A generous donation that helps us build new features and improve the app.',
    amount: 500,
    emoji: '⭐',
    category: 'support',
  },
  {
    name: 'Legend',
    description: 'An incredible contribution that makes a huge difference to our team.',
    amount: 1000,
    emoji: '🏆',
    category: 'support',
  },
];

const COIN_PACKS = [
  {
    name: 'Starter Pack',
    description: 'A quick boost to get you started. Perfect for grabbing that background you\'ve been eyeing.',
    amount: 199,
    bonus_points: 500,
    emoji: '⚡',
    category: 'coins',
  },
  {
    name: 'Value Pack',
    description: 'Great value for dedicated students. Unlock frames, nametags, and more in one go.',
    amount: 499,
    bonus_points: 1500,
    emoji: '💎',
    category: 'coins',
  },
  {
    name: 'Mega Pack',
    description: 'The ultimate point haul. Unlock everything you want and flex your style.',
    amount: 1499,
    bonus_points: 5000,
    emoji: '🚀',
    category: 'coins',
  },
];

async function seedProducts() {
  try {
    const stripe = await getUncachableStripeClient();
    console.log('Seeding Mind Forge products...');

    for (const tier of SUPPORT_TIERS) {
      const existing = await stripe.products.search({
        query: `name:'${tier.name}' AND active:'true'`,
      });

      if (existing.data.length > 0) {
        console.log(`${tier.emoji} ${tier.name} already exists — skipping`);
        continue;
      }

      const product = await stripe.products.create({
        name: tier.name,
        description: tier.description,
        metadata: { emoji: tier.emoji, category: tier.category },
      });

      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: tier.amount,
        currency: 'usd',
      });

      console.log(`${tier.emoji} Created ${tier.name}: $${tier.amount / 100} (${price.id})`);
    }

    for (const pack of COIN_PACKS) {
      const existing = await stripe.products.search({
        query: `name:'${pack.name}' AND active:'true'`,
      });

      if (existing.data.length > 0) {
        console.log(`${pack.emoji} ${pack.name} already exists — skipping`);
        continue;
      }

      const product = await stripe.products.create({
        name: pack.name,
        description: pack.description,
        metadata: {
          emoji: pack.emoji,
          category: pack.category,
          bonus_points: String(pack.bonus_points),
        },
      });

      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: pack.amount,
        currency: 'usd',
      });

      console.log(`${pack.emoji} Created ${pack.name}: $${pack.amount / 100} → ${pack.bonus_points} pts (${price.id})`);
    }

    console.log('Done!');
  } catch (err: any) {
    console.error('Error seeding products:', err.message);
    process.exit(1);
  }
}

seedProducts();
