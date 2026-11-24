(function () {
    if (window.__MEDOVA_SHARED_CART_LOADED__) return;
    window.__MEDOVA_SHARED_CART_LOADED__ = true;

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

    function escapeHtml(str) {
        if (typeof window.medovaEscapeHtml === 'function') {
            return window.medovaEscapeHtml(str);
        }
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function ensureUi() {
        if (!document.getElementById('medovaSharedCartStyle')) {
            const style = document.createElement('style');
            style.id = 'medovaSharedCartStyle';
            style.textContent = `
                #medovaSharedFab {
                    position: fixed;
                    right: 18px;
                    bottom: 18px;
                    z-index: 1500;
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    background: linear-gradient(135deg, #F59E0B, #D97706);
                    color: #FFFFFF;
                    border: none;
                    border-radius: 999px;
                    padding: 12px 18px;
                    font-size: 14px;
                    font-weight: 800;
                    cursor: pointer;
                    box-shadow: 0 10px 24px rgba(180, 83, 9, 0.35);
                }
                #medovaSharedFabBadge {
                    background: #FFFFFF;
                    color: #92400E;
                    border-radius: 999px;
                    padding: 2px 8px;
                    font-size: 12px;
                    font-weight: 800;
                }
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
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 10px;
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
                .medova-sc-submit:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
            `;
            document.head.appendChild(style);
        }

        if (!document.getElementById('medovaSharedFab')) {
            const fab = document.createElement('button');
            fab.type = 'button';
            fab.id = 'medovaSharedFab';
            fab.innerHTML = `🛒 Кошик <span id="medovaSharedFabBadge">0</span> · <span id="medovaSharedFabSum">0 ₴</span>`;
            fab.addEventListener('click', openDrawer);
            document.body.appendChild(fab);
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

            document.getElementById('medovaScClose').addEventListener('click', closeDrawer);
            drawer.addEventListener('click', function (e) {
                if (e.target === drawer) closeDrawer();
            });
            document.getElementById('medovaScForm').addEventListener('submit', handleSubmit);
        }
    }

    function openDrawer() {
        ensureUi();
        renderCart();
        document.getElementById('medovaSharedDrawer').classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    function closeDrawer() {
        const drawer = document.getElementById('medovaSharedDrawer');
        if (drawer) drawer.classList.remove('open');
        document.body.style.overflow = '';
    }

    function syncBadge() {
        ensureUi();
        const cart = getCart();
        const qty = cart.reduce((s, i) => s + (parseInt(i.qty, 10) || 0), 0);
        const sum = cart.reduce((s, i) => s + ((Number(i.price) || 0) * (parseInt(i.qty, 10) || 0)), 0);

        const badge = document.getElementById('medovaSharedFabBadge');
        const fabSum = document.getElementById('medovaSharedFabSum');
        if (badge) badge.textContent = String(qty);
        if (fabSum) fabSum.textContent = `${sum} ₴`;

        const hdrCount = document.getElementById('cartCountHeader') || document.getElementById('cartCount');
        const hdrSum = document.getElementById('cartSumHeader') || document.getElementById('cartSum');
        if (hdrCount) hdrCount.textContent = String(qty);
        if (hdrSum) hdrSum.textContent = `${sum} ₴`;
    }

    function renderCart() {
        ensureUi();
        const cart = getCart();
        const listEl = document.getElementById('medovaScItems');
        const totalEl = document.getElementById('medovaScTotal');
        const submitBtn = document.getElementById('medovaScSubmitBtn');

        if (!cart.length) {
            listEl.innerHTML = '<div style="color:#7A6A52;padding:12px 0;">Кошик порожній. Додайте товар на сторінці.</div>';
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
                    <div>
                        <div style="font-weight:700;font-size:14px;">${escapeHtml(item.name)}</div>
                        <div style="font-size:12px;color:#7A6A52;">${price} ₴ × ${qty} шт. = <b>${sub} ₴</b></div>
                        <div class="medova-sc-qty">
                            <button type="button" data-sc-act="dec" data-sc-idx="${idx}">−</button>
                            <span>${qty}</span>
                            <button type="button" data-sc-act="inc" data-sc-idx="${idx}">+</button>
                            <button type="button" data-sc-act="del" data-sc-idx="${idx}" style="width:auto;padding:0 8px;">✕</button>
                        </div>
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

    async function handleSubmit(e) {
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

        btn.disabled = true;
        btn.textContent = 'Надсилаємо...';

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
                closeDrawer();
                renderCart();
                if (typeof window.medovaShowOrderReceipt === 'function') {
                    window.medovaShowOrderReceipt(res, {
                        customerName: name,
                        deliveryText,
                        addressSummary
                    });
                } else {
                    alert(`Замовлення ${res.orderNumber} прийнято! Сума: ${res.total} ₴`);
                }
            }
        } catch (err) {
            console.error(err);
            alert('Помилка під час відправки замовлення. Спробуйте ще раз.');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Оформити замовлення';
        }
    }

    window.medovaSharedAddItem = function (prodId, title, price, size, qty = 1) {
        const items = getCart();
        const unitPrice = Number(price) || 0;
        const addQty = Math.max(1, parseInt(qty, 10) || 1);
        const fullName = typeof window.medovaFormatItemName === 'function'
            ? window.medovaFormatItemName(prodId, title, size)
            : (size ? `[${prodId}] ${title} (${size})` : `[${prodId}] ${title}`);

        const existing = items.find(i => i.name === fullName);
        if (existing) {
            existing.qty = (parseInt(existing.qty, 10) || 1) + addQty;
        } else {
            items.push({
                prodId: prodId || '',
                name: fullName,
                price: unitPrice,
                qty: addQty
            });
        }

        saveCart(items);
        syncBadge();
        renderCart();
    };

    window.medovaSharedOpenCart = openDrawer;
    window.medovaSharedSyncCart = syncBadge;

    document.addEventListener('DOMContentLoaded', function () {
        ensureUi();
        syncBadge();
    });
    window.addEventListener('storage', syncBadge);
})();
