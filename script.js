const WHATSAPP_NUMBER="393510901180";
const SHEET_API_URL="INCOLLA_QUI_URL_APPS_SCRIPT";

const CATEGORIES=["Scarpe","Borse","Giubbini","Cinture","Occhiali","Cappelli","T-shirt","Orologi"];
const FALLBACK_PRODUCTS=[];

let products=[];
let cart=JSON.parse(localStorage.getItem("mmgs_cart")||"[]");
let activeCategory="";

const $=s=>document.querySelector(s);
const money=n=>new Intl.NumberFormat("it-IT",{style:"currency",currency:"EUR"}).format(Number(n)||0);

function normalize(v){return String(v??"").trim()}
function validProduct(p){return p && p.nome && Number(p.prezzo)>0}
function productPrice(p){return Number(p.prezzoPromo)>0 && Number(p.prezzoPromo)<Number(p.prezzo)?Number(p.prezzoPromo):Number(p.prezzo)}
function isAvailable(p){return normalize(p.disponibile).toUpperCase()!=="NO"}

async function loadProducts(){
  if(!SHEET_API_URL || SHEET_API_URL.includes("INCOLLA_QUI")){
    products=FALLBACK_PRODUCTS;
  }else{
    try{
      const r=await fetch(SHEET_API_URL,{cache:"no-store"});
      const data=await r.json();
      products=(Array.isArray(data)?data:data.products||[]).map(p=>({
        nome:normalize(p["Nome prodotto"]??p.nome),
        foto:normalize(p.Foto??p.foto),
        categoria:normalize(p.Categoria??p.categoria),
        marca:normalize(p.Marca??p.marca),
        taglia:normalize(p.Taglia??p.taglia),
        colore:normalize(p.Colore??p.colore),
        prezzo:Number(String(p.Prezzo??p.prezzo).replace(",", ".")),
        prezzoPromo:Number(String(p["Prezzo promo"]??p.prezzoPromo??"").replace(",", ".")),
        disponibile:normalize(p.Disponibile??p.disponibile||"SI"),
        nuovo:normalize(p.Nuovo??p.nuovo||"NO"),
        id:p.ID??p.id??crypto.randomUUID()
      })).filter(validProduct);
    }catch(e){console.error(e);products=FALLBACK_PRODUCTS}
  }
  buildFilters(); renderAll();
}

function buildFilters(){
  const cats=[...new Set(products.map(p=>p.categoria).filter(Boolean))];
  const sizes=[...new Set(products.map(p=>p.taglia).filter(Boolean))];
  const colors=[...new Set(products.map(p=>p.colore).filter(Boolean))];
  const fill=(sel,arr,label)=>{const el=$(sel); if(!el)return; el.innerHTML=`<option value="">${label}</option>`+arr.sort().map(x=>`<option>${escapeHtml(x)}</option>`).join("")};
  fill("#filterCategory",cats,"Categoria"); fill("#filterSize",sizes,"Taglia"); fill("#filterColor",colors,"Colore");
  $("#categories").innerHTML=`<button class="category-btn active" data-cat="">Tutti</button>`+CATEGORIES.map(c=>`<button class="category-btn" data-cat="${escapeAttr(c)}">${escapeHtml(c)}</button>`).join("");
  $("#categories").onclick=e=>{const b=e.target.closest("[data-cat]");if(!b)return;activeCategory=b.dataset.cat;document.querySelectorAll(".category-btn").forEach(x=>x.classList.toggle("active",x===b));renderCatalog()};
}

function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function escapeAttr(s){return escapeHtml(s)}

function productCard(p){
  const t=$("#productTemplate").content.cloneNode(true);
  const card=t.querySelector(".product-card");
  const img=t.querySelector(".product-image");
  img.src=p.foto ? new URL(p.foto, document.baseURI).href : "prodotti.jpeg"; img.alt=p.nome;
  t.querySelector(".product-name").textContent=p.nome;
  t.querySelector(".product-details").textContent=[p.marca,p.taglia,p.colore].filter(Boolean).join(" • ");
  const price=productPrice(p), promo=Number(p.prezzoPromo)>0&&Number(p.prezzoPromo)<Number(p.prezzo);
  t.querySelector(".price").textContent=money(price);
  t.querySelector(".old-price").textContent=promo?money(p.prezzo):"";
  t.querySelector(".promo-badge").style.display=promo?"block":"none";
  if(!isAvailable(p))card.classList.add("sold");
  let q=1;t.querySelector(".qty").textContent=q;
  t.querySelector(".minus").onclick=()=>{q=Math.max(1,q-1);t.querySelector(".qty").textContent=q};
  t.querySelector(".plus").onclick=()=>{q++;t.querySelector(".qty").textContent=q};
  t.querySelector(".add").onclick=()=>addToCart(p,q);
  return t;
}

