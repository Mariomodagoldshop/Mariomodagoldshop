/* =========================================================
   MARIOMODAGOLDSHOP
   JAVASCRIPT
   CARICAMENTO AUTOMATICO PRODOTTI DA GITHUB
========================================================= */


/* =========================================================
   IMPOSTAZIONI
========================================================= */

const WHATSAPP_NUMBER = "393510901180";

const GITHUB_OWNER = "mariomodagoldshop";

const GITHUB_REPOSITORY = "Mariomodagoldshop";

const GITHUB_API_URL =
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPOSITORY}/contents/`;


/* =========================================================
   CATEGORIE
========================================================= */

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


/* =========================================================
   ESTENSIONI IMMAGINI
========================================================= */

const allowedExtensions = [
    "jpg",
    "jpeg",
    "png",
    "webp",
    "gif",
    "avif"
];


/* =========================================================
   VARIABILI
========================================================= */

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
   FORMATTAZIONE PREZZO
========================================================= */

function formatPrice(price) {

    return new Intl.NumberFormat("it-IT", {

        style: "currency",

        currency: "EUR"

    }).format(price);

}


/* =========================================================
   CONTROLLO FILE IMMAGINE
========================================================= */

function isImageFile(filename) {

    const extension =
        filename
            .split(".")
            .pop()
            .toLowerCase();

    return allowedExtensions.includes(
        extension
    );

}


/* =========================================================
   PARSER NOME FILE
=========================================================

   FORMATO NORMALE:

   Scarpe1o170.jpg
   Scarpe2o200.jpg
   Scarpe10o170.jpg
   Scarpe11o220.jpg

   FORMATO SCONTATO:

   Borsa1sconto330o220.jpg
   Borsa10sconto500o350.jpg

========================================================= */

function parseProductFilename(filename) {

    if (
        !filename ||
        !isImageFile(filename)
    ) {

        return null;

    }


    /*
       Toglie l'estensione
    */

    const name =
        filename
            .replace(/\.[^/.]+$/, "")
            .toLowerCase()
            .trim();


    let category = null;


    /* =====================================================
       TROVA CATEGORIA
    ====================================================== */

    for (
        const cat of categories
    ) {

        if (
            name.startsWith(cat)
        ) {

            category = cat;

            break;

        }

    }


    /*
       Se la categoria non esiste,
       ignora il file.
    */

    if (!category) {

        return null;

    }


    /* =====================================================
       PRODOTTO SCONTATO
    ======================================================

       Esempio:

       Borsa10sconto500o350.jpg

       numero = 10
       vecchio prezzo = 500
       nuovo prezzo = 350

    ====================================================== */

    const discountMatch =
        name.match(

            new RegExp(

                "^" +
                category +
                "(\\d+)" +
                "sconto" +
                "(\\d+(?:[.,]\\d+)?)" +
                "o" +
                "(\\d+(?:[.,]\\d+)?)$"

            )

        );


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
           Controllo prezzi.
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

            discounted: true

        };

    }


    /* =====================================================
       PRODOTTO NORMALE
    ======================================================

       Esempio:

       Scarpe10o170.jpg

       numero = 10
       prezzo = 170

    ====================================================== */

    const normalMatch =
        name.match(

            new RegExp(

                "^" +
                category +
                "(\\d+)" +
                "o" +
                "(\\d+(?:[.,]\\d+)?)$"

            )

        );


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
       MAI CREARE UN PRODOTTO DA 0 €
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

        discounted: false

    };

}


/* =========================================================
   CARICAMENTO AUTOMATICO DA GITHUB
========================================================= */

async function loadProducts() {

    products = [];


    try {

        const response =
            await fetch(

                GITHUB_API_URL +
                "?t=" +
                Date.now()

            );


        if (!response.ok) {

            throw new Error(
                "Impossibile leggere il repository GitHub."
            );

        }


        const files =
            await response.json();


        /*
           Controlla tutti i file
           presenti nella root.
        */

        files.forEach(
            file => {

                /*
                   Solo file immagine.
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
                   viene ignorato.
                */

                if (!product) {

                    return;

                }


                /*
                   URL diretto dell'immagine.
                */

                product.imageUrl =
                    file.download_url;


                products.push(
                    product
                );

            }
        );


        /* =================================================
           ORDINAMENTO
        ================================================= */

        products.sort(
            (a, b) => {

                const categoryCompare =
                    a.category.localeCompare(
                        b.category
                    );


                if (
                    categoryCompare !== 0
                ) {

                    return categoryCompare;

                }


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


        renderProducts();

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
       INFO
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


    if (
        product.discounted
    ) {

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
       BOTTONE CARRELLO
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
   RIMUOVI PRODOTTO
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
   CAMBIA QUANTITÀ CARRELLO
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


    cart.forEach(
        item => {

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
               
            discounted: true

        };

    }


    /* =====================================================
       PRODOTTO NORMALE
    ====================================================== */

    const normalMatch = cleanName.match(
        new RegExp(
            "^" +
            category +
            "(\\d+)(\\d+(?:[.,]\\d+)?)$"
        )
    );


    if (!normalMatch) {

        return null;

    }


    const number = normalMatch[1];

    const price = parseFloat(
        normalMatch[2].replace(",", ".")
    );


    /* PREZZO NON VALIDO */

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

        discounted: false

    };

}


/* =========================================================
   FILE DA CARICARE
=========================================================

   QUI INSERISCI SOLO LE FOTO CHE HAI REALMENTE
   CARICATO SU GITHUB.

   NON INSERIRE FILE INESISTENTI.

========================================================= */

const imageFiles = [

    /*
       ESEMPIO:

       "Scarpe1170.jpg",
       "Borsa1sconto330220.jpg"

       Quando non hai prodotti lascia semplicemente:

       []
    */

];


/* =========================================================
   CARICAMENTO PRODOTTI
========================================================= */

function loadProducts() {

    products = [];


    imageFiles.forEach(filename => {

        const product =
            parseProductFilename(filename);


        if (!product) {

            return;

        }


        /*
           CONTROLLO FINALE:
           mai prodotti con prezzo 0
        */

        if (
            !product.price ||
            product.price <= 0
        ) {

            return;

        }


        products.push(product);

    });


    loading.style.display = "none";

    renderProducts();

}


/* =========================================================
   CREA CARD
========================================================= */

function createProductCard(product) {

    const card =
        document.createElement("article");

    card.className = "product-card";

    card.dataset.category =
        product.category;


    /* FOTO */

    const imageContainer =
        document.createElement("div");

    imageContainer.className =
        "product-image-container";


    const image =
        document.createElement("img");

    image.className =
        "product-image";

    image.src =
        product.filename;

    image.alt =
        "Prodotto MARIOMODAGOLDSHOP";

    image.loading =
        "lazy";


    imageContainer.appendChild(image);


    /* INFO */

    const info =
        document.createElement("div");

    info.className =
        "product-info";


    /* PREZZO */

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
            formatPrice(product.oldPrice);


        const newPrice =
            document.createElement("span");

        newPrice.className =
            "product-price";

        newPrice.textContent =
            formatPrice(product.price);


        const badge =
            document.createElement("span");

        badge.className =
            "discount-badge";

        badge.textContent =
            "SCONTO";


        priceArea.appendChild(oldPrice);

        priceArea.appendChild(newPrice);

        priceArea.appendChild(badge);

    } else {

        const price =
            document.createElement("span");

        price.className =
            "product-price";

        price.textContent =
            formatPrice(product.price);

        priceArea.appendChild(price);

    }


    /* QUANTITÀ */

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

            if (quantityValue > 1) {

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


    quantityRow.appendChild(minus);

    quantityRow.appendChild(quantity);

    quantityRow.appendChild(plus);


    /* CARRELLO */

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


            setTimeout(() => {

                addButton.textContent =
                    "AGGIUNGI AL CARRELLO";

                addButton.classList.remove(
                    "added"
                );

            }, 1000);

        }
    );


    info.appendChild(priceArea);

    info.appendChild(quantityRow);

    info.appendChild(addButton);


    card.appendChild(imageContainer);

    card.appendChild(info);


    return card;

}


/* =========================================================
   MOSTRA PRODOTTI
========================================================= */

function renderProducts() {

    productsContainer.innerHTML = "";


    const filteredProducts =
        currentCategory === "all"

            ? products

            : products.filter(
                product =>
                    product.category ===
                    currentCategory
            );


    /* NESSUN PRODOTTO */

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
                createProductCard(product)
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
        .forEach(btn => {

            btn.classList.remove(
                "active"
            );

        });


    button.classList.add(
        "active"
    );


    renderProducts();

}


/* =========================================================
   AGGIUNGI CARRELLO
========================================================= */

function addToCart(
    product,
    quantity
) {

    const existing =
        cart.find(
            item =>
                item.id === product.id
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
   RIMUOVI
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
   QUANTITÀ CARRELLO
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


    item.quantity += change;


    if (item.quantity <= 0) {

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


    if (cart.length === 0) {

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
            document.createElement("div");

        cartItem.className =
            "cart-item";


        const image =
            document.createElement("img");

        image.className =
            "cart-item-image";

        image.src =
            item.filename;

        image.alt =
            "Prodotto";


        const info =
            document.createElement("div");

        info.className =
            "cart-item-info";


        const price =
            document.createElement("div");

        price.className =
            "cart-item-price";

        price.textContent =
            formatPrice(item.price);


        const quantity =
            document.createElement("div");

        quantity.className =
            "cart-item-quantity";

        quantity.textContent =
            "Quantità: " +
            item.quantity;


        const minus =
            document.createElement("button");

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
            document.createElement("button");

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
            document.createElement("button");

        remove.className =
            "remove-item";

        remove.textContent =
            "Rimuovi";

        remove.onclick =
            () =>
                removeFromCart(
                    item.id
                );


        info.appendChild(price);

        info.appendChild(quantity);

        info.appendChild(minus);

        info.appendChild(plus);

        info.appendChild(remove);


        cartItem.appendChild(image);

        cartItem.appendChild(info);


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
   WHATSAPP
========================================================= */

function checkoutWhatsApp() {

    if (cart.length === 0) {

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
            formatPrice(item.price) +
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
        encodeURIComponent(message);


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

        loadProducts();

        renderCart();

    }
);
