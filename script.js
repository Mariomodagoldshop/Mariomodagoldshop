const WHATSAPP_NUMBER = "393510901180";
const SHEET_API_URL = "INCOLLA_QUI_URL_APPS_SCRIPT";

const CATEGORIES = [
  "Scarpe",
  "Borse",
  "Giubbini",
  "Cinture",
  "Occhiali",
  "Cappelli",
  "T-shirt",
  "Orologi"
];

const FALLBACK_PRODUCTS = [];

let products = [];
let cart = [];
let activeCategory = "";


/* =========================================================
   UTILITÀ
   ========================================================= */

const $ = (selector) => document.querySelector(selector);

const money = (number) =>
  new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR"
  }).format(Number(number) || 0);

function normalize(value) {
  return String(value ?? "").trim();
}

function validProduct(product) {
  return (
    product &&
    product.nome &&
    Number(product.prezzo) > 0
  );
}

function productPrice(product) {
  const prezzo = Number(product.prezzo) || 0;
  const promo = Number(product.prezzoPromo) || 0;

  if (promo > 0 && promo < prezzo) {
    return promo;
  }

  return prezzo;
}

function isAvailable(product) {
  return (
    normalize(product.disponibile)
      .toUpperCase() !== "NO"
  );
}

function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (match) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[match])
  );
}

function escapeAttr(value) {
  return escapeHtml(value);
}


/* =========================================================
   CARRELLO
   ========================================================= */

function loadCart() {

  try {

    const savedCart =
      localStorage.getItem("mmgs_cart");

    if (!savedCart) {
      cart = [];
      return;
    }

    const parsed =
      JSON.parse(savedCart);

    cart =
      Array.isArray(parsed)
        ? parsed
        : [];

  } catch (error) {

    console.warn(
      "Carrello locale non valido. Carrello azzerato.",
      error
    );

    cart = [];

    try {
      localStorage.removeItem("mmgs_cart");
    } catch (e) {
      console.warn(
        "Impossibile eliminare il vecchio carrello.",
        e
      );
    }
  }
}

function saveCart() {

  try {

    localStorage.setItem(
      "mmgs_cart",
      JSON.stringify(cart)
    );

  } catch (error) {

    console.error(
      "Errore salvataggio carrello:",
      error
    );
  }

  updateCart();
}


/* =========================================================
   CARICAMENTO PRODOTTI
   ========================================================= */

async function loadProducts() {

  if (
    !SHEET_API_URL ||
    SHEET_API_URL.includes("INCOLLA_QUI")
  ) {

    products = FALLBACK_PRODUCTS;

  } else {

    try {

      const response =
        await fetch(
          SHEET_API_URL,
          {
            cache: "no-store"
          }
        );

      if (!response.ok) {
        throw new Error(
          `Errore HTTP ${response.status}`
        );
      }

      const data =
        await response.json();

      const rawProducts =
        Array.isArray(data)
          ? data
          : data.products || [];

      products =
        rawProducts
          .map((product) => ({

            nome:
              normalize(
                product["Nome prodotto"] ??
                product.nome
              ),

            foto:
              normalize(
                product.Foto ??
                product.foto
              ),

            categoria:
              normalize(
                product.Categoria ??
                product.categoria
              ),

            marca:
              normalize(
                product.Marca ??
                product.marca
              ),

            taglia:
              normalize(
                product.Taglia ??
                product.taglia
              ),

            colore:
              normalize(
                product.Colore ??
                product.colore
              ),

            prezzo:
              Number(
                String(
                  product.Prezzo ??
                  product.prezzo ??
                  ""
                ).replace(",", ".")
              ),

            prezzoPromo:
              Number(
                String(
                  product["Prezzo promo"] ??
                  product.prezzoPromo ??
                  ""
                ).replace(",", ".")
              ),

            disponibile:
              normalize(
                product.Disponibile ??
                product.disponibile ??
                "SI"
              ),

            nuovo:
              normalize(
                product.Nuovo ??
                product.nuovo ??
                "NO"
              ),

            id:
              product.ID ??
              product.id ??
              (
                crypto.randomUUID
                  ? crypto.randomUUID()
                  : Date.now() +
                    Math.random()
              )
          }))
          .filter(validProduct);

    } catch (error) {

      console.error(
        "Errore caricamento prodotti:",
        error
      );

      products =
        FALLBACK_PRODUCTS;
    }
  }

  buildFilters();
  renderAll();
}


