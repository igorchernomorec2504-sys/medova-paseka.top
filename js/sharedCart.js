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

    function removeFloatingFabIfPresent() {
        const fab = document.getElementById('medovaSharedFab');
        if (fab) fab.remove();
        const drawer = document.getElementById('medovaSharedDrawer');
        if (drawer) drawer.remove();
    }

    function ensureUi() {
        removeFloatingFabIfPresent();
        if (hasNativeCartModal()) return;

        if (!document.getElementById('medovaSharedCartStyle')) {
            const style = document.createElement('style');
            style.id = 'medovaSharedCartStyle';
            style.textContent = `
                #medovaSharedDrawer {
                    display: none;
                    position: fixed;
                    inset: 0;
                    z-index: 1700;
                    background: rgba(43, 29, 14, 0.55);
                    backdrop-filter: blur(4px);
                    justify-content: flex-end;
                }
                #medovaSharedDrawer.open {
                    display: flex;
                }
                .medova-sc-panel {
                    background: #FFFFFF;
                    color: #2B1D0E;
                    width: min(420px, 100%);
                    height: 100%;
                    overflow-y: auto;
                    padding: 20px;
                    box-shadow: -12px 0 36px rgba(0, 0, 0, 0.25);
                    display: flex;
                    flex-direction: column;
                    gap: 14px;
                }
                .medova-sc-head {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 1px solid #E8DCC8;
                    padding-bottom: 12px;
                }
                .medova-sc-head h3 {
                    margin: 0;
                    font-size: 18px;
                }
                .medova-sc-x {
                    background: #FDFBF7;
                    border: 1px solid #E8DCC8;
                    border-radius: 8px;
                    padding: 6px 10px;
                    cursor: pointer;
                    font-weight: 700;
                }
                .medova-sc-item {
                    border: 1px solid #E8DCC8;
                    background: #FDFBF7;
                    border-radius: 12px;
                    padding: 10px 12px;
                }
                .medova-sc-qty {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    margin-top: 6px;
                }
                .medova-sc-qty button {
                    width: 26px;
                    height: 26px;
                    border-radius: 6px;
                    border: 1px solid #D97706;
                    background: #FFFFFF;
                    color: #92400E;
                    font-weight: 800;
                    cursor: pointer;
                }
                .medova-sc-form {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    border-top: 1px solid #E8DCC8;
                    padding-top: 12px;
                }
                .medova-sc-form input,
                .medova-sc-form select,
                .medova-sc-form textarea {
                    width: 100%;
                    box-sizing: border-box;
                    padding: 10px 12px;
                    border: 1px solid #D6C7B2;
                    border-radius: 10px;
                    font-size: 14px;
                    background: #FFFFFF;
                    color: #2B1D0E;
                }
                .medova-sc-submit {
                    background: linear-gradient(135deg, #F59E0B, #D97706);
                    color: #FFFFFF;
                    border: none;
                    border-radius: 12px;
                    padding: 13px 16px;
                    font-size: 15px;
                    font-weight: 800;
                    cursor: pointer;
                }
            `;
            document.head.appendChild(style);
        }

        if (!document.getElementById('medovaSharedDrawer')) {
            const drawer = document.createElement('div');
            drawer.id = 'medovaSharedDrawer';
            drawer.innerHTML = `
                <div class="medova-sc-panel" role="dialog" aria-modal="true">
                    <div class="medova-sc-head">
                        <h3>🛒 Єдиний кошик</h3>
                        <button type="button" class="medova-sc-x" id="medovaScClose">✕</button>
                    </div>
                    <div id="medovaScItems"></div>
                    <div style="font-weight:800;font-size:16px;display:flex;justify-content:space-between;">
                        <span>Разом:</span>
                        <span id="medovaScTotal">0 ₴</span>
                    </div>
                    <form class="medova-sc-form" id="medovaScForm">
                        <input type="text" id="medovaScName" placeholder="ПІБ *" required>
                        <input type="tel" id="medovaScPhone" placeholder="Телефон *" required>
                        <input type="email" id="medovaScEmail" placeholder="Email (необов'язково)">
                        <select id="medovaScDelivery">
                            <option value="Нова Пошта">Нова Пошта</option>
                            <option value="Укрпошта">Укрпошта</option>
                            <option value="Самовивіз">Самовивіз</option>
                        </select>
                        <input type="text" id="medovaScCity" placeholder="Місто / село">
                        <input type="text" id="medovaScWarehouse" placeholder="Відділення НП або адреса">
                        <textarea id="medovaScComment" rows="2" placeholder="Коментар до замовлення"></textarea>
                        <button type="submit" class="medova-sc-submit" id="medovaScSubmitBtn">Оформити замовлення</button>
                    </form>
                </div>
            `;
            document.body.appendChild(drawer);

            document.getElementById('medovaScClose').addEventListener('click', closeCart);
            drawer.addEventListener('click', function (e) {
                if (e.target === drawer) closeCart();
            });
            document.getElementById('medovaScForm').addEventListener('submit', submitCart);
        }
    }

    function openCart() {
        if (hasNativeCartModal() && typeof window.openCartModal === 'function') {
            window.openCartModal(1);
            return;
        }
        ensureUi();
        const drawer = document.getElementById('medovaSharedDrawer');
        if (!drawer) return;
        renderCart();
        drawer.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    function closeCart() {
        const drawer = document.getElementById('medovaSharedDrawer');
        if (drawer) drawer.classList.remove('open');
        document.body.style.overflow = '';
    }

    function syncBadge() {
        removeFloatingFabIfPresent();
        const cart = getCart();
        const qty = cart.reduce((s, i) => s + (parseInt(i.qty, 10) || 0), 0);

        const hdrCount = document.getElementById('cartCount');
        if (hdrCount) hdrCount.textContent = String(qty);
    }

    function renderCart() {
        if (hasNativeCartModal()) {
            syncBadge();
            return;
        }
        ensureUi();
        const cart = getCart();
        const listEl = document.getElementById('medovaScItems');
        const totalEl = document.getElementById('medovaScTotal');
        const submitBtn = document.getElementById('medovaScSubmitBtn');
        if (!listEl || !totalEl) return;

        if (!cart.length) {
            listEl.innerHTML = '<div style="color:#7A6A52;padding:12px 0;">Кошик порожній.</div>';
            totalEl.textContent = '0 ₴';
            if (submitBtn) submitBtn.disabled = true;
            syncBadge();
            return;
        }

        if (submitBtn) submitBtn.disabled = false;
        let total = 0;

        listEl.innerHTML = cart.map((item, idx) => {
            const qty = Math.max(1, parseInt(item.qty, 10) || 1);
            const price = Number(item.price) || 0;
            const sub = price * qty;
            total += sub;

            return `
                <div class="medova-sc-item">
                    <div style="font-weight:700;font-size:14px;">${esc(item.name)}</div>
                    <div style="font-size:12px;color:#7A6A52;">${price} ₴ × ${qty} шт. = <b>${sub} ₴</b></div>
                    <div class="medova-sc-qty">
                        <button type="button" data-sc-act="dec" data-sc-idx="${idx}">−</button>
                        <span>${qty}</span>
                        <button type="button" data-sc-act="inc" data-sc-idx="${idx}">+</button>
                        <button type="button" data-sc-act="del" data-sc-idx="${idx}" style="width:auto;padding:0 8px;">✕</button>
                    </div>
                </div>
            `;
        }).join('');

        listEl.querySelectorAll('button[data-sc-act]').forEach(btn => {
            btn.addEventListener('click', function () {
                const idx = parseInt(btn.getAttribute('data-sc-idx'), 10);
                const act = btn.getAttribute('data-sc-act');
                const items = getCart();
                if (!items[idx]) return;

                if (act === 'inc') items[idx].qty = (parseInt(items[idx].qty, 10) || 1) + 1;
                if (act === 'dec') {
                    const nextQty = (parseInt(items[idx].qty, 10) || 1) - 1;
                    if (nextQty <= 0) items.splice(idx, 1);
                    else items[idx].qty = nextQty;
                }
                if (act === 'del') items.splice(idx, 1);

                saveCart(items);
                renderCart();
            });
        });

        totalEl.textContent = `${total} ₴`;
        syncBadge();
    }

    async function submitCart(e) {
        e.preventDefault();
        if (typeof window.medovaSubmitOrder !== 'function') {
            alert('Не завантажено /js/ordersCore.js');
            return;
        }

        const btn = document.getElementById('medovaScSubmitBtn');
        const cart = getCart();
        if (!cart.length) return;

        const name = document.getElementById('medovaScName').value.trim();
        const phone = document.getElementById('medovaScPhone').value.trim();
        const email = document.getElementById('medovaScEmail').value.trim();
        const deliveryText = document.getElementById('medovaScDelivery').value.trim();
        const cityText = document.getElementById('medovaScCity').value.trim();
        const warehouseText = document.getElementById('medovaScWarehouse').value.trim();
        const comment = document.getElementById('medovaScComment').value.trim();

        const addressSummary = [cityText, warehouseText].filter(Boolean).join(' — ');
        const combinedComment = [
            addressSummary ? `Адреса: ${addressSummary}` : '',
            comment
        ].filter(Boolean).join(' | ');

        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Надсилаємо...';
        }

        try {
            const res = await window.medovaSubmitOrder({
                cart,
                name,
                phone,
                email,
                deliveryText,
                cityText,
                warehouseText,
                comment,
                combinedComment
            });

            if (res && res.ok) {
                closeCart();
                renderCart();
                if (typeof window.medovaShowOrderReceipt === 'function') {
                    window.medovaShowOrderReceipt(res, {
                        customerName: name,
                        deliveryText,
                        addressSummary
                    });
                }
            }
        } catch (err) {
            console.error(err);
            alert('Помилка під час відправки замовлення.');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Оформити замовлення';
            }
        }
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
        renderCart();
        return norm;
    };

    window.medovaSharedAddItem = function (prodId, title, price, size, qty = 1) {
        return window.medovaCartAdd({ code: prodId, title, price, size, qty });
    };

    window.medovaSharedOpenCart = openCart;
    window.medovaSharedCloseCart = closeCart;
    window.medovaSharedSyncCart = syncBadge;

    document.addEventListener('DOMContentLoaded', function () {
        ensureUi();
        syncBadge();
    });
    window.addEventListener('storage', syncBadge);
})();
