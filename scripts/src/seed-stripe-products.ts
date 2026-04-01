import { getUncachableStripeClient } from './stripeClient';

async function createProducts() {
  try {
    const stripe = await getUncachableStripeClient();

    console.log('Creating SETPIECE subscription products in Stripe...');

    const existingSolo = await stripe.products.search({
      query: "name:'Solo Coach' AND active:'true'"
    });

    if (existingSolo.data.length > 0) {
      console.log('Solo Coach product already exists:', existingSolo.data[0].id);
    } else {
      const soloProduct = await stripe.products.create({
        name: 'Solo Coach',
        description: 'For individual coaches managing one team with advanced features',
        metadata: { tierId: 'solo_coach' },
      });
      console.log(`Created product: ${soloProduct.name} (${soloProduct.id})`);

      const soloPrice = await stripe.prices.create({
        product: soloProduct.id,
        unit_amount: 800,
        currency: 'chf',
        recurring: { interval: 'month' },
        metadata: { tierId: 'solo_coach' },
      });
      console.log(`Created price: 8 CHF/month (${soloPrice.id})`);
    }

    const existingTeam = await stripe.products.search({
      query: "name:'Team' AND active:'true'"
    });

    if (existingTeam.data.length > 0) {
      console.log('Team product already exists:', existingTeam.data[0].id);
    } else {
      const teamProduct = await stripe.products.create({
        name: 'Team',
        description: 'For coaching staff managing multiple teams with full platform access',
        metadata: { tierId: 'team' },
      });
      console.log(`Created product: ${teamProduct.name} (${teamProduct.id})`);

      const teamPrice = await stripe.prices.create({
        product: teamProduct.id,
        unit_amount: 1900,
        currency: 'chf',
        recurring: { interval: 'month' },
        metadata: { tierId: 'team' },
      });
      console.log(`Created price: 19 CHF/month (${teamPrice.id})`);
    }

    console.log('\nDone! Webhooks will sync this data to your database automatically.');
    console.log('Use the Stripe Dashboard to see your products.');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error creating products:', message);
    process.exit(1);
  }
}

createProducts();