/* =========================================================
   FILTRI E CATEGORIE
   ========================================================= */

function buildFilters() {

  const categories = [
    ...new Set(
      products
        .map(
          (product) =>
            product.categoria
        )
        .filter(Boolean)
    )
  ];

  const sizes = [
    ...new Set(
      products
        .map(
          (product) =>
            product.taglia
        )
        .filter(Boolean)
    )
  ];

  const colors = [
    ...new Set(
      products
        .map(
          (product) =>
            product.colore
        )
        .filter(Boolean)
    )
  ];


  function fillSelect(
    selector,
    values,
    label
  ) {

    const element =
      $(selector);

    if (!element) {
      return;
    }

    element.innerHTML =
      `<option value="">${label}</option>` +
      values
        .sort()
        .map(
          (value) =>
            `<option value="${escapeAttr(value)}">${escapeHtml(value)}</option>`
        )
        .join("");
  }


  fillSelect(
    "#filterCategory",
    categories,
    "Categoria"
  );

  fillSelect(
    "#filterSize",
    sizes,
    "Taglia"
  );

  fillSelect(
    "#filterColor",
    colors,
    "Colore"
  );


  const categoriesElement =
    $("#categories");

  if (!categoriesElement) {
    return;
  }


  categoriesElement.innerHTML =
    `<button class="category-btn active" data-cat="">Tutti</button>` +

    CATEGORIES
      .map(
        (category) =>
          `<button class="category-btn" data-cat="${escapeAttr(category)}">${escapeHtml(category)}</button>`
      )
      .join("");


  categoriesElement.onclick =
    (event) => {

      const button =
        event.target.closest(
          "[data-cat]"
        );

      if (!button) {
        return;
      }

      activeCategory =
        button.dataset.cat;


      document
        .querySelectorAll(
          ".category-btn"
        )
        .forEach(
          (element) => {

            element.classList.toggle(
              "active",
              element === button
            );
          }
        );


      renderCatalog();
    };
}


/* =========================================================
   PRODOTTI
   ========================================================= */

