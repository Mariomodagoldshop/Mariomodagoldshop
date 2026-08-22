/* =========================================================
   MARIOMODAGOLDSHOP
   JAVASCRIPT DEFINITIVO
========================================================= */

const WHATSAPP_NUMBER = "393510901180";

const GITHUB_OWNER = "mariomodagoldshop";
const GITHUB_REPOSITORY = "Mariomodagoldshop";

const GITHUB_API =
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPOSITORY}/contents/`;

const categories = [
    "scarpe",
    "borsa",
    "giubbino",
    "cintura",
    "occhiale",
    "cappello",
    "tshirt",
    "orologio"
];

const imageExtensions = [
    "jpg",
    "jpeg",
    "png",
    "webp",
    "gif",
    "avif"
];

let products = [];
let cart = [];
let currentCategory = "all";


/* =========================================================
   ELEMENTI HTML
========================================================= */

const productsContainer =
    document.getElementById("products");

const loading =
    document.getElementById("loading");

const noProducts =
    document.getElementById("no-products");

const cartOverlay =
    document.getElementById("cart-overlay");

const cartItemsContainer =
    document.getElementById("cart-items");

const emptyCart =
    document.getElementById("empty-cart");

const cartTotal =
    document.getElementById("cart-total");

const cartCount =
    document.getElementById("cart-count");


/* =========================================================
   PREZZO
========================================================= */

function formatPrice(price) {

    return new Intl.NumberFormat("it-IT", {
        style: "currency",
        currency: "EUR"
    }).format(price);

}


/* =========================================================
   CONTROLLO IMMAGINE
========================================================= */

function isImageFile(filename) {

    const extension =
        filename
            .split(".")
            .pop()
            .toLowerCase();

    return imageExtensions.includes(extension);

}


/* =========================================================
   PARSER DEI NOMI
=========================================================

   FORMATO NORMALE:

   Scarpe1o170.jpg
   Scarpe10o170.jpg
   Orologio7o120.jpg

   FORMATO SCONTATO:

   Orologio7o120sconto100.jpg
   Borsa10o500sconto350.jpg

========================================================= */

function parseProductFilename(filename) {

    if (!filename || !isImageFile(filename)) {
        return null;
    }

    const name = filename
        .replace(/\.[^/.]+$/, "")
        .toLowerCase()
        .trim();


    /* =====================================================
       TROVA CATEGORIA
    ====================================================== */

    let category = null;

    for (const cat of categories) {

        if (name.startsWith(cat)) {

            category = cat;
            break;

        }

    }

    if (!category) {
        return null;
    }


    /* =====================================================
       PRODOTTO SCONTATO
       
       Esempio:

       Orologio7o120sconto100

       articolo = 7
       prezzo originale = 120
       prezzo finale = 100
    ====================================================== */

    const discountRegex = new RegExp(
        "^" +
        category +
        "(\\d+)" +
        "o" +
        "(\\d+(?:[.,]\\d+)?)" +
        "sconto" +
        "(\\d+(?:[.,]\\d+)?)$"
    );

    const discountMatch =
        name.match(discountRegex);


    if (discountMatch) {

        const number =
            discountMatch[1];

        const oldPrice =
            parseFloat(
                discountMatch[2]
                    .replace(",", ".")
            );

        const newPrice =
            parseFloat(
                discountMatch[3]
                    .replace(",", ".")
            );


        /*
           Evita prodotti con prezzi
           non validi o pari a 0.
        */

        if (
            !Number.isFinite(oldPrice) ||
            !Number.isFinite(newPrice) ||
            oldPrice <= 0 ||
            newPrice <= 0 ||
            newPrice >= oldPrice
        ) {

            return null;

        }


        return {

            id: filename,

            filename: filename,

            category: category,

            number: number,

            price: newPrice,

            oldPrice: oldPrice,

            discounted: true,

            imageUrl: null

        };

    }


    /* =====================================================
       PRODOTTO NORMALE
       
       Esempio:

       Orologio7o120

       articolo = 7
       prezzo = 120
    ====================================================== */

    const normalRegex = new RegExp(
        "^" +
        category +
        "(\\d+)" +
        "o" +
        "(\\d+(?:[.,]\\d+)?)$"
    );

    const normalMatch =
        name.match(normalRegex);


    if (!normalMatch) {
        return null;
    }


    const number =
        normalMatch[1];

    const price =
        parseFloat(
            normalMatch[2]
                .replace(",", ".")
        );


    /*
       Mai creare prodotti da 0 €.
    */

    if (
        !Number.isFinite(price) ||
        price <= 0
    ) {

        return null;

    }


    return {

        id: filename,

        filename: filename,

        category: category,

        number: number,

        price: price,

        oldPrice: null,

        discounted: false,

        imageUrl: null

    };

}


/* =========================================================
   CARICA AUTOMATICAMENTE LE FOTO DA GITHUB
========================================================= */

async function loadProducts() {

    products = [];

    try {

        const response =
            await fetch(
                GITHUB_API +
                "?t=" +
                Date.now()
            );


        if (!response.ok) {

            throw new Error(
                "Errore nella connessione a GitHub."
            );

        }


        const files =
            await response.json();


        /*
           GitHub restituisce tutti i file
           presenti nella root.
        */

        files.forEach(file => {

            /*
               Ignora cartelle e file non immagine.
            */

            if (
                file.type !== "file" ||
                !isImageFile(file.name)
            ) {

                return;

            }


            const product =
                parseProductFilename(
                    file.name
                );


            /*
               Se il nome non rispetta
               il formato corretto,
               il file viene ignorato.
            */

            if (!product) {

                return;

            }


            /*
               URL diretto dell'immagine.
            */

            product.imageUrl =
                file.download_url;


            products.push(product);

        });


        /* =================================================
           ORDINA I PRODOTTI
        ================================================= */

        products.sort(
            (a, b) => {

                /*
                   Prima categoria.
                */

                const categoryCompare =
                    a.category.localeCompare(
                        b.category
                    );


                if (
                    categoryCompare !== 0
                ) {

                    return categoryCompare;

                }


                /*
                   Poi numero articolo.

                   1
                   2
                   3
                   ...
                   10
                   11
                   12
                */

                return (
                    Number(a.number) -
                    Number(b.number)
                );

            }
        );


        loading.style.display =
            "none";


        renderProducts();


    } catch (error) {

        console.error(
            "Errore caricamento prodotti:",
            error
        );


        products = [];


        loading.style.display =
            "none";


        productsContainer.innerHTML =
            "";


        noProducts.style.display =
            "block";


        noProducts.textContent =
            "NESSUN PRODOTTO DISPONIBILE.";

    }

}


/* =========================================================
   CREA CARD PRODOTTO
========================================================= */

function createProductCard(product) {

    const card =
        document.createElement("article");

    card.className =
        "product-card";

    card.dataset.category =
        product.category;


    /* =====================================================
       IMMAGINE
    ====================================================== */

    const imageContainer =
        document.createElement("div");

    imageContainer.className =
        "product-image-container";


    const image =
        document.createElement("img");

    image.className =
        "product-image";

    image.src =
        product.imageUrl;

    image.alt =
        "Prodotto MARIOMODAGOLDSHOP";

    image.loading =
        "lazy";


    imageContainer.appendChild(
        image
    );


    /* =====================================================
       INFORMAZIONI
    ====================================================== */

    const info =
        document.createElement("div");

    info.className =
        "product-info";


    /* =====================================================
       PREZZO
    ====================================================== */

    const priceArea =
        document.createElement("div");

    priceArea.className =
        "product-price-area";


    if (product.discounted) {

        const oldPrice =
            document.createElement("span");

        oldPrice.className =
            "product-old-price";

        oldPrice.textContent =
            formatPrice(
                product.oldPrice
            );


        const newPrice =
            document.createElement("span");

        newPrice.className =
            "product-price";

        newPrice.textContent =
            formatPrice(
                product.price
            );


        const badge =
            document.createElement("span");

        badge.className =
            "discount-badge";

        badge.textContent =
            "SCONTO";


        priceArea.appendChild(
            oldPrice
        );

        priceArea.appendChild(
            newPrice
        );

        priceArea.appendChild(
            badge
        );

    } else {

        const price =
            document.createElement("span");

        price.className =
            "product-price";

        price.textContent =
            formatPrice(
                product.price
            );


        priceArea.appendChild(
            price
        );

    }


    /* =====================================================
       QUANTITÀ
    ====================================================== */

    const quantityRow =
        document.createElement("div");

    quantityRow.className =
        "quantity-row";


    const minus =
        document.createElement("button");

    minus.className =
        "quantity-button";

    minus.textContent =
        "−";


    const quantity =
        document.createElement("span");

    quantity.className =
        "quantity-value";

    quantity.textContent =
        "1";


    const plus =
        document.createElement("button");

    plus.className =
        "quantity-button";

    plus.textContent =
        "+";


    let quantityValue = 1;


    minus.addEventListener(
        "click",
        () => {

            if (
                quantityValue > 1
            ) {

                quantityValue--;

                quantity.textContent =
                    quantityValue;

            }

        }
    );


    plus.addEventListener(
        "click",
        () => {

            quantityValue++;

            quantity.textContent =
                quantityValue;

        }
    );


    quantityRow.appendChild(
        minus
    );

    quantityRow.appendChild(
        quantity
    );

    quantityRow.appendChild(
        plus
    );


    /* =====================================================
       AGGIUNGI AL CARRELLO
    ====================================================== */

    const addButton =
        document.createElement("button");

    addButton.className =
        "add-cart-button";

    addButton.textContent =
        "AGGIUNGI AL CARRELLO";


    addButton.addEventListener(
        "click",
        () => {

            addToCart(
                product,
                quantityValue
            );


            addButton.textContent =
                "AGGIUNTO ✓";


            addButton.classList.add(
                "added"
            );


            setTimeout(
                () => {

                    addButton.textContent =
                        "AGGIUNGI AL CARRELLO";

                    addButton.classList.remove(
                        "added"
                    );

                },
                1000
            );

        }
    );


    info.appendChild(
        priceArea
    );

    info.appendChild(
        quantityRow
    );

    info.appendChild(
        addButton
    );


    card.appendChild(
        imageContainer
    );

    card.appendChild(
        info
    );


    return card;

}


/* =========================================================
   MOSTRA PRODOTTI
========================================================= */

function renderProducts() {

    productsContainer.innerHTML =
        "";


    const filteredProducts =
        currentCategory === "all"

            ? products

            : products.filter(
                product =>
                    product.category ===
                    currentCategory
            );


    if (
        filteredProducts.length === 0
    ) {

        noProducts.style.display =
            "block";

        return;

    }


    noProducts.style.display =
        "none";


    filteredProducts.forEach(
        product => {

            productsContainer.appendChild(
                createProductCard(
                    product
                )
            );

        }
    );

}


/* =========================================================
   FILTRO CATEGORIA
========================================================= */

function filterCategory(
    category,
    button
) {

    currentCategory =
        category;


    document
        .querySelectorAll(
            ".category-button"
        )
        .forEach(
            btn => {

                btn.classList.remove(
                    "active"
                );

            }
        );


    button.classList.add(
        "active"
    );


    renderProducts();

}


/* =========================================================
   AGGIUNGI AL CARRELLO
========================================================= */

function addToCart(
    product,
    quantity
) {

    const existing =
        cart.find(
            item =>
                item.id ===
                product.id
        );


    if (existing) {

        existing.quantity +=
            quantity;

    } else {

        cart.push({

            ...product,

            quantity: quantity

        });

    }


    saveCart();

    renderCart();

}


/* =========================================================
   RIMUOVI DAL CARRELLO
========================================================= */

function removeFromCart(id) {

    cart =
        cart.filter(
            item =>
                item.id !== id
        );


    saveCart();

    renderCart();

}


/* =========================================================
   CAMBIA QUANTITÀ
========================================================= */

function changeCartQuantity(
    id,
    change
) {

    const item =
        cart.find(
            product =>
                product.id === id
        );


    if (!item) {
        return;
    }


    item.quantity +=
        change;


    if (
        item.quantity <= 0
    ) {

        removeFromCart(id);

        return;

    }


    saveCart();

    renderCart();

}


/* =========================================================
   RENDER CARRELLO
========================================================= */

function renderCart() {

    cartItemsContainer.innerHTML =
        "";


    if (
        cart.length === 0
    ) {

        emptyCart.style.display =
            "flex";

    } else {

        emptyCart.style.display =
            "none";

    }


    let total = 0;

    let count = 0;


    cart.forEach(item => {

        total +=
            item.price *
            item.quantity;


        count +=
            item.quantity;


        const cartItem =
            document.createElement(
                "div"
            );

        cartItem.className =
            "cart-item";


        const image =
            document.createElement(
                "img"
            );

        image.className =
            "cart-item-image";

        image.src =
            item.imageUrl ||
            item.filename;

        image.alt =
            "Prodotto";


        const info =
            document.createElement(
                "div"
            );

        info.className =
            "cart-item-info";


        const price =
            document.createElement(
                "div"
            );

        price.className =
            "cart-item-price";

        price.textContent =
            formatPrice(
                item.price
            );


        const quantity =
            document.createElement(
                "div"
            );

        quantity.className =
            "cart-item-quantity";

        quantity.textContent =
            "Quantità: " +
            item.quantity;


        const minus =
            document.createElement(
                "button"
            );

        minus.className =
            "remove-item";

        minus.textContent =
            "− 1";

        minus.onclick =
            () =>
                changeCartQuantity(
                    item.id,
                    -1
                );


        const plus =
            document.createElement(
                "button"
            );

        plus.className =
            "remove-item";

        plus.textContent =
            "+ 1";

        plus.onclick =
            () =>
                changeCartQuantity(
                    item.id,
                    1
                );


        const remove =
            document.createElement(
                "button"
            );

        remove.className =
            "remove-item";

        remove.textContent =
            "Rimuovi";

        remove.onclick =
            () =>
                removeFromCart(
                    item.id
                );


        info.appendChild(
            price
        );

        info.appendChild(
            quantity
        );

        info.appendChild(
            minus
        );

        info.appendChild(
            plus
        );

        info.appendChild(
            remove
        );


        cartItem.appendChild(
            image
        );

        cartItem.appendChild(
            info
        );


        cartItemsContainer.appendChild(
            cartItem
        );

    });


    cartTotal.textContent =
        formatPrice(total);


    cartCount.textContent =
        count;

}


/* =========================================================
   APRI CARRELLO
========================================================= */

function openCart() {

    cartOverlay.classList.add(
        "open"
    );

    document.body.style.overflow =
        "hidden";

}


/* =========================================================
   CHIUDI CARRELLO
========================================================= */

function closeCart() {

    cartOverlay.classList.remove(
        "open"
    );

    document.body.style.overflow =
        "";

}


/* =========================================================
   CHIUDI CLICCANDO FUORI
========================================================= */

function closeCartOutside(event) {

    if (
        event.target ===
        cartOverlay
    ) {

        closeCart();

    }

}


/* =========================================================
   CHECKOUT WHATSAPP
========================================================= */

function checkoutWhatsApp() {

    if (
        cart.length === 0
    ) {

        alert(
            "Il carrello è vuoto."
        );

        return;

    }


    let message =
        "Ciao Mariomodagoldshop, ho aggiunto questi prodotti al carrello:\n\n";


    cart.forEach(item => {

        message +=
            "• " +
            item.category.toUpperCase() +
            " " +
            item.number +
            " x " +
            item.quantity +
            " - " +
            formatPrice(
                item.price
            ) +
            "\n";

    });


    let total = 0;


    cart.forEach(item => {

        total +=
            item.price *
            item.quantity;

    });


    message +=
        "\nTotale: " +
        formatPrice(total);


    const url =
        "https://wa.me/" +
        WHATSAPP_NUMBER +
        "?text=" +
        encodeURIComponent(
            message
        );


    window.open(
        url,
        "_blank"
    );

}


/* =========================================================
   SALVA CARRELLO
========================================================= */

function saveCart() {

    localStorage.setItem(
        "mariomodagoldshop_cart",
        JSON.stringify(cart)
    );

}


/* =========================================================
   CARICA CARRELLO
========================================================= */

function loadCart() {

    try {

        const saved =
            localStorage.getItem(
                "mariomodagoldshop_cart"
            );


        if (saved) {

            cart =
                JSON.parse(saved);

        }

    } catch (error) {

        cart = [];

    }

}


/* =========================================================
   AVVIO
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadCart();

        renderCart();

        loadProducts();

    }
);
