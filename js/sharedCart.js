(function () {
    if (window.__MEDOVA_SHARED_CART_UNIFIED__) return;
    window.__MEDOVA_SHARED_CART_UNIFIED__ = true;

    const CART_CODE_DEFAULTS = {
        MP01: { code: 'MP01', title: 'Мед соняшниковий', price: 180, size: '1 л' },
        MP02: { code: 'MP02', title: 'Мед травневий', price: 250, size: '0.5 л' },
        MP03: { code: 'MP03', title: 'Мед з волоським горіхом', price: 220, size: '0.5 л' },
        MP04: { code: 'MP04', title: 'Стільниковий мед', price: 300, size: '1 рамка' },
        MP05: { code: 'MP05', title: 'Свічка з вощини', price: 40, size: '1 шт.' },
        MP06: { code: 'MP06', title: 'Натуральний бджолиний прополіс', price: 120, size: '50 г' },
        MP07: { code: 'MP07', title: 'Бджолиний пилок', price: 150, size: '100 г' },
        MP08: { code: 'MP08', title: 'Патріотичний набір свічок', price: 200, size: '1 набір' },
        MP09: { code: 'MP09', title: 'Набір «Медовий затишок»', price: 350, size: '1 набір' },
        MP10: { code: 'MP10', title: 'Набір з натуральної вощини', price: 250, size: '1 набір' }
    };

    function hasNativeCartModal() {
        return Boolean(document.getElementById('cartModal') || document.getElementById('cartCount'));
    }

    function getCart() {
        return typeof window.medovaGetCart === 'function'
            ? window.medovaGetCart()
            : JSON.parse(localStorage.getItem('medova_cart') || '[]');
    }

    function saveCart(items) {
        if (typeof window.medovaSaveCart === 'function') {
            return window.medovaSaveCart(items);
        }
        localStorage.setItem('medova_cart', JSON.stringify(items || []));
        return items || [];
    }

    function esc(str) {
        if (typeof window.medovaEscapeHtml === 'function') {
            return window.medovaEscapeHtml(str);
        }
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function resolveByCode(input) {
        const rawCode = String(input?.code || input?.prodId || '').trim().toUpperCase();
        const mappedCode = typeof window.medovaResolveSku === 'function'
            ? window.medovaResolveSku(rawCode, input?.title || '')
            : rawCode;
        const base = CART_CODE_DEFAULTS[mappedCode] || CART_CODE_DEFAULTS[rawCode] || null;

        const code = mappedCode || rawCode || (base ? base.code : 'MP00');
        const title = (input?.title && String(input.title).trim()) || (base ? base.title : 'Товар пасіки');
        const price = (input?.price !== undefined && Number(input.price) >= 0 && String(input.price) !== '')
            ? Number(input.price)
            : (base ? base.price : 0);
        const size = (input?.size !== undefined && input.size !== null && String(input.size).trim() !== '')
            ? String(input.size).trim()
            : (base ? base.size : '');
        const qty = Math.max(1, parseInt(input?.qty, 10) || 1);

        const formattedName = typeof window.medovaFormatItemName === 'function'
            ? window.medovaFormatItemName(code, title, size)
            : (size ? `[${code}] ${title} (${size})` : `[${code}] ${title}`);

        return { prodId: code, name: formattedName, price, qty };
    }

    function killBottomStickyCart() {
        if (!document.getElementById('medovaKillStickyStyle')) {
            const killStyle = document.createElement('style');
            killStyle.id = 'medovaKillStickyStyle';
            killStyle.textContent = `
                .sticky-bar,
                #medovaSharedFab,
                #medovaSharedDrawer {
                    display: none !important;
                    visibility: hidden !important;
                    pointer-events: none !important;
                }
                body {
                    padding-bottom: 16px !important;
                }
            `;
            (document.head || document.documentElement).appendChild(killStyle);
        }

        document.querySelectorAll('.sticky-bar, #medovaSharedFab, #medovaSharedDrawer').forEach(el => {
            el.remove();
        });
    }

    function ensureUi() {
        killBottomStickyCart();
        if (hasNativeCartModal()) return;
    }

    function openCart() {
        killBottomStickyCart();
        if (hasNativeCartModal() && typeof window.openCartModal === 'function') {
            window.openCartModal(1);
        }
    }

    function closeCart() {
        killBottomStickyCart();
        if (hasNativeCartModal() && typeof window.closeCartModal === 'function') {
            window.closeCartModal();
        }
    }

    function syncBadge() {
        killBottomStickyCart();
        const cart = getCart();
        const qty = cart.reduce((s, i) => s + (parseInt(i.qty, 10) || 0), 0);

        const hdrCount = document.getElementById('cartCount');
        if (hdrCount) hdrCount.textContent = String(qty);
    }

    window.medovaCartAdd = function (itemInput) {
        const norm = resolveByCode(typeof itemInput === 'string' ? { code: itemInput } : itemInput);
        const items = getCart();
        const existing = items.find(i => i.name === norm.name);
        if (existing) {
            existing.qty = (parseInt(existing.qty, 10) || 1) + norm.qty;
        } else {
            items.push(norm);
        }
        saveCart(items);
        syncBadge();
        return norm;
    };

    window.medovaSharedAddItem = function (prodId, title, price, size, qty = 1) {
        return window.medovaCartAdd({ code: prodId, title, price, size, qty });
    };

    window.medovaSharedOpenCart = openCart;
    window.medovaSharedCloseCart = closeCart;
    window.medovaSharedSyncCart = syncBadge;

    killBottomStickyCart();
    document.addEventListener('DOMContentLoaded', function () {
        ensureUi();
        syncBadge();
    });
    window.addEventListener('storage', syncBadge);

    if (typeof MutationObserver !== 'undefined') {
        const observer = new MutationObserver(function () {
            document.querySelectorAll('.sticky-bar, #medovaSharedFab').forEach(el => el.remove());
        });
        observer.observe(document.documentElement, { childList: true, subtree: true });
    }
})();