function productCard(product) {

  const template =
    $("#productTemplate");

  if (!template) {
    return document.createDocumentFragment();
  }


  const fragment =
    template.content.cloneNode(true);


  const card =
    fragment.querySelector(
      ".product-card"
    );

  const image =
    fragment.querySelector(
      ".product-image"
    );


  if (image) {

    image.src =
      product.foto
        ? new URL(
            product.foto,
            document.baseURI
          ).href
        : "prodotti.jpeg";

    image.alt =
      product.nome ||
      "Prodotto";

    image.onerror =
      () => {
        image.src =
          "prodotti.jpeg";
      };
  }


  const name =
    fragment.querySelector(
      ".product-name"
    );

  if (name) {
    name.textContent =
      product.nome;
  }


  const details =
    fragment.querySelector(
      ".product-details"
    );

  if (details) {

    details.textContent =
      [
        product.marca,
        product.taglia,
        product.colore
      ]
        .filter(Boolean)
        .join(" • ");
  }


  const currentPrice =
    productPrice(product);

  const hasPromo =
    Number(product.prezzoPromo) > 0 &&
    Number(product.prezzoPromo) <
      Number(product.prezzo);


  const price =
    fragment.querySelector(
      ".price"
    );

  if (price) {
    price.textContent =
      money(currentPrice);
  }


  const oldPrice =
    fragment.querySelector(
      ".old-price"
    );

  if (oldPrice) {

    oldPrice.textContent =
      hasPromo
        ? money(product.prezzo)
        : "";
  }


  const promoBadge =
    fragment.querySelector(
      ".promo-badge"
    );

  if (promoBadge) {

    promoBadge.style.display =
      hasPromo
        ? "block"
        : "none";
  }


  if (
    card &&
    !isAvailable(product)
  ) {

    card.classList.add(
      "sold"
    );
  }


  let quantity = 1;


  const quantityElement =
    fragment.querySelector(
      ".qty"
    );

  if (quantityElement) {
    quantityElement.textContent =
      quantity;
  }


  const minus =
    fragment.querySelector(
      ".minus"
    );

  if (minus) {

    minus.onclick =
      () => {

        quantity =
          Math.max(
            1,
            quantity - 1
          );

        if (quantityElement) {
          quantityElement.textContent =
            quantity;
        }
      };
  }


  const plus =
    fragment.querySelector(
      ".plus"
    );

  if (plus) {

    plus.onclick =
      () => {

        quantity++;

        if (quantityElement) {
          quantityElement.textContent =
            quantity;
        }
      };
  }


  const add =
    fragment.querySelector(
      ".add"
    );

  if (add) {

    add.onclick =
      () => {

        addToCart(
          product,
          quantity
        );
      };
  }


  return fragment;
}


/* =========================================================
   GRIGLIA
   ========================================================= */

function renderGrid(
  selector,
  list
) {

  const element =
    $(selector);

  if (!element) {
    return;
  }


  element.innerHTML = "";


  if (!list.length) {

    element.innerHTML =
      `<div class="empty">Nessun prodotto disponibile.</div>`;

    return;
  }


  list.forEach(
    (product) => {

      element.appendChild(
        productCard(product)
      );
    }
  );
}


/* =========================================================
   RENDER GENERALE
   ========================================================= */

function renderAll() {

  const offers =
    products
      .filter(
        (product) =>
          Number(product.prezzoPromo) > 0 &&
          Number(product.prezzoPromo) <
            Number(product.prezzo)
      )
      .slice(0, 3);


  const news =
    products
      .filter(
        (product) =>
          normalize(product.nuovo)
            .toUpperCase() === "SI"
      )
      .slice(0, 8);


  renderGrid(
    "#offersGrid",
    offers
  );

  renderGrid(
    "#newGrid",
    news
  );

  renderCatalog();

  renderVideos();

  renderReviews();

  updateCart();
}


/* =========================================================
   CATALOGO
   ========================================================= */

function renderCatalog() {

  let list =
    products.filter(
      (product) =>
        !activeCategory ||
        normalize(product.categoria)
          .toLowerCase() ===
        activeCategory.toLowerCase()
    );


  const sortSelect =
    $("#sortSelect");

  const sort =
    sortSelect
      ? sortSelect.value
      : "newest";


  list = [...list].sort(
    (a, b) => {

      if (sort === "asc") {

        return (
          productPrice(a) -
          productPrice(b)
        );
      }


      if (sort === "desc") {

        return (
          productPrice(b) -
          productPrice(a)
        );
      }


      return (
        Number(b.id) -
        Number(a.id)
      );
    }
  );


  renderGrid(
    "#catalogGrid",
    list
  );


  const resultCount =
    $("#resultCount");

  if (resultCount) {

    resultCount.textContent =
      `${list.length} prodotti`;
  }
}


/* =========================================================
   RICERCA
   ========================================================= */

