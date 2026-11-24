const MEDOVA_CONFIG = {
    botToken: '8812886094:AAFdw7NkHOSRB0If8ZMAME4tEbhwq1XCAZA',
    chatId: '1763769244',
    supabaseUrl: 'https://qqfnbzfmjemknxivfktb.supabase.co',
    supabaseKey: 'sb_publishable__wWNK3PiFLCj29ofrP_jbw_jWGIv3-1',
    prefix: 'ЧВД',
    cartStorageKey: 'medova_cart',
    seqStorageKey: 'medova_chvd_last_seq'
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

    // Если в title уже есть фасовка в круглых скобках в конце и size не передан — оставляем как есть
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
    return `${MEDOVA_CONFIG.prefix}-${String(n).padStart(3, '0')}`;
}

async function medovaGenerateNextOrderNumber() {
    const prefixEscaped = encodeURIComponent(`${MEDOVA_CONFIG.prefix}-*`);
    let maxNum = parseInt(localStorage.getItem(MEDOVA_CONFIG.seqStorageKey) || '0', 10) || 0;

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
window.medovaSubmitOrder = medovaSubmitOrder;
