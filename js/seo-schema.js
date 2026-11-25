(function () {
  const SITE_URL = "https://medova-paseka.top";
  const CURRENCY = "UAH";
  const VALID_FROM = "2026-11-01";

  const shippingDetails = {
    "@type": "OfferShippingDetails",
    "shippingDestination": {
      "@type": "DefinedRegion",
      "addressCountry": "UA"
    },
    "deliveryTime": {
      "@type": "ShippingDeliveryTime",
      "handlingTime": {
        "@type": "QuantitativeValue",
        "minValue": 0,
        "maxValue": 1,
        "unitCode": "DAY"
      },
      "transitTime": {
        "@type": "QuantitativeValue",
        "minValue": 1,
        "maxValue": 3,
        "unitCode": "DAY"
      }
    }
  };

  const hasMerchantReturnPolicy = {
    "@type": "MerchantReturnPolicy",
    "applicableCountry": "UA",
    "returnPolicyCategory": "https://schema.org/MerchantReturnFiniteReturnWindow",
    "merchantReturnDays": 14,
    "returnMethod": "https://schema.org/ReturnByMail",
    "returnShippingFeesAmount": {
      "@type": "MonetaryAmount",
      "value": 0,
      "currency": CURRENCY
    }
  };

  // Настрой под свои файлы и товары (поменяй price, availability и URL при необходимости)
  const PRODUCTS_BY_PAGE = {
    "svechi.html": {
      name: "Восковые свечи — Медовая Пасека",
      description: "Натуральные свечи из пчелиного воска от пасеки в Одесской области.",
      price: "150",
      availability: "https://schema.org/InStock"
    },
    "propolis.html": {
      name: "Прополис — Медовая Пасека",
      description: "Натуральный прополис с пасеки.",
      price: "200",
      availability: "https://schema.org/InStock"
    },
    "pylca.html": {
      name: "Цветочная пыльца — Медовая Пасека",
      description: "Натуральная пчелиная пыльца (обножка).",
      price: "200",
      availability: "https://schema.org/OutOfStock"
    },
    "majskij-med.html": {
      name: "Майский мёд — Медовая Пасека",
      description: "Натуральный майский мёд с пасеки.",
      price: "350",
      availability: "https://schema.org/OutOfStock"
    },
    "podsolnechnyj-med.html": {
      name: "Подсолнечниковый мёд — Медовая Пасека",
      description: "Натуральный подсолнечниковый мёд с пасеки.",
      price: "250",
      availability: "https://schema.org/InStock"
    }
  };

  function buildOffer(price, availability) {
    return {
      "@type": "Offer",
      "url": window.location.href,
      "priceCurrency": CURRENCY,
      "price": String(price),
      "validFrom": VALID_FROM,
      "availability": availability,
      "shippingDetails": shippingDetails,
      "hasMerchantReturnPolicy": hasMerchantReturnPolicy
    };
  }

  function enrichExistingProduct(node, fallbackProduct) {
    if (!node || typeof node !== "object") return;

    if (Array.isArray(node)) {
      node.forEach((item) => enrichExistingProduct(item, fallbackProduct));
      return;
    }

    if (node["@type"] === "Product") {
      if (!node.offers && fallbackProduct) {
        node.offers = buildOffer(fallbackProduct.price, fallbackProduct.availability);
      } else if (node.offers) {
        const offers = Array.isArray(node.offers) ? node.offers : [node.offers];
        offers.forEach((offer) => {
          if (!offer || typeof offer !== "object") return;
          if (!offer.validFrom) offer.validFrom = VALID_FROM;
          if (!offer.shippingDetails) {
            offer.shippingDetails = shippingDetails;
          } else {
            const sds = Array.isArray(offer.shippingDetails)
              ? offer.shippingDetails
              : [offer.shippingDetails];
            sds.forEach((sd) => {
              if (sd && typeof sd === "object" && !sd.deliveryTime) {
                sd.deliveryTime = shippingDetails.deliveryTime;
              }
            });
          }
          if (!offer.hasMerchantReturnPolicy) {
            offer.hasMerchantReturnPolicy = hasMerchantReturnPolicy;
          } else if (!offer.hasMerchantReturnPolicy.returnShippingFeesAmount) {
            offer.hasMerchantReturnPolicy.returnShippingFeesAmount =
              hasMerchantReturnPolicy.returnShippingFeesAmount;
          }
        });
      }
    }

    Object.values(node).forEach((val) => enrichExistingProduct(val, fallbackProduct));
  }

  const path = window.location.pathname.split("/").pop() || "index.html";
  const existingScripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));

  let foundProductSchema = false;

  existingScripts.forEach((scriptEl) => {
    try {
      const data = JSON.parse(scriptEl.textContent);
      const beforeStr = JSON.stringify(data);
      enrichExistingProduct(data, PRODUCTS_BY_PAGE[path] || null);
      const afterStr = JSON.stringify(data);
      if (beforeStr !== afterStr) {
        scriptEl.textContent = afterStr;
      }
      if (afterStr.includes('"Product"')) {
        foundProductSchema = true;
      }
    } catch (e) {
      // Пропускаем некорректный JSON, если такой есть
    }
  });

  // Если на странице товара ещё не было JSON-LD Product — создаём его из PRODUCTS_BY_PAGE
  if (!foundProductSchema && PRODUCTS_BY_PAGE[path]) {
    const prod = PRODUCTS_BY_PAGE[path];
    const productSchema = {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": prod.name,
      "description": prod.description,
      "brand": {
        "@type": "Brand",
        "name": "Медовая Пасека"
      },
      "offers": buildOffer(prod.price, prod.availability)
    };

    const newScript = document.createElement("script");
    newScript.type = "application/ld+json";
    newScript.textContent = JSON.stringify(productSchema);
    document.head.appendChild(newScript);
  } else if (!foundProductSchema && path === "index.html") {
    // На главной (index.html) задаём базовую схему организации / магазина без фейкового товара
    const orgSchema = {
      "@context": "https://schema.org",
      "@type": "Store",
      "name": "Медовая Пасека",
      "url": SITE_URL,
      "address": {
        "@type": "PostalAddress",
        "addressRegion": "Одесская область",
        "addressCountry": "UA"
      }
    };
    const orgScript = document.createElement("script");
    orgScript.type = "application/ld+json";
    orgScript.textContent = JSON.stringify(orgSchema);
    document.head.appendChild(orgScript);
  }
})();
