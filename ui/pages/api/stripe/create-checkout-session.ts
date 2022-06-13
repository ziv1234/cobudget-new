import { Prisma, Bucket, Round, RoundMember, User } from "@prisma/client";
import { appLink } from "utils/internalLinks";
import handler from "server/api-handler";
import { getRoundMember } from "server/graphql/resolvers/helpers";
import prisma from "server/prisma";
import stripe from "server/utils/stripe";

const Decimal = Prisma.Decimal;

async function getTaxRates({
  bucket,
  roundMember,
}: {
  bucket: Bucket & { round: Round };
  roundMember: RoundMember & { user: User };
}): Promise<string[]> {
  if (bucket.directFundingType === "DONATION") return [];

  let taxRates = await stripe.taxRates.list(
    { limit: 100 },
    { stripeAccount: bucket.round.stripeAccountId }
  );

  let taxRateId = null;
  while (!taxRateId) {
    taxRateId = taxRates.data.find((rate) =>
      new Decimal(bucket.exchangeVat).div(100).equals(rate.percentage)
    )?.id;

    if (!taxRateId) {
      if (taxRates.has_more) {
        // grab another page of rates
        taxRates = await stripe.taxRates.list(
          {
            limit: 100,
            starting_after: taxRates.data[taxRates.data.length - 1].id,
          },
          { stripeAccount: bucket.round.stripeAccountId }
        );
      } else {
        // we looped through all the tax rates but didn't find one so we're breaking and creating a new one
        break;
      }
    }
  }

  if (!taxRateId) {
    // There isn't an existing taxRate at this percentage, so we create a new one
    taxRateId = (
      await stripe.taxRates.create(
        {
          display_name: "VAT",
          inclusive: true,
          percentage: new Decimal(bucket.exchangeVat).div(100).toNumber(),
          metadata: {
            createdByUserId: roundMember.user.id,
            createdForBucketId: bucket.id,
          },
        },
        { stripeAccount: bucket.round.stripeAccountId }
      )
    ).id;
  }

  return [taxRateId];
}

export default handler().post(async (req, res) => {
  if (typeof req.query?.bucketId !== "string") throw new Error("Bad bucketId");
  if (typeof req.query?.contribution !== "string")
    throw new Error("Bad contribution");
  if (typeof req.query?.tipAmount !== "string")
    throw new Error("Bad tipAmount");
  const bucketId = req.query?.bucketId;
  const contribution = Number(req.query?.contribution);
  const tipAmount = Number(req.query?.tipAmount);

  // throws if not a round member
  const roundMember = await getRoundMember({
    bucketId,
    userId: req.user.id,
    include: { user: true },
  });

  const bucket = await prisma.bucket.findUnique({
    where: { id: bucketId },
    include: { round: { include: { group: true } } },
  });

  if (!bucket.directFundingEnabled || !bucket.round.directFundingEnabled) {
    throw new Error("Direct funding not enabled for this bucket and/or round");
  }

  const isExchange = bucket.directFundingType === "EXCHANGE";

  if (
    !Number.isSafeInteger(contribution) ||
    contribution <= 0 ||
    (isExchange && contribution < bucket.exchangeMinimumContribution)
  ) {
    throw new Error("Invalid or too low contribution");
  }

  if (
    !Number.isSafeInteger(tipAmount) ||
    tipAmount < 0 ||
    tipAmount > contribution
  ) {
    throw new Error("Invalid, too low, or too high tip amount");
  }

  req.session.redirect = appLink(
    `/${bucket.round.group.slug}/${bucket.round.slug}/${bucket.id}`
  );

  const callbackLink = appLink("/api/stripe/return");

  const session = await stripe.checkout.sessions.create(
    {
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: bucket.round.currency.toLowerCase(),
            unit_amount: contribution,
            product_data: {
              name: "Contribution",
              metadata: {
                contribution: "true",
              },
            },
          },
          tax_rates: await getTaxRates({ bucket, roundMember }),
        },
        {
          quantity: 1,
          price_data: {
            currency: bucket.round.currency.toLowerCase(),
            unit_amount: tipAmount,
            product_data: {
              name: "Cobudget Tip",
              metadata: {
                tip: "true",
              },
            },
          },
        },
      ],
      payment_intent_data: {
        application_fee_amount: tipAmount,
        // shows up for the connected account in their stripe dashboard
        description: JSON.stringify({
          contributionInCurrency: new Decimal(contribution).div(100).toFixed(2),
          currency: bucket.round.currency.toLowerCase(),
          bucketId: bucket.id,
          roundSlug: bucket.round.slug,
          directFundingType: bucket.directFundingType,
          userId: roundMember.user.id,
          userEmail: roundMember.user.email,
        }),
      },
      // metadata that returns to us in the checkout.session.completed webhook
      metadata: {
        userId: roundMember.user.id,
        roundMemberId: roundMember.id,
        roundId: bucket.round.id,
        bucketId,
        contribution,
        tipAmount,
        currency: bucket.round.currency.toLowerCase(),
      },
      customer_email: roundMember.user.email,
      mode: "payment",
      success_url: callbackLink,
      cancel_url: callbackLink,
    },
    {
      stripeAccount: bucket.round.stripeAccountId,
    }
  );

  res.redirect(303, session.url);
});