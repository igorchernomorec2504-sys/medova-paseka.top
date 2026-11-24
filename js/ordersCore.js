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
    'мед соняшниковий': 'MR01',
    'мед подсолнечный': 'MR01',
    'мед травневий': 'MR02',
    'мед майский': 'MR02',
    'мед з волоським горіхом': 'MR03',
    'мед с грецким орехом': 'MR03',
    'стільниковий мед': 'MR04',
    'сотовый мед': 'MR04',
    'свічка з вощини': 'MR05',
    'свічки з вощини': 'MR05',
    'свеча из вощины': 'MR05',
    'свечи из вощины': 'MR05',
    'прополіс': 'MR06',
    'прополис': 'MR06',
    'бджолиний пилок': 'MR07',
    'пчелиная пыльца': 'MR07',
    'патріотичний набір свічок': 'MR08',
    'патриотический набор свечей': 'MR08',
    'набір «медовий затишок»': 'MR09',
    'набор «медовый уют»': 'MR09',
    'набір з натуральної вощини': 'MR10',
    'набор из натуральной вощины': 'MR10'
};

function medovaResolveSku(prodId, title) {
    const rawId = String(prodId || '').trim().toUpperCase();
    if (rawId && MEDOVA_SKU_MAP[rawId]) return MEDOVA_SKU_MAP[rawId];
    if (/^M[PR]\d+$/i.test(rawId)) return rawId;

    const cleanTitle = String(title || '').trim().toLowerCase();
    if (cleanTitle && MEDOVA_SKU_MAP[cleanTitle]) return MEDOVA_SKU_MAP[cleanTitle];

    return rawId || 'MR00';
}

function medovaFormatItemName(prodId, title, size) {
    const code = medovaResolveSku(prodId, title);
    const cleanTitle = String(title || '').replace(/^\[[^\]]+\]\s*/, '').trim();
    const sizePart = size ? ` (${String(size).trim()})` : '';
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
        const formattedName = medovaFormatItemName(item.prodId, item.name, item.size);
        const qty = Math.max(1, parseInt(item.qty, 10) || 1);
        const price = Number(item.price) || 0;
        return {
            prodId: medovaResolveSku(item.prodId, item.name),
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
window.medovaResolveSku = medovaResolveSku;
window.medovaFormatItemName = medovaFormatItemName;
window.medovaGetCart = medovaGetCart;
window.medovaSaveCart = medovaSaveCart;
window.medovaFormatNumber = medovaFormatNumber;
window.medovaGenerateNextOrderNumber = medovaGenerateNextOrderNumber;
window.medovaEscapeHtml = medovaEscapeHtml;
window.medovaSubmitOrder = medovaSubmitOrder;