function renderGrid(id,list){
  const el=$(id);el.innerHTML="";
  if(!list.length){el.innerHTML='<div class="empty">Nessun prodotto disponibile.</div>';return}
  list.forEach(p=>el.appendChild(productCard(p)));
}
function renderAll(){
  const offers=products.filter(p=>Number(p.prezzoPromo)>0&&Number(p.prezzoPromo)<Number(p.prezzo)).slice(0,3);
  const news=products.filter(p=>normalize(p.nuovo).toUpperCase()==="SI").slice(0,8);
  renderGrid("#offersGrid",offers);renderGrid("#newGrid",news);renderCatalog();renderVideos();renderReviews();updateCart();
}
function renderCatalog(){
  let list=products.filter(p=>!activeCategory||p.categoria.toLowerCase()===activeCategory.toLowerCase());
  const sort=$("#sortSelect").value;
  list=[...list].sort((a,b)=>sort==="asc"?productPrice(a)-productPrice(b):sort==="desc"?productPrice(b)-productPrice(a):Number(b.id)-Number(a.id));
  renderGrid("#catalogGrid",list);$("#resultCount").textContent=`${list.length} prodotti`;
}
function applySearch(){
  const q=normalize($("#searchInput").value).toLowerCase();
  const cat=normalize($("#filterCategory").value).toLowerCase(),size=normalize($("#filterSize").value).toLowerCase(),color=normalize($("#filterColor").value).toLowerCase(),av=$("#filterAvailability").value;
  const min=Number($("#minPrice").value)||0,max=Number($("#maxPrice").value)||Infinity;
  const promo=$("#promoOnly").checked,newOnly=$("#newOnly").checked;
  let list=products.filter(p=>
    (!q||p.nome.toLowerCase().includes(q))&&
    (!cat||p.categoria.toLowerCase()===cat)&&(!size||p.taglia.toLowerCase()===size)&&(!color||p.colore.toLowerCase()===color)&&
    (!av||normalize(p.disponibile).toUpperCase()===av)&&productPrice(p)>=min&&productPrice(p)<=max&&
    (!promo||Number(p.prezzoPromo)>0&&Number(p.prezzoPromo)<Number(p.prezzo))&&(!newOnly||normalize(p.nuovo).toUpperCase()==="SI")
  );
  activeCategory="";document.querySelectorAll(".category-btn").forEach(x=>x.classList.remove("active"));
  renderGrid("#catalogGrid",list);$("#resultCount").textContent=`${list.length} risultati`;
  $("#searchPanel").classList.remove("open");location.hash="catalogo";
}
function addToCart(p,q){
  if(!isAvailable(p))return;
  const key=String(p.id||p.nome);
  const existing=cart.find(x=>String(x.id)===key);
  if(existing)existing.qty+=q;else cart.push({id:key,nome:p.nome,prezzo:productPrice(p),qty:q,foto:p.foto||"prodotti.jpeg"});
  saveCart();$("#cart").classList.add("open");$("#cartOverlay").classList.add("show");
}
function saveCart(){localStorage.setItem("mmgs_cart",JSON.stringify(cart));updateCart()}
function updateCart(){
  $("#cartCount").textContent=cart.reduce((s,x)=>s+x.qty,0);
  const el=$("#cartItems");el.innerHTML="";
  if(!cart.length){el.innerHTML='<div class="empty">Il carrello è vuoto.</div>';$("#cartTotal").textContent=money(0);return}
  cart.forEach((x,i)=>{
    const d=document.createElement("div");d.className="cart-item";d.innerHTML=`<img src="${escapeAttr(x.foto)}"><div><strong>${escapeHtml(x.nome)}</strong><br><small>${money(x.prezzo)} × ${x.qty}</small></div><div class="cart-qty"><button data-i="${i}" data-d="-1">−</button> ${x.qty} <button data-i="${i}" data-d="1">+</button></div>`;
    el.appendChild(d);
  });
  el.onclick=e=>{const b=e.target.closest("button[data-i]");if(!b)return;const i=Number(b.dataset.i);cart[i].qty+=Number(b.dataset.d);if(cart[i].qty<=0)cart.splice(i,1);saveCart()};
  $("#cartTotal").textContent=money(cart.reduce((s,x)=>s+x.prezzo*x.qty,0));
}
function checkout(){
  if(!cart.length)return;
  const lines=cart.map(x=>`• ${x.nome} — quantità ${x.qty} — ${money(x.prezzo*x.qty)}`).join("\n");
  const total=cart.reduce((s,x)=>s+x.prezzo*x.qty,0);
  const msg=`Ciao Mariomodagoldshop, ho aggiunto questi prodotti al carrello:\n${lines}\n\nTotale: ${money(total)}`;
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`,"_blank");
}
function renderVideos(){
  const el=$("#videos");el.innerHTML="";
  let i=1;
  const add=src=>{const v=document.createElement("video");v.src=src;v.autoplay=true;v.muted=true;v.loop=true;v.playsInline=true;v.controls=true;el.appendChild(v)};
  add("video.mp4");
  for(i=2;i<=8;i++) add(`video${i}.mp4`);
  [...el.children].forEach((v,i)=>{v.addEventListener("error",()=>v.remove())});
}
function renderReviews(){
  const el=$("#reviewsGrid");el.innerHTML="";
  for(let i=1;i<=30;i++){const img=new Image();img.src=`Recensioni${i}.jpg`;img.alt=`Recensione ${i}`;img.onload=()=>el.appendChild(img);img.onerror=()=>{}}
}
function requestProduct(){
  const text=normalize($("#requestProduct").value);if(!text){alert("Scrivi il prodotto che stai cercando.");return}
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Ciao Mariomodagoldshop, vorrei richiedere questo prodotto che non trovo nel catalogo: "+text)}`,"_blank");
}

$("#searchBtn").onclick=()=>{$("#searchPanel").classList.add("open");$("#searchInput").focus()};
$("#closeSearch").onclick=()=>$("#searchPanel").classList.remove("open");
$("#applySearch").onclick=applySearch;
$("#searchInput").addEventListener("keydown",e=>{if(e.key==="Enter")applySearch()});
$("#sortSelect").onchange=renderCatalog;
$("#cartBtn").onclick=()=>{$("#cart").classList.add("open");$("#cartOverlay").classList.add("show")};
$("#closeCart").onclick=()=>{$("#cart").classList.remove("open");$("#cartOverlay").classList.remove("show")};
$("#cartOverlay").onclick=()=>$("#closeCart").click();
$("#checkout").onclick=checkout;
$("#requestBtn").onclick=requestProduct;
$("#year").textContent=new Date().getFullYear();

loadProducts();
