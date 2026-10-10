
const { createClient } = require("@supabase/supabase-js");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const {
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    RAZORPAY_KEY_ID,
    RAZORPAY_KEY_SECRET
  } = process.env;

  if (
    !SUPABASE_URL ||
    !SUPABASE_SERVICE_ROLE_KEY ||
    !RAZORPAY_KEY_ID ||
    !RAZORPAY_KEY_SECRET
  ) {
    return res.status(500).json({
      error: "Checkout is not configured on the server yet."
    });
  }

  try {
    const { productId, storeSlug, customerEmail } = req.body || {};

    if (
      !productId ||
      !storeSlug ||
      !customerEmail ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)
    ) {
      return res.status(400).json({
        error: "Product, store and valid email are required."
      });
    }

    const supabase = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    );

    // Find the creator's public store.
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id,store_slug")
      .eq("store_slug", String(storeSlug).toLowerCase())
      .maybeSingle();

    if (profileError || !profile) {
      return res.status(404).json({
        error: "Store not found."
      });
    }

    // Only published products belonging to this creator can be purchased.
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id,creator_id,name,price_inr,is_published")
      .eq("id", productId)
      .eq("creator_id", profile.id)
      .eq("is_published", true)
      .maybeSingle();

    if (productError || !product) {
      return res.status(404).json({
        error: "This product is not available for purchase."
      });
    }

    const price = Number(product.price_inr);

    if (
      !Number.isFinite(price) ||
      price <= 0 ||
      price > 1000000
    ) {
      return res.status(400).json({
        error: "This product has an invalid price."
      });
    }

    // Razorpay expects the amount in paise.
    const amount = Math.round(price * 100);

    const auth = Buffer.from(
      `${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`
    ).toString("base64");

    const razorpayResponse = await fetch(
      "https://api.razorpay.com/v1/orders",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          amount,
          currency: "INR",
          receipt: `cs_${Date.now()}_${String(product.id).slice(0, 8)}`,
          notes: {
            product_id: product.id,
            creator_id: product.creator_id,
            store_slug: profile.store_slug
          }
        })
      }
    );

    const razorpayOrder = await razorpayResponse.json();

    if (!razorpayResponse.ok) {
      console.error(
        "Razorpay order creation failed:",
        razorpayOrder
      );

      return res.status(502).json({
        error: "Payment provider could not create the order. Check Razorpay test keys."
      });
    }

    // Save a pending order in Supabase.
    const { error: insertError } = await supabase
      .from("orders")
      .insert({
        creator_id: product.creator_id,
        product_id: product.id,
        amount_paise: amount,
        currency: "INR",
        status: "pending",
        razorpay_order_id: razorpayOrder.id,
        customer_email: customerEmail
      });

    if (insertError) {
      console.error(
        "Order database insert failed:",
        insertError
      );

      return res.status(500).json({
        error: "Could not save the order. Please try again."
      });
    }

    // Return only the public key and order details to the browser.
    return res.status(200).json({
      keyId: RAZORPAY_KEY_ID,
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency
    });

  } catch (error) {
    console.error("Create order error:", error);

    return res.status(500).json({
      error: "Unexpected checkout error."
    });
  }
};
