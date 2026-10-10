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
    list.innerHTML =
      '<div class="empty-note">No products yet. Add your first product to start building your store.</div>';
  } else {
    list.innerHTML = products.map(p => `
      <div class="dash-product">
        <div class="mini-art ${
          p.product_type === "course" ? "art-lilac" :
          p.product_type === "coaching" ? "art-blue" : "art-peach"
        }">
          ${p.product_type === "course" ? "▤" :
            p.product_type === "coaching" ? "✦" : "✎"}
        </div>

        <div class="dash-product-info">
          <strong>${esc(p.name)}</strong>
          <small>${esc(p.product_type.replaceAll("_", " "))}</small>
          <small>${p.is_published ? "Published" : "Draft"}</small>
        </div>

        <span class="dash-price">${money(p.price_inr)}</span>

        <button
          class="publish-product"
          data-id="${esc(p.id)}"
          type="button">
          ${p.is_published ? "Unpublish" : "Publish"}
        </button>

        <button
          class="remove-product"
          data-id="${esc(p.id)}"
          aria-label="Delete ${esc(p.name)}"
          type="button"
          style="border:0;background:transparent;color:#999;font-size:16px">
          ×
        </button>
      </div>
    `).join("");

    list.querySelectorAll(".publish-product").forEach(button => {
      button.addEventListener("click", () =>
        toggleProduct(button.dataset.id)
      );
    });

    list.querySelectorAll(".remove-product").forEach(button => {
      button.addEventListener("click", () =>
        deleteProduct(button.dataset.id)
      );
    });
  }

  $("productCount").textContent = products.length;
}

async function toggleProduct(id) {
  const product = products.find(p => p.id === id);
  if (!product || !supabaseClient || !currentUser) return;

  const nextStatus = !product.is_published;

  const { error } = await supabaseClient
    .from("products")
    .update({ is_published: nextStatus })
    .eq("id", id)
    .eq("creator_id", currentUser.id);

  if (error) {
    toast("Could not update product: " + error.message);
    return;
  }

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
  const text = location.origin + location.pathname + "#store";
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(() => toast("Link copied!")).catch(() => toast(text));
  else toast("Store link: " + text);
}

document.addEventListener("DOMContentLoaded", async () => {
  initSupabase();
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
      <aside class="dash-panel"><div class="panel-title"><h2>Your public store</h2><span class="status-pill">Not published</span></div><div class="empty-note">Your creator account and product records are connected. Public store pages and customer checkout are the next build stage.</div><div class="store-link"><input id="storeUrl" aria-label="Store URL" readonly value="Store page coming next"><button id="copyLink">Copy</button></div><div style="margin-top:25px"><div class="panel-title"><h2>Next steps</h2></div><div class="empty-note">① Add your products<br>② Set up a public store slug<br>③ Securely deliver files<br>④ Connect verified checkout</div></div></aside></div>
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
  document.addEventListener("keydown", e => { if (e.key === "Escape") { $("modalBackdrop").hidden = true; closeDashboard(); } });
  if (supabaseClient) {
    const { data } = await supabaseClient.auth.getSession();
    if (data?.session) { currentUser = data.session.user; }
  }
});
