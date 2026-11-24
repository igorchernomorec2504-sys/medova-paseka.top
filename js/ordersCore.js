const MEDOVA_CONFIG = {
    botToken: '8812886094:AAFdw7NkHOSRB0If8ZMAME4tEbhwq1XCAZA',
    chatId: '1763769244',
    supabaseUrl: 'https://qqfnbzfmjemknxivfktb.supabase.co',
    supabaseKey: 'sb_publishable__wWNK3PiFLCj29ofrP_jbw_jWGIv3-1',
    prefix: 'МП',
    numberPadLength: 8,
    minStartSeq: 26, // если нужно начинать с 00000026, когда в базе меньше — ставим 25 (следующий будет 26)
    cartStorageKey: 'medova_cart',
    seqStorageKey: 'medova_mp_last_seq'
};

const MEDOVA_SKU_MAP = {
    'MP01': 'MP01',
    'MP02': 'MP02',
    'MP03': 'MP03',
    'MP04': 'MP04',
    'MP05': 'MP05',
    'MP06': 'MP06',
    'MP07': 'MP07',
    'MP08': 'MP08',
    'MP09': 'MP09',
    'MP10': 'MP10',
    'MR01': 'MR01',
    'MR02': 'MR02',
    'MR03': 'MR03',
    'MR04': 'MR04',
    'MR05': 'MR05',
    'MR06': 'MR06',
    'MR07': 'MR07',
    'MR08': 'MR08',
    'MR09': 'MR09',
    'MR10': 'MR10',
    'мед соняшниковий': 'MP01',
    'мед соняшника': 'MP01',
    'мед подсолнечный': 'MP01',
    'мед травневий': 'MP02',
    'мед майский': 'MP02',
    'мед з волоським горіхом': 'MP03',
    'мед с грецким орехом': 'MP03',
    'стільниковий мед': 'MP04',
    'сотовый мед': 'MP04',
    'свічка з вощини': 'MP05',
    'свічки з вощини': 'MP05',
    'свеча из вощины': 'MP05',
    'свечи из вощины': 'MP05',
    'прополіс': 'MP06',
    'натуральний бджолиний прополіс': 'MP06',
    'прополис': 'MP06',
    'бджолиний пилок': 'MP07',
    'пчелиная пыльца': 'MP07',
    'патріотичний набір свічок': 'MP08',
    'патриотический набор свечей': 'MP08',
    'набір «медовий затишок»': 'MP09',
    'набор «медовый уют»': 'MP09',
    'набір з натуральної вощини': 'MP10',
    'набор из натуральной вощины': 'MP10'
};

function medovaExtractBracketCode(text) {
    const m = String(text || '').trim().match(/^\[([A-Za-zА-Яа-яІіЇїЄє0-9_-]+)\]/);
    return m ? m[1].toUpperCase() : '';
}

function medovaResolveSku(prodId, title) {
    const rawId = String(prodId || '').trim().toUpperCase();
    if (rawId && rawId !== 'MR00' && MEDOVA_SKU_MAP[rawId]) return MEDOVA_SKU_MAP[rawId];
    if (rawId && rawId !== 'MR00' && /^M[PR]\d+$/i.test(rawId)) return rawId;

    const bracketCode = medovaExtractBracketCode(title);
    if (bracketCode && bracketCode !== 'MR00') {
        return MEDOVA_SKU_MAP[bracketCode] || bracketCode;
    }

    const cleanTitle = String(title || '')
        .replace(/^\[[^\]]+\]\s*/, '')
        .replace(/\s*\([^)]*\)\s*$/, '')
        .trim()
        .toLowerCase();

    if (cleanTitle && MEDOVA_SKU_MAP[cleanTitle]) return MEDOVA_SKU_MAP[cleanTitle];

    return rawId || bracketCode || 'MP00';
}

