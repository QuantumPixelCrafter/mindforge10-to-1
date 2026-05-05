import { getUncachableStripeClient } from '../../artifacts/api-server/src/stripeClient';

const NEW_TIERS = [
  {
    oldNames: ['Supporter'],
    newName: 'Seed',
    description: 'Every great forest starts with a single seed. Your small contribution makes a real difference to us — thank you!',
    amount: 100,
    emoji: '🌱',
    category: 'support',
  },
  {
    oldNames: ['Champion'],
    newName: 'Sprout',
    description: 'A sprout pushing toward the light. Your generosity helps Mind Forge grow and bring new features to students everywhere.',
    amount: 200,
    emoji: '🌿',
    category: 'support',
  },
  {
    oldNames: ['Legend'],
    newName: 'Oak',
    description: 'Mighty oaks from little acorns grow. Your generous contribution helps keep Mind Forge free and growing for every student.',
    amount: 500,
    emoji: '🌳',
    category: 'support',
  },
];

async function updateSupportTiers() {
  try {
    const stripe = await getUncachableStripeClient();
    console.log('Updating Mind Forge support tiers...');

    // Deactivate all existing support products
    const allProducts = await stripe.products.list({ active: true, limit: 100 });
    const supportProducts = allProducts.data.filter(p =>
      (p.metadata as Record<string, string>)?.category === 'support'
    );

    console.log(`Found ${supportProducts.length} existing support product(s) — deactivating...`);
    for (const p of supportProducts) {
      // Deactivate all prices for this product
      const prices = await stripe.prices.list({ product: p.id, active: true });
      for (const price of prices.data) {
        await stripe.prices.update(price.id, { active: false });
        console.log(`  ✗ Deactivated price ${price.id} ($${(price.unit_amount ?? 0) / 100}) for ${p.name}`);
      }
      // Archive the product
      await stripe.products.update(p.id, { active: false });
      console.log(`  ✗ Archived product: ${p.name}`);
    }

    // Create the new tiers
    for (const tier of NEW_TIERS) {
      const product = await stripe.products.create({
        name: tier.newName,
        description: tier.description,
        metadata: { emoji: tier.emoji, category: tier.category },
      });

      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: tier.amount,
        currency: 'usd',
      });

      console.log(`${tier.emoji} Created ${tier.newName}: $${tier.amount / 100} (${price.id})`);
    }

    console.log('Done!');
  } catch (err: any) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

updateSupportTiers();
