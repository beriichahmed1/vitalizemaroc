const ORDER_HEADERS = [
  "order_id",
  "created_at_utc",
  "order_status",
  "customer_name",
  "customer_phone",
  "customer_city",
  "currency",
  "payment_method",
  "items_json",
  "regular_subtotal_mad",
  "quantity_offer_savings_mad",
  "post_form_offer_mad",
  "delivery_fee_mad",
  "total_mad",
  "attribution_json",
  "webhook_received_at_utc"
];

const MAX_BODY_BYTES = 100000;

function doPost(e) {
  try {
    if (!e || !e.postData || typeof e.postData.contents !== "string") {
      return jsonResponse({ ok: false, error: "missing_body" });
    }
    if (e.contentLength > MAX_BODY_BYTES) {
      return jsonResponse({ ok: false, error: "body_too_large" });
    }

    const config = getConfig();
    const envelope = JSON.parse(e.postData.contents);
    if (!envelope || typeof envelope.payload_b64 !== "string" ||
        typeof envelope.signature_hex !== "string") {
      return jsonResponse({ ok: false, error: "invalid_envelope" });
    }

    const payloadBytes = Utilities.base64Decode(envelope.payload_b64);
    const rawPayload = Utilities.newBlob(payloadBytes).getDataAsString("UTF-8");
    const expectedSignature = bytesToHex(
      Utilities.computeHmacSha256Signature(rawPayload, config.secret)
    );
    if (!constantTimeEqual(expectedSignature, envelope.signature_hex.toLowerCase())) {
      return jsonResponse({ ok: false, error: "invalid_signature" });
    }

    const order = JSON.parse(rawPayload);
    validateOrder(order);

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const sheet = getOrdersSheet(config);
      ensureHeaders(sheet);

      const lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        const match = sheet.getRange(2, 1, lastRow - 1, 1)
          .createTextFinder(order.order_id)
          .matchEntireCell(true)
          .findNext();
        if (match) {
          return jsonResponse({ ok: true, order_id: order.order_id, duplicate: true });
        }
      }

      sheet.appendRow(orderToRow(order));
      return jsonResponse({ ok: true, order_id: order.order_id, duplicate: false });
    } finally {
      lock.releaseLock();
    }
  } catch (error) {
    console.error("Order webhook failed: " + safeErrorCode(error));
    return jsonResponse({ ok: false, error: safeErrorCode(error) });
  }
}

function getConfig() {
  const properties = PropertiesService.getScriptProperties();
  const sheetId = properties.getProperty("ORDERS_SHEET_ID");
  const sheetName = properties.getProperty("ORDERS_SHEET_NAME") || "Orders";
  const secret = properties.getProperty("WEBHOOK_HMAC_SECRET");
  if (!sheetId || !secret || secret.length < 32) {
    throw new Error("missing_configuration");
  }
  return { sheetId: sheetId, sheetName: sheetName, secret: secret };
}

function getOrdersSheet(config) {
  const spreadsheet = SpreadsheetApp.openById(config.sheetId);
  const sheet = spreadsheet.getSheetByName(config.sheetName);
  if (!sheet) {
    throw new Error("orders_sheet_not_found");
  }
  return sheet;
}

function ensureHeaders(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, ORDER_HEADERS.length).setValues([ORDER_HEADERS]);
    sheet.setFrozenRows(1);
    return;
  }
  const current = sheet.getRange(1, 1, 1, ORDER_HEADERS.length).getValues()[0];
  if (ORDER_HEADERS.some(function (header, index) {
    return current[index] !== header;
  })) {
    throw new Error("header_mismatch");
  }
}

function validateOrder(order) {
  if (!order || typeof order !== "object" ||
      typeof order.order_id !== "string" || !order.order_id ||
      typeof order.created_at_utc !== "string" ||
      typeof order.order_status !== "string" ||
      !order.customer || typeof order.customer.name !== "string" ||
      typeof order.customer.phone !== "string" ||
      typeof order.customer.city !== "string" ||
      order.currency !== "MAD" ||
      order.payment_method !== "cash_on_delivery" ||
      !Array.isArray(order.items) || order.items.length === 0) {
    throw new Error("invalid_order_schema");
  }

  ["regular_subtotal_mad", "quantity_offer_savings_mad",
    "post_form_offer_mad", "delivery_fee_mad", "total_mad"].forEach(function (key) {
    if (!Number.isSafeInteger(order[key]) || order[key] < 0) {
      throw new Error("invalid_money_value");
    }
  });
}

function orderToRow(order) {
  return [
    safeCellText(order.order_id),
    safeCellText(order.created_at_utc),
    safeCellText(order.order_status),
    safeCellText(order.customer.name),
    safeCellText(order.customer.phone),
    safeCellText(order.customer.city),
    "MAD",
    "cash_on_delivery",
    safeCellText(JSON.stringify(order.items)),
    order.regular_subtotal_mad,
    order.quantity_offer_savings_mad,
    order.post_form_offer_mad,
    order.delivery_fee_mad,
    order.total_mad,
    safeCellText(JSON.stringify(order.attribution || {})),
    new Date().toISOString()
  ];
}

function safeCellText(value) {
  const text = String(value == null ? "" : value);
  return /^[\s]*[=+\-@]/.test(text) ? "'" + text : text;
}

function bytesToHex(bytes) {
  return bytes.map(function (byte) {
    const value = (byte + 256) % 256;
    return ("0" + value.toString(16)).slice(-2);
  }).join("");
}

function constantTimeEqual(left, right) {
  if (typeof left !== "string" || typeof right !== "string" ||
      left.length !== right.length) {
    return false;
  }
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
}

function safeErrorCode(error) {
  const message = error && typeof error.message === "string" ? error.message : "";
  const knownCodes = [
    "missing_body",
    "body_too_large",
    "invalid_envelope",
    "invalid_signature",
    "missing_configuration",
    "orders_sheet_not_found",
    "header_mismatch",
    "invalid_order_schema",
    "invalid_money_value"
  ];
  return knownCodes.indexOf(message) >= 0 ? message : "internal_error";
}

function jsonResponse(body) {
  return ContentService.createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
}