function medovaFormatItemName(prodId, title, size) {
    const rawTitle = String(title || '').trim();
    const code = medovaResolveSku(prodId, rawTitle);
    let cleanTitle = rawTitle.replace(/^\[[^\]]+\]\s*/, '').trim();

    const hasTrailingParens = /\([^)]+\)\s*$/.test(cleanTitle);
    let sizePart = '';
    if (size && !hasTrailingParens) {
        const cleanSize = String(size).trim();
        if (cleanSize && !cleanTitle.toLowerCase().includes(cleanSize.toLowerCase())) {
            sizePart = ` (${cleanSize})`;
        }
    }

    if (!cleanTitle) {
        cleanTitle = 'Товар пасіки';
    }

    return `[${code}] ${cleanTitle}${sizePart}`;
}

function medovaGetCart() {
    try {
        const raw = localStorage.getItem(MEDOVA_CONFIG.cartStorageKey);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        return [];
    }
}

function medovaSaveCart(items) {
    const safeList = Array.isArray(items) ? items : [];
    localStorage.setItem(MEDOVA_CONFIG.cartStorageKey, JSON.stringify(safeList));
    return safeList;
}

function medovaFormatNumber(num) {
    const n = Math.max(1, parseInt(num, 10) || 1);
    const padLen = MEDOVA_CONFIG.numberPadLength || 8;
    return `${MEDOVA_CONFIG.prefix}-${String(n).padStart(padLen, '0')}`;
}

async function medovaGenerateNextOrderNumber() {
    const prefixEscaped = encodeURIComponent(`${MEDOVA_CONFIG.prefix}-*`);
    const floorSeq = Math.max(0, (parseInt(MEDOVA_CONFIG.minStartSeq, 10) || 1) - 1);
    let maxNum = Math.max(
        floorSeq,
        parseInt(localStorage.getItem(MEDOVA_CONFIG.seqStorageKey) || '0', 10) || 0
    );

    try {
        const url = `${MEDOVA_CONFIG.supabaseUrl}/rest/v1/orders?select=id&id=like.${prefixEscaped}`;
        const res = await fetch(url, {
            headers: {
                apikey: MEDOVA_CONFIG.supabaseKey,
                Authorization: `Bearer ${MEDOVA_CONFIG.supabaseKey}`
            }
        });
        if (res.ok) {
            const rows = await res.json();
            if (Array.isArray(rows)) {
                const re = new RegExp(`^${MEDOVA_CONFIG.prefix}-(\\d+)$`);
                rows.forEach(r => {
                    const m = String(r.id || '').trim().match(re);
                    if (m) {
                        const val = parseInt(m[1], 10);
                        if (!isNaN(val) && val > maxNum) maxNum = val;
                    }
                });
            }
        }
    } catch (e) {
        console.warn('medovaGenerateNextOrderNumber fallback to local counter:', e);
    }

    const nextSeq = maxNum + 1;
    localStorage.setItem(MEDOVA_CONFIG.seqStorageKey, String(nextSeq));
    return medovaFormatNumber(nextSeq);
}

function medovaEscapeHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function medovaEnsureReceiptModal() {
    if (!document.getElementById('medovaReceiptStyle')) {
        const style = document.createElement('style');
        style.id = 'medovaReceiptStyle';
        style.textContent = `
            #medovaReceiptModal {
                display: none;
                position: fixed;
                inset: 0;
                z-index: 2000;
                background: rgba(43, 29, 14, 0.65);
                backdrop-filter: blur(6px);
                align-items: center;
                justify-content: center;
                padding: 16px;
            }
            #medovaReceiptModal.open {
                display: flex;
            }
            .medova-receipt-card {
                background: #FFFFFF;
                color: #2B1D0E;
                border: 1px solid #E8DCC8;
                border-radius: 22px;
                width: min(440px, 100%);
                max-height: 90vh;
                overflow-y: auto;
                padding: 26px 22px;
                box-shadow: 0 25px 50px rgba(0, 0, 0, 0.28);
                font-family: 'Plus Jakarta Sans', sans-serif;
            }
            .medova-receipt-top {
                text-align: center;
                margin-bottom: 14px;
            }
            .medova-receipt-badge {
                display: inline-block;
                background: #ECFDF5;
                color: #047857;
                border: 1px solid #A7F3D0;
                padding: 4px 12px;
                border-radius: 999px;
                font-size: 12px;
                font-weight: 800;
                margin-bottom: 8px;
            }
            .medova-receipt-brand {
                font-size: 11px;
                font-weight: 800;
                letter-spacing: 0.08em;
                text-transform: uppercase;
                color: #92400E;
                margin-bottom: 4px;
            }
            .medova-receipt-num {
                font-family: 'Cormorant Garamond', serif;
                font-size: 28px;
                font-weight: 700;
                line-height: 1.15;
                color: #2B1D0E;
                word-break: break-word;
            }
            .medova-receipt-hint {
                font-size: 12px;
                color: #7A6A52;
                margin-top: 4px;
            }
            .medova-receipt-meta {
                background: #FDFBF7;
                border: 1px solid #E8DCC8;
                border-radius: 12px;
                padding: 10px 12px;
                font-size: 13px;
                line-height: 1.5;
                margin-bottom: 14px;
            }
            .medova-receipt-dash {
                border-top: 1.5px dashed #E8DCC8;
                margin: 12px 0;
            }
            .medova-receipt-list {
                list-style: none;
                counter-reset: medova-rc;
                margin: 0;
                padding: 0;
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            .medova-receipt-row {
                counter-increment: medova-rc;
                background: #FDFBF7;
                border: 1px solid #E8DCC8;
                border-radius: 12px;
                padding: 10px 12px;
            }
            .medova-receipt-row-head {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                gap: 10px;
                font-size: 14px;
                font-weight: 700;
            }
            .medova-receipt-row-head::before {
                content: counter(medova-rc) ". ";
                color: #92400E;
                font-weight: 800;
                flex-shrink: 0;
            }
            .medova-receipt-row-name {
                flex: 1;
            }
            .medova-receipt-row-sum {
                white-space: nowrap;
                font-weight: 800;
                color: #92400E;
            }
            .medova-receipt-row-sub {
                margin-top: 4px;
                padding-left: 18px;
                font-size: 12px;
                color: #7A6A52;
            }
            .medova-receipt-total {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 12px;
                background: linear-gradient(135deg, #FFFBEB, #FEF3C7);
                border: 1px solid #FDE68A;
                border-radius: 14px;
                padding: 14px 16px;
                margin-top: 14px;
            }
            .medova-receipt-total span {
                font-size: 14px;
                font-weight: 700;
                color: #7A6A52;
            }
            .medova-receipt-total strong {
                font-family: 'Cormorant Garamond', serif;
                font-size: 30px;
                font-weight: 700;
                color: #92400E;
                line-height: 1;
                white-space: nowrap;
            }
            .medova-receipt-close {
                width: 100%;
                margin-top: 16px;
                background: linear-gradient(135deg, #F59E0B, #D97706);
                color: #FFFFFF;
                border: none;
                border-radius: 12px;
                padding: 14px 18px;
                font-size: 15px;
                font-weight: 800;
                cursor: pointer;
                box-shadow: 0 8px 20px rgba(217, 119, 6, 0.28);
            }
            .medova-receipt-close:hover {
                background: linear-gradient(135deg, #D97706, #B45309);
            }
        `;
        document.head.appendChild(style);
    }

    if (!document.getElementById('medovaReceiptModal')) {
        const modal = document.createElement('div');
        modal.id = 'medovaReceiptModal';
        modal.innerHTML = `
            <div class="medova-receipt-card" role="dialog" aria-modal="true">
                <div class="medova-receipt-top">
                    <div class="medova-receipt-badge">✓ Замовлення прийнято</div>
                    <div class="medova-receipt-brand">Медова Пасіка</div>
                    <div class="medova-receipt-num" id="medovaReceiptNumber">Чек МП-00000026</div>
                    <div class="medova-receipt-hint">Зробіть скріншот чека для себе</div>
                </div>
                <div class="medova-receipt-meta" id="medovaReceiptMeta" style="display:none;"></div>
                <div class="medova-receipt-dash"></div>
                <ol class="medova-receipt-list" id="medovaReceiptItems"></ol>
                <div class="medova-receipt-total">
                    <span>Загальна сума замовлення:</span>
                    <strong id="medovaReceiptTotal">0 ₴</strong>
                </div>
                <button type="button" class="medova-receipt-close" id="medovaReceiptCloseBtn">Закрити</button>
            </div>
        `;
        document.body.appendChild(modal);

        document.getElementById('medovaReceiptCloseBtn').addEventListener('click', medovaCloseOrderReceipt);
        modal.addEventListener('click', function(e) {
            if (e.target === modal) medovaCloseOrderReceipt();
        });
    }
}

