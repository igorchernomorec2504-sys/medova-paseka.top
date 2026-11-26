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

  const PRODUCTS_BY_FILE = {
    "candles.html": {
      name: "Beeswax Candles — Medova Pasika",
      description: "100% natural beeswax candles from our apiary.",
      price: "40",
      availability: "https://schema.org/InStock"
    },
    "may.html": {
      name: "May Honey — Medova Pasika",
      description: "Natural spring May honey from our apiary.",
      price: "350",
      availability: "https://schema.org/OutOfStock"
    },
    "sunflower.html": {
      name: "Sunflower Honey — Medova Pasika",
      description: "Natural sunflower honey from our apiary.",
      price: "250",
      availability: "https://schema.org/InStock"
    },
    "pollen.html": {
      name: "Bee Pollen — Medova Pasika",
      description: "Natural flower pollen from our apiary.",
      price: "200",
      availability: "https://schema.org/OutOfStock"
    },
    "propolis.html": {
      name: "Propolis — Medova Pasika",
      description: "Natural propolis from our apiary.",
      price: "200",
      availability: "https://schema.org/InStock"
    }
  };

  function getFileName(pathname) {
    const clean = (pathname || "/").split("?")[0].split("#")[0];
    let decoded = clean;
    try {
      decoded = decodeURIComponent(clean);
    } catch (e) {}
    const last = decoded.split("/").pop() || "index.html";
    return last.trim().toLowerCase();
  }

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
    const fileName = getFileName(window.location.pathname);
    const matchedProduct = PRODUCTS_BY_FILE[fileName] || null;
    const existingScripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));

    let foundProductSchema = false;

    existingScripts.forEach((scriptEl) => {
      try {
        const data = JSON.parse(scriptEl.textContent);
        const beforeStr = JSON.stringify(data);
        enrichExistingProduct(data, matchedProduct);
        const afterStr = JSON.stringify(data);
        if (beforeStr !== afterStr) {
          scriptEl.textContent = afterStr;
        }
        if (afterStr.includes('"Product"')) {
          foundProductSchema = true;
        }
      } catch (e) {}
    });

    if (!foundProductSchema && matchedProduct) {
      const productSchema = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": matchedProduct.name,
        "description": matchedProduct.description,
        "brand": {
          "@type": "Brand",
          "name": "Medova Pasika"
        },
        "offers": buildOffer(matchedProduct.price, matchedProduct.availability)
      };

      const newScript = document.createElement("script");
      newScript.type = "application/ld+json";
      newScript.textContent = JSON.stringify(productSchema);
      document.head.appendChild(newScript);
    } else if (!foundProductSchema && (fileName === "index.html" || fileName === "")) {
      const orgSchema = {
        "@context": "https://schema.org",
        "@type": "Store",
        "name": "Medova Pasika",
        "url": SITE_URL,
        "address": {
          "@type": "PostalAddress",
          "addressRegion": "Odesa Oblast",
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
