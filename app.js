// CreatorStore AI — Supabase-connected MVP
// Configure supabase-config.js with your Project URL and publishable key.
// Never put a secret/service_role key in browser code.

const $ = (id) => document.getElementById(id);
let supabaseClient = null;
let currentUser = null;
let products = [];
let activeAuthMode = "signup";

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
}
function money(n) { return "₹" + Number(n || 0).toLocaleString("en-IN"); }
function toast(message) {
  const old = $("toast"); if (old) old.remove();
  const el = document.createElement("div");
  el.id = "toast"; el.textContent = message;
  el.style.cssText = "position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#24251f;color:#fff;padding:12px 18px;border-radius:9px;font:12px 'DM Sans',sans-serif;z-index:50;box-shadow:0 8px 30px #0002;max-width:90%;text-align:center";
  document.body.appendChild(el); setTimeout(() => el.remove(), 3200);
}
function configured() {
  return window.CREATORSTORE_SUPABASE_URL &&
    window.CREATORSTORE_SUPABASE_PUBLISHABLE_KEY &&
    !window.CREATORSTORE_SUPABASE_URL.includes("YOUR_PROJECT_URL") &&
    !window.CREATORSTORE_SUPABASE_PUBLISHABLE_KEY.includes("YOUR_PUBLISHABLE_KEY");
}
function initSupabase() {
  if (!configured()) return false;
  if (!window.supabase?.createClient) return false;
  supabaseClient = window.supabase.createClient(
    window.CREATORSTORE_SUPABASE_URL,
    window.CREATORSTORE_SUPABASE_PUBLISHABLE_KEY
  );
  return true;
}
function openAuth(mode = "signup") {
  activeAuthMode = mode;
  $("modalEyebrow").textContent = "CREATOR ACCOUNT";
  $("modalTitle").textContent = mode === "signup" ? "Create your creator account." : "Welcome back.";
  $("modalText").textContent = mode === "signup"
    ? "Create an account to manage your products and storefront."
    : "Sign in to manage your creator dashboard.";
  $("modalBody").innerHTML = `
    <form id="authForm" class="add-form">
      ${mode === "signup" ? '<label>Creator name<input id="authName" maxlength="70" autocomplete="name" placeholder="Your name" required></label>' : ""}
      <label>Email address<input id="authEmail" type="email" autocomplete="email" placeholder="you@example.com" required></label>
      <label>Password<input id="authPassword" type="password" minlength="8" autocomplete="${mode === "signup" ? "new-password" : "current-password"}" placeholder="At least 8 characters" required></label>
      <button class="btn btn-dark full-width" type="submit">${mode === "signup" ? "Create account" : "Sign in"} ↗</button>
    </form>
    <p style="font-size:11px;text-align:center;margin:14px 0 0">${mode === "signup" ? 'Already have an account? <button type="button" id="switchAuth" style="border:0;background:none;text-decoration:underline;font-weight:700">Log in</button>' : 'New to CreatorStore AI? <button type="button" id="switchAuth" style="border:0;background:none;text-decoration:underline;font-weight:700">Create account</button>'}</p>
    <p style="font-size:9px;color:#88897f;line-height:1.6">Your credentials are sent directly to Supabase Auth. This app never stores your password itself.</p>`;
  $("modalContinue").hidden = true;
  $("modalBackdrop").hidden = false;
  $("authForm").addEventListener("submit", handleAuth);
  $("switchAuth").addEventListener("click", () => openAuth(activeAuthMode === "signup" ? "login" : "signup"));
}
async function handleAuth(e) {
  e.preventDefault();
  if (!supabaseClient) {
    toast("Supabase is not configured yet. Add your project URL and publishable key to supabase-config.js.");
    return;
  }
  const email = $("authEmail").value.trim();
  const password = $("authPassword").value;
  const button = e.submitter;
  button.disabled = true; button.textContent = "Please wait…";
  try {
    if (activeAuthMode === "signup") {
      const displayName = $("authName").value.trim();
      const { data, error } = await supabaseClient.auth.signUp({
        email, password, options: { data: { display_name: displayName } }
      });
      if (error) throw error;
      if (data.session) {
        await ensureProfile(displayName);
        toast("Account created!");
        await showDashboard();
      } else {
        $("modalBody").innerHTML = `<div class="modal-body">Account registration started. Check <strong>${esc(email)}</strong> for the confirmation email, then return here and log in.</div>`;
        $("modalTitle").textContent = "Check your inbox.";
        $("modalText").textContent = "Supabase requires email confirmation before the first sign-in.";
        $("modalContinue").hidden = false;
        $("modalContinue").textContent = "Back to sign in";
        $("modalContinue").onclick = () => openAuth("login");
      }
    } else {
      const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) throw error;
      currentUser = data.user;
      await ensureProfile(currentUser.user_metadata?.display_name || "");
      toast("Signed in successfully.");
      await showDashboard();
    }
  } catch (err) {
    toast(err.message || "Authentication failed.");
    button.disabled = false; button.textContent = activeAuthMode === "signup" ? "Create account ↗" : "Sign in ↗";
  }
}
async function ensureProfile(displayName = "") {
  if (!currentUser && supabaseClient) {
    const { data } = await supabaseClient.auth.getUser();
    currentUser = data?.user || null;
  }
  if (!currentUser) return;
  const { error } = await supabaseClient.from("profiles").upsert({
    id: currentUser.id,
    display_name: displayName || currentUser.user_metadata?.display_name || currentUser.email?.split("@")[0] || "Creator"
  }, { onConflict: "id", ignoreDuplicates: true });
  if (error) console.warn("Profile setup:", error.message);
}
async function showDashboard() {
  $("modalBackdrop").hidden = true;
  $("dashboardPreview").classList.add("active");
  $("dashboardPreview").setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  const { data } = await supabaseClient.auth.getUser();
  currentUser = data?.user || currentUser;
  $("dashWelcome").textContent = `Welcome, ${currentUser?.user_metadata?.display_name || currentUser?.email?.split("@")[0] || "creator"}. ✳`;
  $("accountEmail").textContent = currentUser?.email || "";
  await loadProducts();
  await loadStoreProfile();
}
function closeDashboard() {
  $("dashboardPreview").classList.remove("active");
  $("dashboardPreview").setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  window.scrollTo(0, 0);
}
async function loadProducts() {
  if (!supabaseClient || !currentUser) return;
  const { data, error } = await supabaseClient.from("products")
    .select("id,name,description,product_type,price_inr,is_published,created_at")
    .eq("creator_id", currentUser.id).order("created_at", { ascending: false });
  if (error) { toast("Could not load products: " + error.message); return; }
  products = data || [];
  renderProducts();
}
function renderProducts() {
  const list = $("dashProductList");
  if (!products.length) {
    list.innerHTML = '<div class="empty-note">No products yet. Add your first product to start building your store.</div>';
  } else {
    list.innerHTML = products.map(p => `
      <div class="dash-product">
        <div class="mini-art ${p.product_type === "course" ? "art-lilac" : p.product_type === "coaching" ? "art-blue" : "art-peach"}">${p.product_type === "course" ? "▤" : p.product_type === "coaching" ? "✦" : "✎"}</div>
        <div class="dash-product-info"><strong>${esc(p.name)}</strong><small>${esc(p.product_type.replaceAll("_"," "))}</small><small>${p.is_published ? "Published" : "Draft"}</small></div>
        <span class="dash-price">${money(p.price_inr)}</span>
        <button class="publish-product" data-id="${esc(p.id)}" type="button">${p.is_published ? "Unpublish" : "Publish"}</button>
        <button class="remove-product" data-id="${esc(p.id)}" aria-label="Delete ${esc(p.name)}" style="border:0;background:transparent;color:#999;font-size:16px" type="button">×</button>
      </div>`).join("");
    list.querySelectorAll(".publish-product").forEach(b => b.addEventListener("click", () => toggleProduct(b.dataset.id)));
    list.querySelectorAll(".remove-product").forEach(b => b.addEventListener("click", () => deleteProduct(b.dataset.id)));
  }
  $("productCount").textContent = products.length;
}