function medovaShowOrderReceipt(orderResult, meta) {
    if (!orderResult) return;
    medovaEnsureReceiptModal();

    const info = meta || {};
    const numEl = document.getElementById('medovaReceiptNumber');
    const metaEl = document.getElementById('medovaReceiptMeta');
    const listEl = document.getElementById('medovaReceiptItems');
    const totalEl = document.getElementById('medovaReceiptTotal');
    const modalEl = document.getElementById('medovaReceiptModal');

    const displayOrderNum = String(orderResult.orderNumber || '—');
    if (numEl) numEl.textContent = `Чек ${displayOrderNum}`;

    if (metaEl) {
        const lines = [];
        if (info.customerName) lines.push(`<div><b>Клієнт:</b> ${medovaEscapeHtml(info.customerName)}</div>`);
        if (info.deliveryText) {
            const addr = info.addressSummary ? ` (${medovaEscapeHtml(info.addressSummary)})` : '';
            lines.push(`<div><b>Доставка:</b> ${medovaEscapeHtml(info.deliveryText)}${addr}</div>`);
        }
        metaEl.innerHTML = lines.join('');
        metaEl.style.display = lines.length ? 'block' : 'none';
    }

    const items = Array.isArray(orderResult.items) ? orderResult.items : [];
    let sumFallback = 0;

    if (listEl) {
        listEl.innerHTML = items.map(item => {
            const qty = Math.max(1, parseInt(item.qty, 10) || 1);
            const price = Number(item.price) || 0;
            const subtotal = item.subtotal !== undefined ? Number(item.subtotal) : price * qty;
            sumFallback += subtotal;

            return `
                <li class="medova-receipt-row">
                    <div class="medova-receipt-row-head">
                        <span class="medova-receipt-row-name">${medovaEscapeHtml(item.name || 'Товар')}</span>
                        <span class="medova-receipt-row-sum">${subtotal} ₴</span>
                    </div>
                    <div class="medova-receipt-row-sub">${price} ₴ × ${qty} шт. = ${subtotal} ₴</div>
                </li>
            `;
        }).join('');
    }

    const finalSum = orderResult.total !== undefined ? Number(orderResult.total) : sumFallback;
    if (totalEl) totalEl.textContent = `${finalSum} ₴`;

    if (modalEl) {
        modalEl.classList.add('open');
        document.body.style.overflow = 'hidden';
    }
}

function medovaCloseOrderReceipt() {
    const modalEl = document.getElementById('medovaReceiptModal');
    if (modalEl) modalEl.classList.remove('open');
    document.body.style.overflow = '';
}

