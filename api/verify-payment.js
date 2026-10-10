
const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  const {
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    RAZORPAY_KEY_SECRET
  } = process.env;

  if (
    !SUPABASE_URL ||
    !SUPABASE_SERVICE_ROLE_KEY ||
    !RAZORPAY_KEY_SECRET
  ) {
    return res.status(500).json({
      error: "Payment verification is not configured."
    });
  }

  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body || {};

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return res.status(400).json({
        error: "Missing payment verification fields."
      });
    }

    // Verify Razorpay's signature on the server.
    const expected = crypto
      .createHmac("sha256", RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    const suppliedBuffer = Buffer.from(
      String(razorpay_signature),
      "hex"
    );
    const expectedBuffer = Buffer.from(expected, "hex");

    if (
      suppliedBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(suppliedBuffer, expectedBuffer)
    ) {
      return res.status(400).json({
        verified: false,
        error: "Payment signature is invalid."
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

    const { data: order, error: findError } = await supabase
      .from("orders")
      .select("id,status,razorpay_order_id")
      .eq("razorpay_order_id", razorpay_order_id)
      .maybeSingle();

    if (findError || !order) {
      return res.status(404).json({
        verified: false,
        error: "Order not found."
      });
    }

    if (order.status === "paid") {
      return res.status(200).json({
        verified: true,
        alreadyVerified: true
      });
    }

    const { data: updated, error: updateError } = await supabase
      .from("orders")
      .update({
        status: "paid",
        razorpay_payment_id,
        paid_at: new Date().toISOString()
      })
      .eq("id", order.id)
      .eq("status", "pending")
      .select("id");

    if (updateError || !updated || updated.length === 0) {
      return res.status(500).json({
        verified: false,
        error: "Could not update order status."
      });
    }

    return res.status(200).json({
      verified: true
    });

  } catch (error) {
    console.error("Verify payment error:", error);

    return res.status(500).json({
      verified: false,
      error: "Unexpected verification error."
    });
  }
};
