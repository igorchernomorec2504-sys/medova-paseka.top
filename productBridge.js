(function () {
    if (window.__MEDOVA_PRODUCT_BRIDGE_LOADED__) return;
    window.__MEDOVA_PRODUCT_BRIDGE_LOADED__ = true;

    function detectPageDefaultProduct() {
        const path = (window.location.pathname || '').toLowerCase();
        const h1 = (document.querySelector('h1')?.textContent || '').trim();
        const titleText = h1 || (document.title || '').split('|')[0].trim() || 'Товар пасіки';

        if (path.includes('candle')) return { prodId: 'MP05', title: titleText || 'Свічка з вощини', price: 40, size: '1 шт.' };
        if (path.includes('may')) return { prodId: 'MP02', title: titleText || 'Мед травневий', price: 250, size: '0.5 л' };
        if (path.includes('pollen')) return { prodId: 'MP07', title: titleText || 'Бджолиний пилок', price: 150, size: '100 г' };
        if (path.includes('propolis')) return { prodId: 'MP06', title: titleText || 'Натуральний бджолиний прополіс', price: 120, size: '50 г' };
        if (path.includes('sunflower')) return { prodId: 'MP01', title: titleText || 'Мед соняшниковий', price: 180, size: '1 л' };
        if (path.includes('walnut')) return { prodId: 'MP03', title: titleText || 'Мед з волоським горіхом', price: 220, size: '0.5 л' };

        return { prodId: 'MP00', title: titleText, price: 0, size: '' };
    }

    function parsePriceFromText(text) {
        const match = String(text || '').replace(/\s+/g, ' ').match(/(\d+(?:[.,]\d+)?)\s*(?:₴|грн|uah)/i);
        return match ? Number(match[1].replace(',', '.')) : 0;
    }

    function extractProductFromEl(el) {
        const fallback = detectPageDefaultProduct();
        const card = el.closest('[data-prod-id], [data-product], .product-card, .card, article, section, form') || document.body;

        const prodId =
            el.getAttribute('data-prod-id') ||
            el.getAttribute('data-sku') ||
            card.getAttribute('data-prod-id') ||
            card.getAttribute('data-sku') ||
            fallback.prodId;

        const title =
            el.getAttribute('data-title') ||
            el.getAttribute('data-name') ||
            card.getAttribute('data-title') ||
            card.getAttribute('data-name') ||
            card.querySelector('[data-product-title], .product-title, h2, h3, h1')?.textContent?.trim() ||
            fallback.title;

        const activeVariant = card.querySelector('.active[data-price], .selected[data-price], [aria-checked="true"][data-price], input:checked[data-price]');
        const selectEl = card.querySelector('select[data-price], select.size-select, select');
        const selectedOpt = selectEl && selectEl.options[selectEl.selectedIndex];

        let price =
            Number(activeVariant?.getAttribute('data-price')) ||
            Number(selectedOpt?.getAttribute('data-price')) ||
            Number(el.getAttribute('data-price')) ||
            Number(card.getAttribute('data-price')) ||
            parsePriceFromText(activeVariant?.textContent || selectedOpt?.textContent || card.querySelector('[data-price-text], .price, .product-price')?.textContent) ||
            fallback.price;

        const size =
            el.getAttribute('data-size') ||
            card.getAttribute('data-size') ||
            activeVariant?.getAttribute('data-size') ||
            selectedOpt?.getAttribute('data-size') ||
            activeVariant?.textContent?.trim() ||
            selectedOpt?.textContent?.trim() ||
            card.querySelector('.active[data-size], .selected[data-size]')?.textContent?.trim() ||
            fallback.size;

        const qtyInput = card.querySelector('input[type="number"], input[name*="qty"], input.qty');
        const qty = Math.max(1, parseInt(el.getAttribute('data-qty') || qtyInput?.value || '1', 10) || 1);

        return { prodId, title, price, size, qty };
    }

    function isBuyTrigger(el) {
        if (!el || el.closest('#medovaSharedDrawer, #medovaReceiptModal')) return false;
        if (el.matches('[data-add-to-cart], [data-medova-add], .add-to-cart, .btn-buy, .buy-btn')) return true;

        if (el.matches('button, [role="button"], a.btn, input[type="submit"]')) {
            const txt = (el.textContent || el.value || '').trim().toLowerCase();
            return (
                txt.includes('в кошик') ||
                txt.includes('у кошик') ||
                txt.includes('купити') ||
                txt.includes('замовити') ||
                txt.includes('в корзину')
            );
        }
        return false;
    }

    document.addEventListener('click', function (e) {
        const trigger = e.target.closest('button, [role="button"], a, input[type="submit"], [data-add-to-cart], [data-medova-add]');
        if (!trigger || !isBuyTrigger(trigger)) return;

        if (typeof window.medovaSharedAddItem !== 'function') return;

        const prod = extractProductFromEl(trigger);
        if (!prod.price && !prod.title) return;

        e.preventDefault();
        window.medovaSharedAddItem(prod.prodId, prod.title, prod.price, prod.size, prod.qty);

        if (typeof window.medovaSharedOpenCart === 'function') {
            window.medovaSharedOpenCart();
        }
    });

    document.addEventListener('submit', function (e) {
        const form = e.target;
        if (!form || form.id === 'medovaScForm' || form.closest('#medovaSharedDrawer, #medovaReceiptModal')) return;
        if (typeof window.medovaSharedAddItem !== 'function') return;

        const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]') || form;
        const prod = extractProductFromEl(submitBtn);
        if (!prod.title) return;

        e.preventDefault();
        window.medovaSharedAddItem(prod.prodId, prod.title, prod.price, prod.size, prod.qty);
        if (typeof window.medovaSharedOpenCart === 'function') {
            window.medovaSharedOpenCart();
        }
    }, true);
})();