async function medovaSubmitOrder(orderData) {
    const cartItems = Array.isArray(orderData.cart) && orderData.cart.length
        ? orderData.cart
        : medovaGetCart();

    if (!cartItems.length) {
        return { ok: false, error: 'EMPTY_CART' };
    }

    const orderNumber = await medovaGenerateNextOrderNumber();

    const normalizedItems = cartItems.map(item => {
        const rawCode = item.prodId || item.code || '';
        const rawName = item.name || item.title || '';
        const formattedName = medovaFormatItemName(rawCode, rawName, item.size);
        const qty = Math.max(1, parseInt(item.qty, 10) || 1);
        const price = Number(item.price) || 0;
        return {
            prodId: medovaResolveSku(rawCode, rawName),
            name: formattedName,
            price,
            qty,
            subtotal: price * qty
        };
    });

    const total = normalizedItems.reduce((sum, i) => sum + i.subtotal, 0);
    const fullItemsStr = normalizedItems.map(i => `${i.name} (${i.qty} шт.)`).join(', ');
    const itemsListHtml = normalizedItems
        .map(i => `• ${medovaEscapeHtml(i.name)} — ${i.qty} шт. (${i.subtotal} ₴)`)
        .join('\n');

    const payload = {
        id: orderNumber,
        customer_name: String(orderData.name || '').trim(),
        phone: String(orderData.phone || '').trim(),
        email: String(orderData.email || '').trim(),
        delivery_method: String(orderData.deliveryText || '').trim(),
        items: fullItemsStr,
        total_price: total,
        comment: String(orderData.combinedComment || '').trim()
    };

    const dbRes = await fetch(`${MEDOVA_CONFIG.supabaseUrl}/rest/v1/orders`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            apikey: MEDOVA_CONFIG.supabaseKey,
            Authorization: `Bearer ${MEDOVA_CONFIG.supabaseKey}`,
            Prefer: 'return=representation'
        },
        body: JSON.stringify([payload])
    });

    if (!dbRes.ok) {
        const errText = await dbRes.text().catch(() => '');
        throw new Error(`Supabase insert failed: ${dbRes.status} ${errText}`);
    }

    const freeShippingNote = total >= 1000
        ? '\n🎁 <b>Акція:</b> Безкоштовна доставка (від 1000 ₴)'
        : '';

    const tgText =
        `<b>🛒 Нове замовлення № ${medovaEscapeHtml(orderNumber)}!</b>\n\n` +
        `<b>👤 ПІБ:</b> ${medovaEscapeHtml(payload.customer_name)}\n` +
        `<b>📞 Телефон:</b> ${medovaEscapeHtml(payload.phone)}\n` +
        (payload.email ? `<b>📧 Email:</b> ${medovaEscapeHtml(payload.email)}\n` : '') +
        `<b>🚚 Доставка:</b> ${medovaEscapeHtml(payload.delivery_method)}\n` +
        (orderData.cityText ? `<b>📍 Місто / село:</b> ${medovaEscapeHtml(orderData.cityText)}\n` : '') +
        (orderData.warehouseText ? `<b>🏢 Відділення НП:</b> ${medovaEscapeHtml(orderData.warehouseText)}\n` : '') +
        (orderData.altAddressText ? `<b>✉️ Адреса Укрпошти:</b> ${medovaEscapeHtml(orderData.altAddressText)}\n` : '') +
        `<b>💬 Коментар:</b> ${medovaEscapeHtml(orderData.comment || 'Відсутній')}\n\n` +
        `<b>📦 Товари:</b>\n${itemsListHtml}\n\n` +
        `💰 <b>Загальна сума:</b> <b>${total} ₴</b>${freeShippingNote}`;

    const tgRes = await fetch(`https://api.telegram.org/bot${MEDOVA_CONFIG.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: MEDOVA_CONFIG.chatId,
            text: tgText,
            parse_mode: 'HTML'
        })
    });

    const tgData = await tgRes.json();
    if (!tgData.ok) {
        throw new Error('Telegram sendMessage failed');
    }

    medovaSaveCart([]);
    return {
        ok: true,
        orderNumber,
        total,
        items: normalizedItems
    };
}

window.MEDOVA_CONFIG = MEDOVA_CONFIG;
window.MEDOVA_SKU_MAP = MEDOVA_SKU_MAP;
window.medovaExtractBracketCode = medovaExtractBracketCode;
window.medovaResolveSku = medovaResolveSku;
window.medovaFormatItemName = medovaFormatItemName;
window.medovaGetCart = medovaGetCart;
window.medovaSaveCart = medovaSaveCart;
window.medovaFormatNumber = medovaFormatNumber;
window.medovaGenerateNextOrderNumber = medovaGenerateNextOrderNumber;
window.medovaEscapeHtml = medovaEscapeHtml;
window.medovaEnsureReceiptModal = medovaEnsureReceiptModal;
window.medovaShowOrderReceipt = medovaShowOrderReceipt;
window.medovaCloseOrderReceipt = medovaCloseOrderReceipt;
window.medovaSubmitOrder = medovaSubmitOrder;
