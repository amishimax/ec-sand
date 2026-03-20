import Stripe from "stripe";

export async function onRequestPost(context) {
  const { request, env } = context;

  const stripe = new Stripe(env.STRIPE_SECRET_KEY);
  const signature = request.headers.get("stripe-signature");
  const body = await request.text();

  let event;

  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    console.log("checkout.session.completed", session.id);
  }

  return new Response("ok", { status: 200 });
}