function applySearch() {

  const searchInput =
    $("#searchInput");

  const filterCategory =
    $("#filterCategory");

  const filterSize =
    $("#filterSize");

  const filterColor =
    $("#filterColor");

  const filterAvailability =
    $("#filterAvailability");

  const minPrice =
    $("#minPrice");

  const maxPrice =
    $("#maxPrice");

  const promoOnly =
    $("#promoOnly");

  const newOnly =
    $("#newOnly");


  const query =
    normalize(
      searchInput
        ? searchInput.value
        : ""
    ).toLowerCase();


  const category =
    normalize(
      filterCategory
        ? filterCategory.value
        : ""
    ).toLowerCase();


  const size =
    normalize(
      filterSize
        ? filterSize.value
        : ""
    ).toLowerCase();


  const color =
    normalize(
      filterColor
        ? filterColor.value
        : ""
    ).toLowerCase();


  const availability =
    filterAvailability
      ? filterAvailability.value
      : "";


  const min =
    Number(
      minPrice
        ? minPrice.value
        : 0
    ) || 0;


  const max =
    Number(
      maxPrice
        ? maxPrice.value
        : 0
    ) || Infinity;


  const onlyPromo =
    promoOnly
      ? promoOnly.checked
      : false;


  const onlyNew =
    newOnly
      ? newOnly.checked
      : false;


  const list =
    products.filter(
      (product) => {

        const name =
          normalize(product.nome)
            .toLowerCase();


        const productCategory =
          normalize(product.categoria)
            .toLowerCase();


        const productSize =
          normalize(product.taglia)
            .toLowerCase();


        const productColor =
          normalize(product.colore)
            .toLowerCase();


        const productAvailability =
          normalize(product.disponibile)
            .toUpperCase();


        const price =
          productPrice(product);


        const promo =
          Number(product.prezzoPromo) > 0 &&
          Number(product.prezzoPromo) <
            Number(product.prezzo);


        const isNew =
          normalize(product.nuovo)
            .toUpperCase() === "SI";


        return (

          (!query ||
            name.includes(query)) &&

          (!category ||
            productCategory === category) &&

          (!size ||
            productSize === size) &&

          (!color ||
            productColor === color) &&

          (!availability ||
            productAvailability ===
              availability) &&

          price >= min &&
          price <= max &&

          (!onlyPromo ||
            promo) &&

          (!onlyNew ||
            isNew)
        );
      }
    );


  activeCategory = "";


  document
    .querySelectorAll(
      ".category-btn"
    )
    .forEach(
      (button) => {

        button.classList.remove(
          "active"
        );
      }
    );


  renderGrid(
    "#catalogGrid",
    list
  );


  const resultCount =
    $("#resultCount");

  if (resultCount) {

    resultCount.textContent =
      `${list.length} risultati`;
  }


  const searchPanel =
    $("#searchPanel");

  if (searchPanel) {

    searchPanel.classList.remove(
      "open"
    );
  }


  location.hash =
    "catalogo";
}


/* =========================================================
   AGGIUNTA AL CARRELLO
   ========================================================= */

function addToCart(
  product,
  quantity
) {

  if (!isAvailable(product)) {

    alert(
      "Questo prodotto è esaurito."
    );

    return;
  }


  const key =
    String(
      product.id ||
      product.nome
    );


  const existing =
    cart.find(
      (item) =>
        String(item.id) === key
    );


  if (existing) {

    existing.qty +=
      quantity;

  } else {

    cart.push({

      id: key,

      nome:
        product.nome,

      prezzo:
        productPrice(product),

      qty:
        quantity,

      foto:
        product.foto ||
        "prodotti.jpeg"
    });
  }


  saveCart();


  openCart();
}


/* =========================================================
   AGGIORNA CARRELLO
   ========================================================= */