async function toggleProduct(id) {
  const product = products.find(p => p.id === id);
  if (!product || !supabaseClient || !currentUser) return;
  const nextStatus = !product.is_published;
  const { error } = await supabaseClient.from("products").update({ is_published: nextStatus })
    .eq("id", id).eq("creator_id", currentUser.id);
  if (error) { toast("Could not update product: " + error.message); return; }
  await loadProducts();
  toast(nextStatus ? "Product published!" : "Product unpublished.");
}

function showAddProduct() { $("addProductPanel").hidden = false; $("newProductName").focus(); }
function hideAddProduct() { $("addProductPanel").hidden = true; $("addProductForm").reset(); }
async function addProduct(e) {
  e.preventDefault();
  if (!supabaseClient || !currentUser) { toast("Please sign in first."); return; }
  const name = $("newProductName").value.trim();
  const type = $("newProductType").value;
  const price = Number($("newProductPrice").value);
  const description = $("newProductDescription").value.trim();
  if (!name || !Number.isInteger(price) || price < 0) { toast("Enter a product name and whole-number price."); return; }
  const button = e.submitter; button.disabled = true; button.textContent = "Saving…";
  const { error } = await supabaseClient.from("products").insert({
    creator_id: currentUser.id, name, description, product_type: type, price_inr: price
  });
  button.disabled = false; button.textContent = "Save product";
  if (error) { toast("Could not save product: " + error.message); return; }
  hideAddProduct(); await loadProducts(); toast("Product saved to Supabase!");
}
async function deleteProduct(id) {
  if (!confirm("Delete this product? This cannot be undone.")) return;
  const { error } = await supabaseClient.from("products").delete().eq("id", id).eq("creator_id", currentUser.id);
  if (error) { toast("Could not delete product: " + error.message); return; }
  await loadProducts(); toast("Product deleted.");
}
async function signOut() {
  if (supabaseClient) await supabaseClient.auth.signOut();
  currentUser = null; products = []; closeDashboard(); toast("Signed out.");
}
function openStart() {
  if (!supabaseClient) {
    $("modalEyebrow").textContent = "ONE QUICK SETUP STEP";
    $("modalTitle").textContent = "Connect your Supabase project.";
    $("modalText").textContent = "The website files are ready, but the project URL and publishable key still need to be added to supabase-config.js.";
    $("modalBody").innerHTML = '<div class="modal-body">Open <strong>supabase-config.js</strong> in your GitHub repository and replace the two placeholders with your own Supabase values. Never use a secret/service-role key here.</div>';
    $("modalContinue").hidden = true;
    $("modalBackdrop").hidden = false;
    return;
  }
  openAuth("signup");
}
function copyStoreLink() {
  const text = $("storeUrl")?.value && $("storeUrl").value.startsWith("http") ? $("storeUrl").value : location.origin + location.pathname;
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(() => toast("Link copied!")).catch(() => toast(text));
  else toast("Store link: " + text);
}


