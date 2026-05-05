import { Router, type IRouter } from 'express';
import { db } from '@workspace/db';
import { usersTable, stripeClaimedSessionsTable, inboxMessagesTable, userAchievementsTable } from '@workspace/db/schema';
import { eq, sql, and, count } from 'drizzle-orm';
import { getUncachableStripeClient, getStripePublishableKey } from '../stripeClient';

const router: IRouter = Router();

// Award donation-based achievements and the Backer nametag on first-ever donation
async function awardDonationRewards(userId: string, productName: string) {
  // Map product name → achievement key
  const PRODUCT_ACHIEVEMENT: Record<string, string> = {
    'Seed':   'donated_seed',
    'Sprout': 'donated_sprout',
    'Oak':    'donated_oak',
  };
  const achievementKey = PRODUCT_ACHIEVEMENT[productName];
  if (achievementKey) {
    await db.insert(userAchievementsTable)
      .values({ userId, achievementKey })
      .onConflictDoNothing();
  }

  // Grant the Backer nametag on any first donation (if not already owned)
  const [claimCount] = await db
    .select({ n: count() })
    .from(stripeClaimedSessionsTable)
    .where(eq(stripeClaimedSessionsTable.userId, userId));
  if ((claimCount?.n ?? 0) <= 1) {
    // First donation — grant nametag if not already set or owned
    const [userRow] = await db
      .select({ equippedNametag: usersTable.equippedNametag })
      .from(usersTable)
      .where(eq(usersTable.id, userId));
    // Only auto-equip if they have nothing equipped (don't override their choice)
    if (!userRow?.equippedNametag) {
      await db.update(usersTable)
        .set({ equippedNametag: 'tag_backer' })
        .where(eq(usersTable.id, userId));
    }
  }
}

