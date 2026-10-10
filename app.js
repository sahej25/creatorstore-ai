const $ = (id) => document.getElementById(id);
const backdrop = $("modalBackdrop");
let products = [
  { name: "The Digital Creator Kit", type: "Digital download", price: 799, art: "art-peach", icon: "✎" },
  { name: "Build Your First Course", type: "Mini course", price: 1499, art: "art-lilac", icon: "▤" },
  { name: "1:1 Creator Clarity Call", type: "Coaching session", price: 2499, art: "art-blue", icon: "✦" }
];
let dashboardOpen = false;

function openModal(mode = "start") {
  $("modalTitle").textContent = mode === "login" ? "Your creator space is almost ready." : "Let's make your ideas a business.";
  $("modalText").textContent = mode === "login"
    ? "Secure sign-in will be connected in the next build step. For now, explore the dashboard preview without creating an account."
    : "This prototype lets you explore the creator workflow. Next, we'll connect real accounts, a database, and secure product delivery.";
  $("modalEyebrow").textContent = mode === "login" ? "CREATOR SIGN IN" : "START YOUR CREATOR JOURNEY";
  $("modalBody").innerHTML = mode === "login"
    ? '<div class="modal-body">🔒 Authentication is not connected yet. Your demo dashboard is available without a password.</div>'
    : '<div class="modal-body">✓ Storefront preview<br>✓ Sample products and prices<br>✓ Dashboard with add-product interaction<br><br><strong>Coming next:</strong> saved products, unique creator URLs, and real checkout.</div>';
  $("modalContinue").textContent = "Explore the demo dashboard ↗";
  backdrop.hidden = false;
}
function closeModal(){ backdrop.hidden = true; }
function openDashboard(){
  closeModal();
  $("dashboardPreview").classList.add("active");
  $("dashboardPreview").setAttribute("aria-hidden","false");
  dashboardOpen = true;
  renderProducts();
  window.scrollTo(0,0);
}
function closeDashboard(){
  $("dashboardPreview").classList.remove("active");
  $("dashboardPreview").setAttribute("aria-hidden","true");
  dashboardOpen = false;
  window.scrollTo(0,0);
}
function rupees(n){return "₹" + Number(n).toLocaleString("en-IN");}
function renderProducts(){
  $("dashProductList").innerHTML = products.map((p,i)=>`
    <div class="dash-product">
      <div class="mini-art ${p.art}">${p.icon}</div>
      <div class="dash-product-info"><strong>${escapeHTML(p.name)}</strong><small>${escapeHTML(p.type)}</small></div>
      <span class="dash-price">${rupees(p.price)}</span><span class="status-pill">Draft</span>
      <button class="remove-product" data-index="${i}" aria-label="Remove ${escapeHTML(p.name)}" style="border:0;background:transparent;color:#999;font-size:16px">×</button>
    </div>`).join("");
  $("productCount").textContent = products.length;
  $("dashProductList").querySelectorAll(".remove-product").forEach(btn=>btn.addEventListener("click",()=>{
    products.splice(Number(btn.dataset.index),1);renderProducts();toast("Product removed from this demo.");
  }));
}
function escapeHTML(str){return String(str).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function toast(message){
  const old=$("toast"); if(old)old.remove();
  const el=document.createElement("div");el.id="toast";el.textContent=message;
  el.style.cssText="position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#24251f;color:#fff;padding:12px 18px;border-radius:9px;font:12px 'DM Sans',sans-serif;z-index:30;box-shadow:0 8px 30px #0002;max-width:90%;text-align:center";
  document.body.appendChild(el);setTimeout(()=>el.remove(),2600);
}
function showAddProduct(){
  $("addProductPanel").hidden=false;
  $("newProductName").focus();
}
function hideAddProduct(){$("addProductPanel").hidden=true;$("addProductForm").reset();}
function addProduct(event){
  event.preventDefault();
  const name=$("newProductName").value.trim();
  const type=$("newProductType").value;
  const price=Number($("newProductPrice").value);
  if(!name||!Number.isFinite(price)||price<0){toast("Enter a product name and valid price.");return;}
  const arts=[["art-peach","✎"],["art-lilac","▤"],["art-blue","✦"],["art-yellow","✳"]];
  const art=arts[products.length%arts.length];
  products.push({name,type,price,art:art[0],icon:art[1]});
  renderProducts();hideAddProduct();toast("Product added to this demo dashboard.");
}
function copyStoreLink(){
  const text=location.origin+location.pathname+"#demo-store";
  if(navigator.clipboard && window.isSecureContext){
    navigator.clipboard.writeText(text).then(()=>toast("Demo store link copied!")).catch(()=>toast("Your demo link: "+text));
  } else {toast("Demo store link: "+text);}
}
["startBtn","heroStart","featureStart","pricingStart","finalStart","previewCta"].forEach(id=>$(id).addEventListener("click",()=>openModal("start")));
$("loginBtn").addEventListener("click",()=>openModal("login"));
$("closeModal").addEventListener("click",closeModal);
$("modalContinue").addEventListener("click",openDashboard);
backdrop.addEventListener("click",e=>{if(e.target===backdrop)closeModal();});
$("menuToggle").addEventListener("click",()=>{
  const nav=$(".desktop-nav");
  if(nav.style.display==="flex"){nav.style.display="none";return;}
  nav.style.display="flex";nav.style.position="absolute";nav.style.top="66px";nav.style.left="0";nav.style.right="0";nav.style.padding="20px 6%";nav.style.background="#f7f6f2";nav.style.borderBottom="1px solid #e7e5dc";nav.style.zIndex="5";nav.style.flexDirection="column";
});
document.addEventListener("keydown",e=>{if(e.key==="Escape"){closeModal();closeDashboard();}});
document.addEventListener("DOMContentLoaded",()=>{
  const dashboard=document.createElement("section");
  dashboard.id="dashboardPreview";dashboard.className="dashboard-preview";dashboard.setAttribute("aria-hidden","true");
  dashboard.innerHTML=`
    <header class="dash-header"><a class="brand" href="#"><span class="brand-mark">c</span> creatorstore<span class="brand-ai">.ai</span></a><button class="dash-back" id="backToSite">← Back to website</button></header>
    <main class="dash-main">
      <div class="dash-greeting"><div><div class="eyebrow"><span class="eyebrow-dot"></span> YOUR CREATOR DASHBOARD</div><h1>Good things start here. ✳</h1><p>Welcome to your demo workspace. Your products are currently saved only in this browser session.</p></div><button class="btn btn-dark" id="dashAddTop">＋ Add a product</button></div>
      <div class="dash-stats">
        <article class="stat-card"><small>Total revenue</small><strong>₹0</strong><span>↗ Ready for your first sale</span></article>
        <article class="stat-card"><small>Store visits</small><strong>0</strong><span>↗ Your audience starts here</span></article>
        <article class="stat-card"><small>Products</small><strong id="productCount">3</strong><span>↗ Manage your offers below</span></article>
      </div>
      <div class="dash-columns">
        <section class="dash-panel"><div class="panel-title"><h2>Your products</h2><button id="dashAdd">＋ Add product</button></div><div id="dashProductList"></div>
          <div id="addProductPanel" hidden><form class="add-form" id="addProductForm"><label>Product name<input id="newProductName" placeholder="e.g. The Creator Playbook" maxlength="70" required></label><label>Product type<select id="newProductType"><option>Digital download</option><option>Online course</option><option>Coaching session</option><option>Template pack</option><option>Membership</option></select></label><label>Price (INR)<input id="newProductPrice" type="number" min="0" step="1" placeholder="499" required></label><div style="display:flex;gap:8px"><button class="btn btn-dark" type="submit">Save demo product</button><button class="dash-back" type="button" id="cancelAdd">Cancel</button></div></form></div>
        </section>
        <aside class="dash-panel"><div class="panel-title"><h2>Your public store</h2><span class="status-pill">Preview</span></div><div class="empty-note">Your storefront is the place your audience will visit to discover your offers. Real public creator URLs will be added when accounts and the database are connected.</div><div class="store-link"><input id="storeUrl" aria-label="Demo store URL" readonly value="creatorstore.ai/demo/alex"><button id="copyLink">Copy link</button></div><div style="margin-top:25px"><div class="panel-title"><h2>Next steps</h2></div><div class="empty-note">① Create a secure account<br>② Add your products and files<br>③ Connect checkout<br>④ Publish your unique store link</div></div></aside>
      </div>
      <p style="text-align:center;font-size:10px;color:#88897f;margin-top:28px">DEMO WORKSPACE · Changes are temporary and no real orders or payments are processed.</p>
    </main>`;
  document.body.appendChild(dashboard);
  $("backToSite").addEventListener("click",closeDashboard);
  $("dashAdd").addEventListener("click",showAddProduct);
  $("dashAddTop").addEventListener("click",showAddProduct);
  $("cancelAdd").addEventListener("click",hideAddProduct);
  $("addProductForm").addEventListener("submit",addProduct);
  $("copyLink").addEventListener("click",copyStoreLink);
});