async function renderPublicStore(slug) {
  document.body.innerHTML = `
    <div style="min-height:100vh;background:#f7f6f2;color:#25251f;font-family:'DM Sans',Arial,sans-serif">
      <header style="max-width:1100px;margin:auto;padding:22px 5%;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e6e3da">
        <a href="/" style="text-decoration:none;color:inherit;font-weight:800;font-size:20px">creatorstore<span style="color:#929486">.ai</span></a>
        <a href="/" style="color:inherit;font-size:13px">Create your own store ↗</a>
      </header>
      <main id="publicStoreContent" style="max-width:1100px;margin:auto;padding:52px 5% 80px">
        <p style="color:#7e8b39;font-size:11px;letter-spacing:2px;font-weight:700">CREATOR STOREFRONT</p>
        <p>Loading store…</p>
      </main>
      <footer style="text-align:center;padding:24px;color:#777;font-size:12px">Powered by CreatorStore AI</footer>
    </div>`;
  if (!supabaseClient) {
    $("publicStoreContent").innerHTML = '<h1>Store unavailable</h1><p>Store connection is not configured. Please try again later.</p>';
    return;
  }
  const safeSlug = String(slug || "").toLowerCase().trim();
  const { data: profile, error: profileError } = await supabaseClient
    .from("profiles")
    .select("id,display_name,store_slug,bio")
    .eq("store_slug", safeSlug)
    .maybeSingle();

  if (profileError || !profile) {
    $("publicStoreContent").innerHTML = '<h1>Store not found</h1><p>This creator store does not exist or is not public yet.</p><a href="/">Visit CreatorStore AI</a>';
    return;
  }

  const { data: publicProducts, error: productsError } = await supabaseClient
    .from("products")
    .select("id,name,description,product_type,price_inr")
    .eq("creator_id", profile.id)
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  if (productsError) {
    $("publicStoreContent").innerHTML = '<h1>Unable to load products</h1><p>Please refresh and try again.</p>';
    return;
  }

  const displayName = esc(profile.display_name || "Creator");
  const bio = esc(profile.bio || "Discover my digital products and resources.");
  const cards = (publicProducts || []).map(p => `
    <article style="background:#fff;border:1px solid #e8e4db;border-radius:18px;padding:22px;display:flex;flex-direction:column;gap:12px">
      <div style="width:48px;height:48px;border-radius:13px;background:#e2edc9;display:grid;place-items:center;font-size:23px">✳</div>
      <div style="font-size:10px;color:#83877a;text-transform:uppercase;letter-spacing:1px">${esc(String(p.product_type || "digital_download").replaceAll("_"," "))}</div>
      <h2 style="font-size:20px;margin:0">${esc(p.name)}</h2>
      <p style="font-size:14px;color:#73766d;line-height:1.65;margin:0">${esc(p.description || "A resource created for you.")}</p>
      <div style="font-size:20px;font-weight:800;margin-top:auto">${money(p.price_inr)}</div>
      <button type="button" class="purchase-product" data-product-id="${esc(p.id)}" data-product-name="${esc(p.name)}" style="border:0;border-radius:10px;padding:13px;background:#25251f;color:#fff;font-weight:700;cursor:pointer">Buy now</button>
    </article>`).join("");

  $("publicStoreContent").innerHTML = `
    <section style="max-width:720px;margin:0 auto 38px;text-align:center">
      <div style="width:72px;height:72px;border-radius:22px;background:#d9ef78;margin:0 auto 18px;display:grid;place-items:center;font-size:30px;font-weight:800">${displayName.charAt(0).toUpperCase()}</div>
      <h1 style="font-size:clamp(34px,6vw,58px);letter-spacing:-2px;margin:0 0 14px">${displayName}'s store</h1>
      <p style="color:#6e7068;font-size:16px;line-height:1.7">${bio}</p>
      <p style="font-size:11px;color:#85877e;letter-spacing:1.5px;font-weight:700;margin-top:26px">EXPLORE THE COLLECTION</p>
    </section>
    ${publicProducts && publicProducts.length ? `<section style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,230px),1fr));gap:18px">${cards}</section>` : '<div style="background:#fff;border:1px solid #e8e4db;border-radius:16px;padding:28px;text-align:center;color:#73766d">This creator has not published any products yet.</div>'}`;
  document.querySelectorAll(".purchase-product").forEach(button => {
    button.addEventListener("click", () => startCheckout(button.dataset.productId, button.dataset.productName, safeSlug));
  });
}