function updateCart() {

  const cartCount =
    $("#cartCount");

  const cartItems =
    $("#cartItems");

  const cartTotal =
    $("#cartTotal");


  if (cartCount) {

    cartCount.textContent =
      cart.reduce(
        (sum, item) =>
          sum +
          (
            Number(item.qty) || 0
          ),
        0
      );
  }


  if (!cartItems) {
    return;
  }


  cartItems.innerHTML = "";


  if (!cart.length) {

    cartItems.innerHTML =
      `<div class="empty">Il carrello è vuoto.</div>`;

    if (cartTotal) {
      cartTotal.textContent =
        money(0);
    }

    return;
  }


  cart.forEach(
    (item, index) => {

      const element =
        document.createElement(
          "div"
        );

      element.className =
        "cart-item";


      element.innerHTML = `

        <img
          src="${escapeAttr(
            item.foto ||
            "prodotti.jpeg"
          )}"
          alt="${escapeAttr(
            item.nome
          )}"
          onerror="this.src='prodotti.jpeg'"
        >

        <div>
          <strong>
            ${escapeHtml(
              item.nome
            )}
          </strong>

          <br>

          <small>
            ${money(item.prezzo)}
            ×
            ${item.qty}
          </small>
        </div>

        <div class="cart-qty">

          <button
            type="button"
            data-i="${index}"
            data-d="-1"
          >
            −
          </button>

          ${item.qty}

          <button
            type="button"
            data-i="${index}"
            data-d="1"
          >
            +
          </button>

        </div>
      `;


      cartItems.appendChild(
        element
      );
    }
  );


  cartItems.onclick =
    (event) => {

      const button =
        event.target.closest(
          "button[data-i]"
        );

      if (!button) {
        return;
      }


      const index =
        Number(
          button.dataset.i
        );


      const delta =
        Number(
          button.dataset.d
        );


      if (!cart[index]) {
        return;
      }


      cart[index].qty +=
        delta;


      if (
        cart[index].qty <= 0
      ) {

        cart.splice(
          index,
          1
        );
      }


      saveCart();
    };


  const total =
    cart.reduce(
      (sum, item) =>
        sum +
        (
          Number(item.prezzo) *
          Number(item.qty)
        ),
      0
    );


  if (cartTotal) {

    cartTotal.textContent =
      money(total);
  }
}


/* =========================================================
   APERTURA / CHIUSURA CARRELLO
   ========================================================= */

function openCart() {

  const cartElement =
    $("#cart");

  const overlay =
    $("#cartOverlay");


  if (cartElement) {

    cartElement.classList.add(
      "open"
    );
  }


  if (overlay) {

    overlay.classList.add(
      "show"
    );
  }
}


function closeCart() {

  const cartElement =
    $("#cart");

  const overlay =
    $("#cartOverlay");


  if (cartElement) {

    cartElement.classList.remove(
      "open"
    );
  }


  if (overlay) {

    overlay.classList.remove(
      "show"
    );
  }
}


/* =========================================================
   CHECKOUT WHATSAPP
   ========================================================= */

function checkout() {

  if (!cart.length) {

    alert(
      "Il carrello è vuoto."
    );

    return;
  }


  const lines =
    cart
      .map(
        (item) =>
          `• ${item.nome} — quantità ${item.qty} — ${money(
            item.prezzo * item.qty
          )}`
      )
      .join("\n");


  const total =
    cart.reduce(
      (sum, item) =>
        sum +
        (
          item.prezzo *
          item.qty
        ),
      0
    );


  const message =
    `Ciao Mariomodagoldshop, ho aggiunto questi prodotti al carrello:\n${lines}\n\nTotale: ${money(total)}`;


  window.open(
    `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`,
    "_blank"
  );
}


/* =========================================================
   VIDEO
   ========================================================= */

function renderVideos() {

  const element =
    $("#videos");

  if (!element) {
    return;
  }


  element.innerHTML = "";


  function addVideo(source) {

    const video =
      document.createElement(
        "video"
      );


    video.src =
      source;

    video.autoplay =
      true;

    video.muted =
      true;

    video.loop =
      true;

    video.playsInline =
      true;

    video.controls =
      true;


    video.addEventListener(
      "error",
      () => {

        video.remove();
      }
    );


    element.appendChild(
      video
    );
  }


  addVideo(
    "video.mp4"
  );


  for (
    let i = 2;
    i <= 8;
    i++
  ) {

    addVideo(
      `video${i}.mp4`
    );
  }
}


