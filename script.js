/* =========================================================
   MARIO_MODA_GOLD_SHOP
   SCRIPT PRINCIPALE
   ========================================================= */

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
   FUNZIONI UTILI
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
  return product && product.nome && Number(product.prezzo) > 0;
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
  return normalize(product.disponibile).toUpperCase() !== "NO";
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (match) => {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[match];
  });
}

function escapeAttr(value) {
  return escapeHtml(value);
}


/* =========================================================
   CARRELLO LOCALE
   ========================================================= */

function loadCart() {
  try {
    const savedCart = localStorage.getItem("mmgs_cart");

    if (!savedCart) {
      cart = [];
      return;
    }

    const parsedCart = JSON.parse(savedCart);

    if (Array.isArray(parsedCart)) {
      cart = parsedCart;
    } else {
      cart = [];
    }

  } catch (error) {
    console.warn(
      "Il carrello salvato non è valido. Il carrello verrà ripristinato.",
      error
    );

    cart = [];

    try {
      localStorage.removeItem("mmgs_cart");
    } catch (e) {
      console.warn("Impossibile cancellare il carrello locale.", e);
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
    console.error("Errore salvataggio carrello:", error);
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

      const response = await fetch(
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

      const data = await response.json();

      const rawProducts =
        Array.isArray(data)
          ? data
          : data.products || [];

      products = rawProducts
        .map((product) => ({

          nome: normalize(
            product["Nome prodotto"] ??
            product.nome
          ),

          foto: normalize(
            product.Foto ??
            product.foto
          ),

          categoria: normalize(
            product.Categoria ??
            product.categoria
          ),

          marca: normalize(
            product.Marca ??
            product.marca
          ),

          taglia: normalize(
            product.Taglia ??
            product.taglia
          ),

          colore: normalize(
            product.Colore ??
            product.colore
          ),

          prezzo: Number(
            String(
              product.Prezzo ??
              product.prezzo ??
              ""
            ).replace(",", ".")
          ),

          prezzoPromo: Number(
            String(
              product["Prezzo promo"] ??
              product.prezzoPromo ??
              ""
            ).replace(",", ".")
          ),

          disponibile: normalize(
            product.Disponibile ??
            product.disponibile ??
            "SI"
          ),

          nuovo: normalize(
            product.Nuovo ??
            product.nuovo ??
            "NO"
          ),

          id:
            product.ID ??
            product.id ??
            crypto.randomUUID()

        }))
        .filter(validProduct);

    } catch (error) {

      console.error(
        "Errore caricamento prodotti:",
        error
      );

      products = FALLBACK_PRODUCTS;
    }
  }

  buildFilters();
  renderAll();
}


/* =========================================================
   FILTRI
   ========================================================= */

function buildFilters() {

  const categories = [
    ...new Set(
      products
        .map((product) => product.categoria)
        .filter(Boolean)
    )
  ];

  const sizes = [
    ...new Set(
      products
        .map((product) => product.taglia)
        .filter(Boolean)
    )
  ];

  const colors = [
    ...new Set(
      products
        .map((product) => product.colore)
        .filter(Boolean)
    )
  ];


  const fillSelect = (
    selector,
    values,
    label
  ) => {

    const element = $(selector);

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
  };


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


  const categoriesElement = $("#categories");

  if (categoriesElement) {

    categoriesElement.innerHTML =
      `<button class="category-btn active" data-cat="">Tutti</button>` +

      CATEGORIES
        .map(
          (category) =>
            `<button class="category-btn" data-cat="${escapeAttr(category)}">${escapeHtml(category)}</button>`
        )
        .join("");

    categoriesElement.onclick = (event) => {

      const button =
        event.target.closest("[data-cat]");

      if (!button) {
        return;
      }

      activeCategory =
        button.dataset.cat;

      document
        .querySelectorAll(".category-btn")
        .forEach((element) => {
          element.classList.toggle(
            "active",
            element === button
          );
        });

      renderCatalog();
    };
  }
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
    fragment.querySelector(".product-card");

  const image =
    fragment.querySelector(".product-image");

  const name =
    fragment.querySelector(".product-name");

  const details =
    fragment.querySelector(".product-details");

  const price =
    fragment.querySelector(".price");

  const oldPrice =
    fragment.querySelector(".old-price");

  const promoBadge =
    fragment.querySelector(".promo-badge");

  const quantityElement =
    fragment.querySelector(".qty");

  const minusButton =
    fragment.querySelector(".minus");

  const plusButton =
    fragment.querySelector(".plus");

  const addButton =
    fragment.querySelector(".add");


  /* IMMAGINE */

  if (image) {

    image.src =
      product.foto
        ? new URL(
            product.foto,
            document.baseURI
          ).href
        : "prodotti.jpeg";

    image.alt =
      product.nome || "Prodotto";

    image.onerror = () => {
      image.src = "prodotti.jpeg";
    };
  }


  /* TESTI */

  if (name) {
    name.textContent =
      product.nome;
  }

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


  /* PREZZO */

  const currentPrice =
    productPrice(product);

  const hasPromo =
    Number(product.prezzoPromo) > 0 &&
    Number(product.prezzoPromo) <
    Number(product.prezzo);


  if (price) {
    price.textContent =
      money(currentPrice);
  }

  if (oldPrice) {

    oldPrice.textContent =
      hasPromo
        ? money(product.prezzo)
        : "";
  }

  if (promoBadge) {

    promoBadge.style.display =
      hasPromo
        ? "block"
        : "none";
  }


  /* DISPONIBILITÀ */

  if (!isAvailable(product)) {

    if (card) {
      card.classList.add("sold");
    }
  }


  /* QUANTITÀ */

  let quantity = 1;

  if (quantityElement) {
    quantityElement.textContent =
      quantity;
  }


  if (minusButton) {

    minusButton.onclick = () => {

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


  if (plusButton) {

    plusButton.onclick = () => {

      quantity++;

      if (quantityElement) {
        quantityElement.textContent =
          quantity;
      }
    };
  }


  /* AGGIUNGI */

  if (addButton) {

    addButton.onclick = () => {

      addToCart(
        product,
        quantity
      );
    };
  }


  return fragment;
}


/* =========================================================
   GRIGLIE
   ========================================================= */

function renderGrid(selector, list) {

  const element = $(selector);

  if (!element) {
    return;
  }

  element.innerHTML = "";

  if (!list.length) {

    element.innerHTML =
      `<div class="empty">Nessun prodotto disponibile.</div>`;

    return;
  }

  list.forEach((product) => {

    element.appendChild(
      productCard(product)
    );
  });
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


  const newProducts =
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
    newProducts
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
    products.filter((product) => {

      if (!activeCategory) {
        return true;
      }

      return (
        normalize(product.categoria)
          .toLowerCase() ===
        activeCategory.toLowerCase()
      );
    });


  const sortSelect =
    $("#sortSelect");

  const sort =
    sortSelect
      ? sortSelect.value
      : "newest";


  if (sort === "asc") {

    list.sort(
      (a, b) =>
        productPrice(a) -
        productPrice(b)
    );

  } else if (sort === "desc") {

    list.sort(
      (a, b) =>
        productPrice(b) -
        productPrice(a)
    );
  }


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

  const category =
    $("#filterCategory");

  const size =
    $("#filterSize");

  const color =
    $("#filterColor");

  const availability =
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


  const selectedCategory =
    normalize(
      category
        ? category.value
        : ""
    ).toLowerCase();


  const selectedSize =
    normalize(
      size
        ? size.value
        : ""
    ).toLowerCase();


  const selectedColor =
    normalize(
      color
        ? color.value
        : ""
    ).toLowerCase();


  const selectedAvailability =
    availability
      ? availability.value
      : "";


  const minimum =
    Number(
      minPrice
        ? minPrice.value
        : 0
    ) || 0;


  const maximum =
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


  const filteredProducts =
    products.filter((product) => {

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


      const available =
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

        (!selectedCategory ||
          productCategory ===
          selectedCategory) &&

        (!selectedSize ||
          productSize ===
          selectedSize) &&

        (!selectedColor ||
          productColor ===
          selectedColor) &&

        (!selectedAvailability ||
          available ===
          selectedAvailability) &&

        price >= minimum &&
        price <= maximum &&

        (!onlyPromo ||
          promo) &&

        (!onlyNew ||
          isNew)
      );
    });


  activeCategory = "";


  document
    .querySelectorAll(".category-btn")
    .forEach((button) => {

      button.classList.remove(
        "active"
      );
    });


  renderGrid(
    "#catalogGrid",
    filteredProducts
  );


  const resultCount =
    $("#resultCount");

  if (resultCount) {

    resultCount.textContent =
      `${filteredProducts.length} risultati`;
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
   AGGIUNGI AL CARRELLO
   ========================================================= */

function addToCart(product, quantity) {

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

    existing.qty += quantity;

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


  const cartElement =
    $("#cart");

  const cartOverlay =
    $("#cartOverlay");


  if (cartElement) {

    cartElement.classList.add(
      "open"
    );
  }

  if (cartOverlay) {

    cartOverlay.classList.add(
      "show"
    );
  }
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
          (Number(item.qty) || 0),
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
            item.foto || "prodotti.jpeg"
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
            data-index="${index}"
            data-delta="-1"
          >
            −
          </button>

          ${item.qty}

          <button
            type="button"
            data-index="${index}"
            data-delta="1"
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
          "button[data-index]"
        );

      if (!button) {
        return;
      }


      const index =
        Number(
          button.dataset.index
        );


      const delta =
        Number(
          button.dataset.delta
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

  const container =
    $("#videos");

  if (!container) {
    return;
  }


  container.innerHTML = "";


  const addVideo =
    (source) => {

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


      container.appendChild(
        video
      );
    };


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

  const container =
    $("#reviewsGrid");

  if (!container) {
    return;
  }


  container.innerHTML = "";


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

        container.appendChild(
          image
        );
      };


    image.onerror =
      () => {
        /* Immagine non presente:
           non facciamo nulla. */
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
   MENU
   ========================================================= */

function initMenu() {

  const menuToggle =
    $("#menuToggle");

  const drawer =
    $("#drawer");


  if (!menuToggle) {
    return;
  }


  /*
     Il tuo menu utilizza già una checkbox
     collegata al label hamburger.

     Non cambiamo il sistema CSS,
     ma aggiungiamo aria-hidden
     e chiusura automatica quando
     si clicca una voce.
  */

  const updateMenuState =
    () => {

      if (!drawer) {
        return;
      }


      drawer.setAttribute(
        "aria-hidden",
        menuToggle.checked
          ? "false"
          : "true"
      );
    };


  menuToggle.addEventListener(
    "change",
    updateMenuState
  );


  updateMenuState();


  if (drawer) {

    drawer
      .querySelectorAll("a")
      .forEach((link) => {

        link.addEventListener(
          "click",
          () => {

            menuToggle.checked =
              false;

            updateMenuState();
          }
        );
      });
  }
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
            () => searchInput.focus(),
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

  const cartElement =
    $("#cart");

  const closeButton =
    $("#closeCart");

  const overlay =
    $("#cartOverlay");

  const checkoutButton =
    $("#checkout");


  if (
    cartButton &&
    cartElement &&
    overlay
  ) {

    cartButton.addEventListener(
      "click",
      () => {

        cartElement.classList.add(
          "open"
        );

        overlay.classList.add(
          "show"
        );
      }
    );
  }


  const closeCart =
    () => {

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
    };


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
   RICHIESTA
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
   TASTO ESC
   ========================================================= */

function initEscapeKey() {

  document.addEventListener(
    "keydown",
    (event) => {

      if (
        event.key !== "Escape"
      ) {
        return;
      }


      /* MENU */

      const menuToggle =
        $("#menuToggle");

      if (menuToggle) {

        menuToggle.checked =
          false;

        menuToggle.dispatchEvent(
          new Event("change")
        );
      }


      /* RICERCA */

      const searchPanel =
        $("#searchPanel");

      if (searchPanel) {

        searchPanel.classList.remove(
          "open"
        );
      }


      /* CARRELLO */

      const cartElement =
        $("#cart");

      const cartOverlay =
        $("#cartOverlay");


      if (cartElement) {

        cartElement.classList.remove(
          "open"
        );
      }


      if (cartOverlay) {

        cartOverlay.classList.remove(
          "show"
        );
      }
    }
  );
}


/* =========================================================
   INIZIALIZZAZIONE
   ========================================================= */

function initSite() {

  /*
     IMPORTANTISSIMO:

     Tutti gli elementi HTML vengono cercati
     SOLO dopo che il DOM è pronto.

     Questo evita che un singolo elemento
     mancante blocchi completamente
     tutto il JavaScript.
  */


  loadCart();

  initMenu();
  initSearch();
  initCart();
  initRequestButton();
  initSorting();
  initEscapeKey();


  /* ANNO */

  const year =
    $("#year");

  if (year) {

    year.textContent =
      new Date().getFullYear();
  }


  /* CARICAMENTO PRODOTTI */

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
