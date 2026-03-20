import Stripe from "stripe";
import products from "../../src/products.json";

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    // ===== 1. リクエスト取得 =====
    const body = await request.json();
    const { productId } = body;

    if (!productId) {
      return json({ error: "productId is required" }, 400);
    }

    // ===== 2. 商品取得（サーバー側で検証）=====
    const product = products.find(
      (p) => p.id === productId && p.published
    );

    if (!product) {
      return json({ error: "Product not found" }, 404);
    }

    // ===== 3. Stripe 初期化 =====
    const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: "2023-10-16",
    });

    // ===== 4. Checkout Session 作成 =====
    const session = await stripe.checkout.sessions.create({
      mode: "payment",

      // 支払い方法（最初はカードのみ）
      payment_method_types: ["card"],

      // 商品（Stripe側の priceId を使う）
      line_items: [
        {
          price: product.priceId,
          quantity: 1,
        },
      ],

      // 住所取得（物理商品なので必須）
      shipping_address_collection: {
        allowed_countries: ["JP"],
      },

      // 成功・キャンセル遷移
      success_url: `${env.SITE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.SITE_URL}/cancel`,

      // 内部識別用（超重要）
      metadata: {
        productId: product.id,
      },

      // 任意：注文トラッキング用
      client_reference_id: product.id,
    });

    // ===== 5. URL返却 =====
    return json({ url: session.url });

  } catch (err) {
    console.error(err);
    return json({ error: err.message }, 500);
  }
}

// ===== 共通レスポンス関数 =====
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}