/* =========================================================
   RECENSIONI
   ========================================================= */

function renderReviews() {

  const element =
    $("#reviewsGrid");

  if (!element) {
    return;
  }


  element.innerHTML = "";


  for (
    let i = 1;
    i <= 30;
    i++
  ) {

    const image =
      new Image();


    image.src =
      `Recensioni${i}.jpg`;

    image.alt =
      `Recensione ${i}`;


    image.onload =
      () => {

        element.appendChild(
          image
        );
      };
  }
}


/* =========================================================
   RICHIESTA PRODOTTO
   ========================================================= */

function requestProduct() {

  const input =
    $("#requestProduct");


  const text =
    normalize(
      input
        ? input.value
        : ""
    );


  if (!text) {

    alert(
      "Scrivi il prodotto che stai cercando."
    );

    return;
  }


  const message =
    "Ciao Mariomodagoldshop, vorrei richiedere questo prodotto che non trovo nel catalogo: " +
    text;


  window.open(
    `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`,
    "_blank"
  );
}


/* =========================================================
   MENU HAMBURGER
   ========================================================= */

function initMenu() {

  const menuToggle =
    $("#menuToggle");

  const hamburger =
    document.querySelector(
      ".hamburger"
    );

  const drawer =
    $("#drawer");

  const backdrop =
    document.querySelector(
      ".menu-backdrop"
    );

  const closeButton =
    document.querySelector(
      ".menu-close"
    );


  if (
    !menuToggle ||
    !hamburger ||
    !drawer
  ) {

    console.error(
      "Menu hamburger: elementi non trovati."
    );

    return;
  }


  /*
   * APERTURA
   */

  function openMenu() {

    menuToggle.checked =
      true;


    drawer.style.transform =
      "translateY(0)";

    drawer.style.visibility =
      "visible";

    drawer.style.opacity =
      "1";


    drawer.setAttribute(
      "aria-hidden",
      "false"
    );


    if (backdrop) {

      backdrop.style.display =
        "block";
    }


    document.body.style.overflow =
      "hidden";
  }


  /*
   * CHIUSURA
   */

  function closeMenu() {

    menuToggle.checked =
      false;


    drawer.style.transform =
      "translateY(-100%)";

    drawer.style.visibility =
      "hidden";

    drawer.style.opacity =
      "0";


    drawer.setAttribute(
      "aria-hidden",
      "true"
    );


    if (backdrop) {

      backdrop.style.display =
        "none";
    }


    document.body.style.overflow =
      "";
  }


  /*
   * TRE LINEE
   *
   * IMPORTANTE:
   * il label normalmente cambierebbe
   * automaticamente la checkbox.
   *
   * Qui blocchiamo quel comportamento
   * e facciamo gestire tutto a JS.
   */

  hamburger.addEventListener(
    "click",
    (event) => {

      event.preventDefault();
      event.stopPropagation();


      if (
        drawer.style.visibility ===
        "visible"
      ) {

        closeMenu();

      } else {

        openMenu();
      }
    }
  );


  /*
   * X
   */

  if (closeButton) {

    closeButton.addEventListener(
      "click",
      (event) => {

        event.preventDefault();
        event.stopPropagation();

        closeMenu();
      }
    );
  }


  /*
   * SFONDO
   */

  if (backdrop) {

    backdrop.addEventListener(
      "click",
      (event) => {

        event.preventDefault();

        closeMenu();
      }
    );
  }


  /*
   * LINK DEL MENU
   */

  drawer
    .querySelectorAll("a")
    .forEach(
      (link) => {

        link.addEventListener(
          "click",
          () => {

            closeMenu();
          }
        );
      }
    );


  /*
   * ESC
   */

  document.addEventListener(
    "keydown",
    (event) => {

      if (
        event.key === "Escape"
      ) {

        closeMenu();
      }
    }
  );


  /*
   * STATO INIZIALE
   */

  closeMenu();
}