async function loadRazorpayCheckout() {
  if (window.Razorpay) return true;
  return new Promise(resolve => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

async function startCheckout(productId, productName, storeSlug) {
  const email = window.prompt("Enter your email for the order receipt:");
  if (!email) return;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    alert("Please enter a valid email address.");
    return;
  }
  const button = [...document.querySelectorAll(".purchase-product")].find(b => b.dataset.productId === productId);
  if (button) { button.disabled = true; button.textContent = "Preparing checkout…"; }
  try {
    const response = await fetch("/api/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, storeSlug, customerEmail: email.trim() })
    });
    const order = await response.json();
    if (!response.ok) throw new Error(order.error || "Could not create payment order.");
    const loaded = await loadRazorpayCheckout();
    if (!loaded) throw new Error("Razorpay checkout could not load. Please retry.");
    const checkout = new window.Razorpay({
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      name: "CreatorStore AI",
      description: productName,
      order_id: order.orderId,
      prefill: { email: email.trim() },
      theme: { color: "#25251f" },
      handler: async function (result) {
        try {
          const verifiedResponse = await fetch("/api/verify-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_order_id: result.razorpay_order_id,
              razorpay_payment_id: result.razorpay_payment_id,
              razorpay_signature: result.razorpay_signature
            })
          });
          const verified = await verifiedResponse.json();
          if (!verifiedResponse.ok || !verified.verified) throw new Error(verified.error || "Payment verification failed.");
          alert("Payment verified in test mode. Order ID: " + result.razorpay_order_id + ". Digital delivery is not enabled yet.");
        } catch (error) {
          alert("We could not verify this payment yet. Please contact support with your payment ID: " + result.razorpay_payment_id);
          console.error(error);
        }
      },
      modal: {
        ondismiss: () => {
          if (button) { button.disabled = false; button.textContent = "Buy now"; }
        }
      }
    });
    checkout.open();
  } catch (error) {
    alert(error.message || "Checkout failed.");
    if (button) { button.disabled = false; button.textContent = "Buy now"; }
  }
}