router.get('/stripe/config', async (_req, res) => {
  try {
    const publishableKey = await getStripePublishableKey();
    res.json({ publishableKey });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/stripe/products', async (_req, res) => {
  try {
    const result = await db.execute(
      sql`
        WITH paginated_products AS (
          SELECT id, name, description, metadata, active
          FROM stripe.products
          WHERE active = true
          ORDER BY id
        )
        SELECT
          p.id as product_id,
          p.name as product_name,
          p.description as product_description,
          p.metadata as product_metadata,
          pr.id as price_id,
          pr.unit_amount,
          pr.currency,
          pr.recurring,
          pr.active as price_active
        FROM paginated_products p
        LEFT JOIN stripe.prices pr ON pr.product = p.id AND pr.active = true
        ORDER BY pr.unit_amount ASC
      `
    );

    const productsMap = new Map<string, any>();
    for (const row of result.rows) {
      if (!productsMap.has(row.product_id as string)) {
        productsMap.set(row.product_id as string, {
          id: row.product_id,
          name: row.product_name,
          description: row.product_description,
          metadata: row.product_metadata,
          prices: [],
        });
      }
      if (row.price_id) {
        productsMap.get(row.product_id as string).prices.push({
          id: row.price_id,
          unit_amount: row.unit_amount,
          currency: row.currency,
          recurring: row.recurring,
        });
      }
    }

    res.json({ data: Array.from(productsMap.values()) });
  } catch (err: any) {
    console.error('Error fetching stripe products:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/stripe/checkout', async (req: any, res) => {
  try {
    const { priceId, amount, description } = req.body;
    if (!priceId && !amount) {
      return res.status(400).json({ error: 'priceId or amount is required' });
    }
    if (amount !== undefined && (typeof amount !== 'number' || amount < 100)) {
      return res.status(400).json({ error: 'amount must be at least 100 (cents)' });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const stripe = await getUncachableStripeClient();

    let customerId = user.stripeCustomerId ?? undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        metadata: { userId },
        ...(user.email ? { email: user.email } : {}),
        ...(user.username ? { name: user.username } : {}),
      });
      await db.update(usersTable)
        .set({ stripeCustomerId: customer.id })
        .where(eq(usersTable.id, userId));
      customerId = customer.id;
    }

    const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;

    const lineItems = priceId
      ? [{ price: priceId, quantity: 1 }]
      : [{
          price_data: {
            currency: 'usd',
            unit_amount: amount,
            product_data: { name: description ?? 'Donation' },
          },
          quantity: 1,
        }];

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      metadata: amount ? { bonus_points: '200' } : {},
      success_url: `${baseUrl}/support?success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/support?canceled=1`,
    });

    res.json({ url: session.url });
  } catch (err: any) {
    console.error('Checkout error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/stripe/claim', async (req: any, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const [existing] = await db
      .select()
      .from(stripeClaimedSessionsTable)
      .where(eq(stripeClaimedSessionsTable.sessionId, sessionId));

    if (existing) {
      return res.json({ alreadyClaimed: true, pointsAwarded: existing.pointsAwarded });
    }

    const stripe = await getUncachableStripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items.data.price.product'],
    });

    if (session.payment_status !== 'paid') {
      return res.status(400).json({ error: 'Payment not completed' });
    }

    const sessionBonusStr = (session.metadata as Record<string, string> | null)?.bonus_points;
    let bonusPoints = sessionBonusStr ? parseInt(sessionBonusStr, 10) : 0;

    if (!bonusPoints) {
      const lineItem = session.line_items?.data?.[0];
      const product = lineItem?.price?.product as any;
      const productBonusStr = product?.metadata?.bonus_points;
      bonusPoints = productBonusStr ? parseInt(productBonusStr, 10) : 0;
    }

    await db.insert(stripeClaimedSessionsTable).values({
      sessionId,
      userId,
      pointsAwarded: bonusPoints,
    });

    if (bonusPoints > 0) {
      await db.update(usersTable)
        .set({ bonusPoints: sql`${usersTable.bonusPoints} + ${bonusPoints}` })
        .where(eq(usersTable.id, userId));
    }

    // Award donation achievements + backer nametag
    const lineItem = session.line_items?.data?.[0];
    const product = lineItem?.price?.product as any;
    const productName: string = product?.name ?? '';
    await awardDonationRewards(userId, productName);

    res.json({ pointsAwarded: bonusPoints, alreadyClaimed: false });
  } catch (err: any) {
    console.error('Claim error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/stripe/queue-claim', async (req: any, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });

    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const [alreadyClaimed] = await db
      .select()
      .from(stripeClaimedSessionsTable)
      .where(eq(stripeClaimedSessionsTable.sessionId, sessionId));
    if (alreadyClaimed) return res.json({ alreadyClaimed: true });

    const [existingInbox] = await db
      .select()
      .from(inboxMessagesTable)
      .where(and(
        eq(inboxMessagesTable.recipientId, userId),
        eq(inboxMessagesTable.type, 'stripe_claim'),
        eq(inboxMessagesTable.targetUserId, sessionId),
      ));
    if (existingInbox) return res.json({ success: true, alreadyQueued: true });

    const stripe = await getUncachableStripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid') {
      return res.status(400).json({ error: 'Payment not completed' });
    }

    await db.insert(inboxMessagesTable).values({
      recipientId: userId,
      senderId: userId,
      type: 'stripe_claim',
      status: 'pending',
      points: 200,
      message: 'Thank you for your donation! Tap below to collect your reward.',
      targetUserId: sessionId,
    });

    res.json({ success: true });
  } catch (err: any) {
    console.error('Queue claim error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/stripe/inbox-claim', async (req: any, res) => {
  try {
    const { inboxMessageId } = req.body;
    if (!inboxMessageId) return res.status(400).json({ error: 'inboxMessageId is required' });

    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const [msg] = await db
      .select()
      .from(inboxMessagesTable)
      .where(and(
        eq(inboxMessagesTable.id, inboxMessageId),
        eq(inboxMessagesTable.recipientId, userId),
        eq(inboxMessagesTable.type, 'stripe_claim'),
      ));
    if (!msg) return res.status(404).json({ error: 'Message not found' });
    if (msg.status !== 'pending') return res.json({ alreadyClaimed: true, pointsAwarded: msg.points ?? 0 });

    const sessionId = msg.targetUserId!;
    const [existing] = await db
      .select()
      .from(stripeClaimedSessionsTable)
      .where(eq(stripeClaimedSessionsTable.sessionId, sessionId));

    if (existing) {
      await db.update(inboxMessagesTable)
        .set({ status: 'accepted', readAt: new Date() })
        .where(eq(inboxMessagesTable.id, inboxMessageId));
      return res.json({ alreadyClaimed: true, pointsAwarded: existing.pointsAwarded });
    }

    const bonusPoints = msg.points ?? 200;

    await db.insert(stripeClaimedSessionsTable).values({ sessionId, userId, pointsAwarded: bonusPoints });

    if (bonusPoints > 0) {
      await db.update(usersTable)
        .set({ bonusPoints: sql`${usersTable.bonusPoints} + ${bonusPoints}` })
        .where(eq(usersTable.id, userId));
    }

    await db.update(inboxMessagesTable)
      .set({ status: 'accepted', readAt: new Date() })
      .where(eq(inboxMessagesTable.id, inboxMessageId));

    // Retrieve session to get product name for achievement
    try {
      const stripe = await getUncachableStripeClient();
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['line_items.data.price.product'],
      });
      const lineItem = session.line_items?.data?.[0];
      const product = lineItem?.price?.product as any;
      const productName: string = product?.name ?? '';
      await awardDonationRewards(userId, productName);
    } catch {}

    res.json({ pointsAwarded: bonusPoints, alreadyClaimed: false });
  } catch (err: any) {
    console.error('Inbox claim error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
