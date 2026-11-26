(function () {
  const SITE_URL = "https://medova-paseka.top";
  const CURRENCY = "UAH";
  const VALID_FROM = "2026-11-01";

  const shippingDetails = {
    "@type": "OfferShippingDetails",
    "shippingRate": {
      "@type": "MonetaryAmount",
      "value": "0",
      "currency": CURRENCY
    },
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
    "returnFees": "https://schema.org/ReturnShippingFees",
    "returnShippingFeesAmount": {
      "@type": "MonetaryAmount",
      "value": 0,
      "currency": CURRENCY
    }
  };

  const PRODUCTS_BY_PAGE = {
    "candles.html": {
      name: "Свічки з вощини — Медова Пасіка",
      description: "100% натуральний пасічний віск. Ручна робота, дарують затишок та природний аромат.",
      price: "40",
      availability: "https://schema.org/InStock"
    },
    "propolis.html": {
      name: "Прополіс — Медова Пасіка",
      description: "Натуральний прополіс з власної пасіки.",
      price: "200",
      availability: "https://schema.org/InStock"
    },
    "pylca.html": {
      name: "Квітковий пилок — Медова Пасіка",
      description: "Натуральний бджолиний пилок з пасіки.",
      price: "200",
      availability: "https://schema.org/OutOfStock"
    },
    "may.html": {
      name: "Мед Травневий — Медова Пасіка",
      description: "Ароматний, духмяний та ніжний травневий мед зібраний під час першого весняного медозбору.",
      price: "350",
      availability: "https://schema.org/OutOfStock"
    },
    "podsolnechnyj-med.html": {
      name: "Соняшниковий мед — Медова Пасіка",
      description: "Натуральний соняшниковий мед з пасіки.",
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
          if (!offer.url) offer.url = window.location.href;

          if (!offer.shippingDetails) {
            offer.shippingDetails = shippingDetails;
          } else {
            const sds = Array.isArray(offer.shippingDetails)
              ? offer.shippingDetails
              : [offer.shippingDetails];
            sds.forEach((sd) => {
              if (!sd || typeof sd !== "object") return;
              if (!sd.shippingRate) sd.shippingRate = shippingDetails.shippingRate;
              if (!sd.shippingDestination) sd.shippingDestination = shippingDetails.shippingDestination;
              if (!sd.deliveryTime) sd.deliveryTime = shippingDetails.deliveryTime;
            });
          }

          if (!offer.hasMerchantReturnPolicy) {
            offer.hasMerchantReturnPolicy = hasMerchantReturnPolicy;
          } else {
            const policies = Array.isArray(offer.hasMerchantReturnPolicy)
              ? offer.hasMerchantReturnPolicy
              : [offer.hasMerchantReturnPolicy];
            policies.forEach((pol) => {
              if (!pol || typeof pol !== "object") return;
              if (!pol.returnShippingFeesAmount) {
                pol.returnShippingFeesAmount = hasMerchantReturnPolicy.returnShippingFeesAmount;
              }
            });
          }
        });
      }
    }

    Object.values(node).forEach((val) => enrichExistingProduct(val, fallbackProduct));
  }

  function run() {
    const cleanPath = (window.location.pathname || "/").split("?")[0].split("#")[0];
    const fileName = cleanPath.split("/").pop() || "index.html";
    const existingScripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));

    let foundProductSchema = false;

    existingScripts.forEach((scriptEl) => {
      try {
        const data = JSON.parse(scriptEl.textContent);
        const beforeStr = JSON.stringify(data);
        enrichExistingProduct(data, PRODUCTS_BY_PAGE[fileName] || null);
        const afterStr = JSON.stringify(data);
        if (beforeStr !== afterStr) {
          scriptEl.textContent = afterStr;
        }
        if (afterStr.includes('"Product"')) {
          foundProductSchema = true;
        }
      } catch (e) {
        // Пропускаем некорректный JSON
      }
    });

    if (!foundProductSchema && PRODUCTS_BY_PAGE[fileName]) {
      const prod = PRODUCTS_BY_PAGE[fileName];
      const productSchema = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": prod.name,
        "description": prod.description,
        "brand": {
          "@type": "Brand",
          "name": "Медова Пасіка"
        },
        "offers": buildOffer(prod.price, prod.availability)
      };

      const newScript = document.createElement("script");
      newScript.type = "application/ld+json";
      newScript.textContent = JSON.stringify(productSchema);
      document.head.appendChild(newScript);
    } else if (!foundProductSchema && fileName === "index.html") {
      const orgSchema = {
        "@context": "https://schema.org",
        "@type": "Store",
        "name": "Медова Пасека",
        "url": SITE_URL,
        "address": {
          "@type": "PostalAddress",
          "addressRegion": "Одеська область",
          "addressCountry": "UA"
        }
      };
      const orgScript = document.createElement("script");
      orgScript.type = "application/ld+json";
      orgScript.textContent = JSON.stringify(orgSchema);
      document.head.appendChild(orgScript);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