async function saveStoreProfile() {
  if (!supabaseClient || !currentUser) return;
  const slug = $("storeSlugInput").value.trim().toLowerCase();
  const bio = $("storeBioInput").value.trim();
  const displayName = $("storeNameInput").value.trim();
  if (!/^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?$/.test(slug)) {
    toast("Use 3–30 characters: lowercase letters, numbers, and hyphens.");
    return;
  }
  const button = $("saveStoreProfile");
  button.disabled = true; button.textContent = "Saving…";
  const { error } = await supabaseClient.from("profiles").upsert({
    id: currentUser.id,
    display_name: displayName || "Creator",
    store_slug: slug,
    bio
  }, { onConflict: "id" });
  button.disabled = false; button.textContent = "Save store details";
  if (error) {
    toast(error.code === "23505" ? "That store URL is already taken. Try another." : "Could not save store: " + error.message);
    return;
  }
  $("storeUrl").value = location.origin + "/?store=" + encodeURIComponent(slug);
  $("storeStatus").textContent = "Store profile saved";
  toast("Store details saved!");
}

async function loadStoreProfile() {
  if (!supabaseClient || !currentUser) return;
  const { data, error } = await supabaseClient.from("profiles")
    .select("display_name,store_slug,bio").eq("id", currentUser.id).maybeSingle();
  if (error) { console.warn("Could not load store profile:", error.message); return; }
  if (data) {
    $("storeNameInput").value = data.display_name || "";
    $("storeSlugInput").value = data.store_slug || "";
    $("storeBioInput").value = data.bio || "";
    $("storeUrl").value = data.store_slug ? location.origin + "/?store=" + encodeURIComponent(data.store_slug) : "Save a store URL to create your public link";
    $("storeStatus").textContent = data.store_slug ? "Store profile saved" : "Not published";
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  initSupabase();
  const requestedStore = new URLSearchParams(window.location.search).get("store");
  if (requestedStore) {
    await renderPublicStore(requestedStore);
    return;
  }
  // Update modal/dashboard markup while retaining the original landing page.
  $("modalContinue").hidden = true;
  $("startBtn").addEventListener("click", openStart);
  ["heroStart","featureStart","pricingStart","finalStart","previewCta"].forEach(id => $(id).addEventListener("click", openStart));
  $("loginBtn").addEventListener("click", () => supabaseClient ? openAuth("login") : openStart());
  $("closeModal").addEventListener("click", () => $("modalBackdrop").hidden = true);
  $("modalBackdrop").addEventListener("click", e => { if (e.target === $("modalBackdrop")) $("modalBackdrop").hidden = true; });
  $("menuToggle").addEventListener("click", () => {
    const nav = $(".desktop-nav");
    if (nav.style.display === "flex") { nav.style.display = "none"; return; }
    nav.style.display = "flex"; nav.style.position = "absolute"; nav.style.top = "66px"; nav.style.left = "0"; nav.style.right = "0";
    nav.style.padding = "20px 6%"; nav.style.background = "#f7f6f2"; nav.style.borderBottom = "1px solid #e7e5dc"; nav.style.zIndex = "5"; nav.style.flexDirection = "column";
  });
  const dashboard = document.createElement("section");
  dashboard.id = "dashboardPreview"; dashboard.className = "dashboard-preview"; dashboard.setAttribute("aria-hidden","true");
  dashboard.innerHTML = `
    <header class="dash-header"><a class="brand" href="#"><span class="brand-mark">c</span> creatorstore<span class="brand-ai">.ai</span></a><div style="display:flex;gap:10px;align-items:center"><span id="accountEmail" style="font-size:10px;color:#777"></span><button class="dash-back" id="signOutBtn">Sign out</button><button class="dash-back" id="backToSite">← Website</button></div></header>
    <main class="dash-main">
      <div class="dash-greeting"><div><div class="eyebrow"><span class="eyebrow-dot"></span> YOUR CREATOR DASHBOARD</div><h1 id="dashWelcome">Welcome to your creator space. ✳</h1><p>Your products are saved to your Supabase database.</p></div><button class="btn btn-dark" id="dashAddTop">＋ Add a product</button></div>
      <div class="dash-stats"><article class="stat-card"><small>Total revenue</small><strong>₹0</strong><span>↗ Payments not connected yet</span></article><article class="stat-card"><small>Store visits</small><strong>—</strong><span>↗ Analytics coming later</span></article><article class="stat-card"><small>Products</small><strong id="productCount">0</strong><span>↗ Saved in Supabase</span></article></div>
      <div class="dash-columns"><section class="dash-panel"><div class="panel-title"><h2>Your products</h2><button id="dashAdd">＋ Add product</button></div><div id="dashProductList"></div>
      <div id="addProductPanel" hidden><form class="add-form" id="addProductForm"><label>Product name<input id="newProductName" placeholder="e.g. The Creator Playbook" maxlength="100" required></label><label>Description (optional)<input id="newProductDescription" placeholder="What will your customer get?" maxlength="500"></label><label>Product type<select id="newProductType"><option value="digital_download">Digital download</option><option value="course">Online course</option><option value="coaching">Coaching session</option><option value="template">Template pack</option><option value="membership">Membership</option></select></label><label>Price (INR)<input id="newProductPrice" type="number" min="0" step="1" placeholder="499" required></label><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-dark" type="submit">Save product</button><button class="dash-back" type="button" id="cancelAdd">Cancel</button></div></form></div></section>
      <aside class="dash-panel"><div class="panel-title"><h2>Your public store</h2><span class="status-pill" id="storeStatus">Not published</span></div>
      <form class="add-form" id="storeProfileForm">
        <label>Store name<input id="storeNameInput" maxlength="70" placeholder="Your creator name" required></label>
        <label>Store URL slug<input id="storeSlugInput" maxlength="30" pattern="[a-z0-9-]+" placeholder="e.g. sahej" required></label>
        <small style="color:#777">Your public link will be creatorstore-ai.vercel.app/?store=your-slug</small>
        <label>Store bio<input id="storeBioInput" maxlength="300" placeholder="What do you create?"></label>
        <button class="btn btn-dark full-width" id="saveStoreProfile" type="submit">Save store details</button>
      </form>
      <div class="store-link" style="margin-top:14px"><input id="storeUrl" aria-label="Store URL" readonly value="Save a store URL to create your public link"><button id="copyLink">Copy</button></div>
      <div class="empty-note" style="margin-top:14px">Only published products appear in your public store. Checkout is not enabled yet.</div></aside></div>
      <p style="text-align:center;font-size:10px;color:#88897f;margin-top:28px">CreatorStore AI · Payments are not enabled in this version.</p>
    </main>`;
  document.body.appendChild(dashboard);
  $("backToSite").addEventListener("click", closeDashboard);
  $("signOutBtn").addEventListener("click", signOut);
  $("dashAdd").addEventListener("click", showAddProduct);
  $("dashAddTop").addEventListener("click", showAddProduct);
  $("cancelAdd").addEventListener("click", hideAddProduct);
  $("addProductForm").addEventListener("submit", addProduct);
  $("copyLink").addEventListener("click", copyStoreLink);
  $("storeProfileForm").addEventListener("submit", async e => { e.preventDefault(); await saveStoreProfile(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") { $("modalBackdrop").hidden = true; closeDashboard(); } });
  if (supabaseClient) {
    const { data } = await supabaseClient.auth.getSession();
    if (data?.session) { currentUser = data.session.user; }
  }
});