/* =========================================================
   RICERCA
   ========================================================= */

function initSearch() {

  const searchButton =
    $("#searchBtn");

  const closeButton =
    $("#closeSearch");

  const searchPanel =
    $("#searchPanel");

  const searchInput =
    $("#searchInput");

  const applyButton =
    $("#applySearch");


  if (
    searchButton &&
    searchPanel
  ) {

    searchButton.addEventListener(
      "click",
      () => {

        searchPanel.classList.add(
          "open"
        );


        if (searchInput) {

          setTimeout(
            () => {
              searchInput.focus();
            },
            50
          );
        }
      }
    );
  }


  if (
    closeButton &&
    searchPanel
  ) {

    closeButton.addEventListener(
      "click",
      () => {

        searchPanel.classList.remove(
          "open"
        );
      }
    );
  }


  if (applyButton) {

    applyButton.addEventListener(
      "click",
      applySearch
    );
  }


  if (searchInput) {

    searchInput.addEventListener(
      "keydown",
      (event) => {

        if (
          event.key === "Enter"
        ) {

          event.preventDefault();

          applySearch();
        }
      }
    );
  }
}


/* =========================================================
   CARRELLO UI
   ========================================================= */

function initCart() {

  const cartButton =
    $("#cartBtn");

  const closeButton =
    $("#closeCart");

  const overlay =
    $("#cartOverlay");

  const checkoutButton =
    $("#checkout");


  if (cartButton) {

    cartButton.addEventListener(
      "click",
      openCart
    );
  }


  if (closeButton) {

    closeButton.addEventListener(
      "click",
      closeCart
    );
  }


  if (overlay) {

    overlay.addEventListener(
      "click",
      closeCart
    );
  }


  if (checkoutButton) {

    checkoutButton.addEventListener(
      "click",
      checkout
    );
  }
}


/* =========================================================
   ORDINAMENTO
   ========================================================= */

function initSorting() {

  const select =
    $("#sortSelect");

  if (!select) {
    return;
  }


  select.addEventListener(
    "change",
    renderCatalog
  );
}


/* =========================================================
   RICHIESTA PRODOTTO
   ========================================================= */

function initRequestButton() {

  const button =
    $("#requestBtn");

  if (!button) {
    return;
  }


  button.addEventListener(
    "click",
    requestProduct
  );
}


/* =========================================================
   TASTO ESC GENERALE
   ========================================================= */

function initEscape() {

  document.addEventListener(
    "keydown",
    (event) => {

      if (
        event.key !== "Escape"
      ) {
        return;
      }


      closeCart();


      const searchPanel =
        $("#searchPanel");

      if (searchPanel) {

        searchPanel.classList.remove(
          "open"
        );
      }
    }
  );
}


/* =========================================================
   INIZIALIZZAZIONE DEL SITO
   ========================================================= */

function initSite() {

  /*
   * Carrello
   */

  loadCart();


  /*
   * Menu
   */

  initMenu();


  /*
   * Ricerca
   */

  initSearch();


  /*
   * Carrello UI
   */

  initCart();


  /*
   * Ordinamento
   */

  initSorting();


  /*
   * Richiesta prodotto
   */

  initRequestButton();


  /*
   * ESC
   */

  initEscape();


  /*
   * Anno
   */

  const year =
    $("#year");

  if (year) {

    year.textContent =
      new Date().getFullYear();
  }


  /*
   * Prodotti
   */

  loadProducts();
}


/* =========================================================
   AVVIO
   ========================================================= */

if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    initSite
  );

} else {

  initSite();
}
