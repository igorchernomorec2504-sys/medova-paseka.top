(function () {
    if (window.__MEDOVA_PRODUCT_BRIDGE_V2__) return;
    window.__MEDOVA_PRODUCT_BRIDGE_V2__ = true;

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

    function isCheckoutTrigger(el) {
        if (!el) return false;
        const txt = (el.textContent || el.value || '').trim().toLowerCase();
        return (
            txt.includes('оформити замовлення') ||
            txt.includes('підтвердити замовлення') ||
            txt.includes('відправити замовлення') ||
            txt.includes('оформить заказ') ||
            txt.includes('подтвердить заказ')
        );
    }

    function isBuyTrigger(el) {
        if (!el || el.closest('#medovaSharedDrawer, #medovaReceiptModal')) return false;
        if (isCheckoutTrigger(el)) return false;
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

    function collectOrderFormData(container) {
        const root = container || document.body;
        const val = (selectors) => {
            for (const sel of selectors) {
                const el = root.querySelector(sel) || document.querySelector(sel);
                if (el && String(el.value || '').trim()) return String(el.value).trim();
            }
            return '';
        };

        const name = val(['input[name*="name"]', 'input[name*="fio"]', 'input[id*="name"]', 'input[placeholder*="ПІБ"]', 'input[placeholder*="Ім"]', 'input[placeholder*="Имя"]']);
        const phone = val(['input[type="tel"]', 'input[name*="phone"]', 'input[name*="tel"]', 'input[id*="phone"]', 'input[placeholder*="Телефон"]']);
        const email = val(['input[type="email"]', 'input[name*="email"]', 'input[id*="email"]']);
        const cityText = val(['input[name*="city"]', 'select[name*="city"]', 'input[id*="city"]', 'input[placeholder*="Місто"]', 'input[placeholder*="Город"]']);
        const warehouseText = val(['input[name*="warehouse"]', 'select[name*="warehouse"]', 'input[name*="branch"]', 'input[id*="warehouse"]', 'input[placeholder*="Відділення"]']);
        const altAddressText = val(['input[name*="address"]', 'input[id*="address"]', 'input[placeholder*="Адреса"]']);
        const comment = val(['textarea[name*="comment"]', 'input[name*="comment"]', 'textarea[id*="comment"]', 'textarea']);

        let deliveryText = '';
        const delSel = root.querySelector('select[name*="delivery"], select[id*="delivery"]') || document.querySelector('select[name*="delivery"], select[id*="delivery"]');
        const checkedDel = root.querySelector('input[name*="delivery"]:checked, input[type="radio"][name*="ship"]:checked') || document.querySelector('input[name*="delivery"]:checked');
        if (delSel && delSel.selectedOptions && delSel.selectedOptions[0]) {
            deliveryText = delSel.selectedOptions[0].textContent.trim();
        } else if (checkedDel) {
            deliveryText = checkedDel.value || checkedDel.nextElementSibling?.textContent?.trim() || '';
        }
        if (!deliveryText && (warehouseText || cityText)) {
            deliveryText = 'Нова Пошта';
        }

        const addressSummary = [cityText, warehouseText || altAddressText].filter(Boolean).join(' — ');
        const combinedComment = [
            addressSummary ? `Адреса: ${addressSummary}` : '',
            comment
        ].filter(Boolean).join(' | ');

        return {
            name: name || 'Клієнт',
            phone: phone || '—',
            email,
            deliveryText: deliveryText || 'Уточнюється',
            cityText,
            warehouseText,
            altAddressText,
            comment,
            combinedComment,
            addressSummary
        };
    }

    async function handleNativeCheckout(e, sourceEl) {
        if (typeof window.medovaSubmitOrder !== 'function') return;

        let cart = typeof window.medovaGetCart === 'function' ? window.medovaGetCart() : [];
        if (!cart.length) {
            const fallbackProd = detectPageDefaultProduct();
            if (fallbackProd.price > 0) {
                cart = [{
                    prodId: fallbackProd.prodId,
                    name: typeof window.medovaFormatItemName === 'function'
                        ? window.medovaFormatItemName(fallbackProd.prodId, fallbackProd.title, fallbackProd.size)
                        : fallbackProd.title,
                    price: fallbackProd.price,
                    qty: 1
                }];
            }
        }
        if (!cart.length) return;

        const formRoot = sourceEl.closest('form, .modal, .drawer, .cart-modal, .checkout, section') || document.body;
        const formData = collectOrderFormData(formRoot);

        // Блокируем стандартную отправку формы/таймеры автозакрытия
        if (e && typeof e.preventDefault === 'function') e.preventDefault();
        if (e && typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();

        try {
            const res = await window.medovaSubmitOrder({
                cart,
                name: formData.name,
                phone: formData.phone,
                email: formData.email,
                deliveryText: formData.deliveryText,
                cityText: formData.cityText,
                warehouseText: formData.warehouseText,
                altAddressText: formData.altAddressText,
                comment: formData.comment,
                combinedComment: formData.combinedComment
            });

            if (res && res.ok) {
                if (typeof window.medovaSharedSyncCart === 'function') {
                    window.medovaSharedSyncCart();
                }
                if (typeof window.medovaShowOrderReceipt === 'function') {
                    window.medovaShowOrderReceipt(res, {
                        customerName: formData.name,
                        deliveryText: formData.deliveryText,
                        addressSummary: formData.addressSummary
                    });
                }
            }
        } catch (err) {
            console.error('medova productBridge checkout error:', err);
        }
    }

    document.addEventListener('submit', function (e) {
        const form = e.target;
        if (!form || form.id === 'medovaScForm' || form.closest('#medovaSharedDrawer, #medovaReceiptModal')) return;
        handleNativeCheckout(e, form);
    }, true);

    document.addEventListener('click', function (e) {
        const trigger = e.target.closest('button, [role="button"], a, input[type="submit"], [data-add-to-cart], [data-medova-add]');
        if (!trigger || trigger.closest('#medovaSharedDrawer, #medovaReceiptModal')) return;

        if (isCheckoutTrigger(trigger)) {
            handleNativeCheckout(e, trigger);
            return;
        }

        if (isBuyTrigger(trigger)) {
            if (typeof window.medovaSharedAddItem !== 'function') return;
            const prod = extractProductFromEl(trigger);
            if (!prod.price && !prod.title) return;

            e.preventDefault();
            window.medovaSharedAddItem(prod.prodId, prod.title, prod.price, prod.size, prod.qty);

            if (typeof window.medovaSharedOpenCart === 'function') {
                window.medovaSharedOpenCart();
            }
        }
    }, true);
})();
