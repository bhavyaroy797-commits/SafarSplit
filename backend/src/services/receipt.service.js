'use strict';

const db = require('../config/db');
const ApiError = require('../utils/ApiError');
const { classifyItem } = require('../utils/dietDictionary');
const { assign } = require('../utils/assignEngine');
const aiService = require('./ai.service');
const vision = require('./receiptVision.service');
const attachmentsService = require('./attachment.service');

/**
 * Read a receipt image → normalized draft (not saved to DB until confirm).
 */
async function readImage({ tripId, userId, file }) {
  if (!file) throw ApiError.badRequest('Image file is required');

  const draft = await vision.readReceipt({
    tripId,
    userId,
    imagePath: file.path,
    mimeType: file.mimetype,
  });

  // 1. Enrich each item with the deterministic diet classifier.
  const enrichedItems = draft.items.map((it) => {
    const c = classifyItem(it.name);
    return {
      ...it,
      dietClass: c.dietClass,
      jainOk: c.jainOk,
      dietConfidence: c.confidence,
      matched: c.matched,
    };
  });

  // 2. Items the dictionary couldn't classify get sent to the LLM in one batch.
  const unknowns = enrichedItems.filter((it) => it.dietClass === 'unknown');
  if (unknowns.length) {
    try {
      const results = await aiService.classifyReceiptItems({
        tripId,
        userId,
        items: unknowns,
      });
      const byName = new Map(
        results.map((r) => [String(r.name || '').toLowerCase().trim(), r])
      );
      for (const it of enrichedItems) {
        if (it.dietClass !== 'unknown') continue;
        const hit = byName.get(it.name.toLowerCase().trim());
        if (hit && ['veg', 'egg', 'non_veg'].includes(hit.diet_class)) {
          it.dietClass = hit.diet_class;
          it.jainOk = !!hit.jain_ok;
          it.dietConfidence = Number.isFinite(hit.confidence) ? hit.confidence : 0.5;
        }
      }
    } catch (_) {
      /* stays unknown; will be flagged needs_manual */
    }
  }

  // 3. Run the assignment engine to produce a preview (nothing saved yet).
  const membersRes = await db.query(
    `SELECT tm.user_id AS id, u.name, COALESCE(u.dietary_preference, 'any') AS diet
       FROM trip_members tm
       JOIN users u ON u.id = tm.user_id
      WHERE tm.trip_id = $1`,
    [tripId]
  );
  const members = membersRes.rows;

  const engineItems = enrichedItems.map((it, idx) => ({
    id: `tmp-${idx}`, // temp id, not stored
    name: it.name,
    line_total_paise: it.lineTotalPaise,
    diet_class: it.dietClass,
    jain_ok: it.jainOk,
  }));

  const engine = assign(engineItems, members, {
    taxesPaise: draft.taxesPaise,
    serviceChargePaise: draft.serviceChargePaise,
    discountPaise: draft.discountPaise,
    deliveryPaise: draft.deliveryPaise,
  });

  // Merge engine results back per item.
  const assignmentsByIdx = new Map(
    engine.itemAssignments.map((a, i) => [i, a])
  );
  const itemsWithAssignments = enrichedItems.map((it, idx) => {
    const a = assignmentsByIdx.get(idx);
    return {
      ...it,
      tempId: `tmp-${idx}`,
      needsManual: a?.needsManual || false,
      shares: a?.shares || [],
      explanation: a?.explanation || '',
    };
  });

  return {
    merchant: draft.merchant,
    date: draft.date,
    items: itemsWithAssignments,
    taxesPaise: draft.taxesPaise,
    serviceChargePaise: draft.serviceChargePaise,
    discountPaise: draft.discountPaise,
    deliveryPaise: draft.deliveryPaise,
    totalPaise: draft.totalPaise,
    mismatch: draft.mismatch,
    mismatchNote: draft.mismatchNote,
    members,
    previewTotals: engine.totals,
    previewMemberTotals: engine.memberTotals,
    needsManualItems: engine.needsManualItems.map((tmpId) => {
      const i = parseInt(tmpId.replace('tmp-', ''), 10);
      return itemsWithAssignments[i];
    }),
    attachmentStoredName: file.filename,
    attachmentOriginalName: file.originalname,
    attachmentMime: file.mimetype,
    attachmentSize: file.size,
  };
}

/**
 * Confirm a receipt draft. Persists receipt + items + assignments +
 * a linked expense (split_type='exact'), all in one transaction.
 */
async function confirmReceipt({
  tripId,
  userId,
  attachmentMeta,
  payload,
}) {
  return db.withTransaction(async (client) => {
    // 1. Persist a link row for the image (reuse attachments table).
    const attRes = await client.query(
      `INSERT INTO attachments
         (trip_id, uploaded_by, original_name, stored_name, mime_type,
          size_bytes, kind, title)
       VALUES ($1,$2,$3,$4,$5,$6,'receipt',$7)
       RETURNING id`,
      [
        tripId,
        userId,
        attachmentMeta.original_name,
        attachmentMeta.stored_name,
        attachmentMeta.mime_type,
        attachmentMeta.size_bytes,
        attachmentMeta.title || 'Receipt scan',
      ]
    );
    const attachmentId = attRes.rows[0].id;

    // 2. Persist receipt (draft → immediately 'confirmed').
    const recRes = await client.query(
      `INSERT INTO receipts
         (trip_id, attachment_id, created_by, merchant, receipt_date,
          subtotal_paise, taxes_paise, service_charge_paise, discount_paise,
          total_paise, currency, status, mismatch_flag, mismatch_note, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'INR','confirmed',$11,$12,$13)
       RETURNING *`,
      [
        tripId,
        attachmentId,
        userId,
        payload.merchant || null,
        payload.date || null,
        payload.subtotalPaise ?? null,
        payload.taxesPaise || 0,
        payload.serviceChargePaise || 0,
        payload.discountPaise || 0,
        payload.totalPaise ?? null,
        !!payload.mismatch,
        payload.mismatchNote || null,
        payload.notes || null,
      ]
    );
    const receipt = recRes.rows[0];

    // 3. Insert items + assignments. Preserve input order.
    const itemIdMap = new Map();
    for (let i = 0; i < payload.items.length; i++) {
      const it = payload.items[i];
      const itemRes = await client.query(
        `INSERT INTO receipt_items
           (receipt_id, position, name, qty, unit_price_paise,
            line_total_paise, diet_class, jain_ok, category,
            confidence, needs_manual)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         RETURNING id`,
        [
          receipt.id,
          i,
          it.name,
          it.qty || 1,
          it.unitPricePaise || 0,
          it.lineTotalPaise || 0,
          it.dietClass || 'unknown',
          it.jainOk !== false,
          it.category || null,
          Number.isFinite(it.confidence) ? it.confidence : null,
          !!it.needsManual,
        ]
      );
      const itemId = itemRes.rows[0].id;
      itemIdMap.set(it.tempId, itemId);

      for (const s of it.shares || []) {
        await client.query(
          `INSERT INTO receipt_item_assignments (item_id, user_id, share_paise)
           VALUES ($1,$2,$3)`,
          [itemId, s.userId, s.sharePaise]
        );
      }
    }

    // 4. Create the expense (split_type='exact'), one split per member total.
    const perMember = new Map();
    for (const it of payload.items) {
      for (const s of it.shares || []) {
        perMember.set(s.userId, (perMember.get(s.userId) || 0) + s.sharePaise);
      }
    }
    // Add extras proportionally (re-run the engine client-side would be
    // ideal, but on confirm we trust the totals the caller sent).
    if (payload.previewMemberTotals?.length) {
      perMember.clear();
      for (const t of payload.previewMemberTotals) {
        perMember.set(t.userId, t.totalPaise);
      }
    }

    // Payer: for lack of a better rule, the owner of the trip pays upfront.
    const tripRes = await client.query(
      'SELECT owner_id FROM trips WHERE id = $1',
      [tripId]
    );
    const payerId = tripRes.rows[0]?.owner_id || userId;

    const expenseAmount = [...perMember.values()].reduce((s, v) => s + v, 0);
    const expRes = await client.query(
      `INSERT INTO expenses
         (trip_id, title, amount_paise, paid_by_user_id, split_type,
          category, notes, created_by)
       VALUES ($1,$2,$3,$4,'exact',$5,$6,$7)
       RETURNING *`,
      [
        tripId,
        payload.title || `Receipt: ${payload.merchant || 'Bill'}`,
        expenseAmount,
        payerId,
        payload.category || 'food',
        `Auto-generated from receipt scan${payload.merchant ? ` — ${payload.merchant}` : ''}`,
        userId,
      ]
    );
    const expense = expRes.rows[0];

    for (const [uid, amt] of perMember.entries()) {
      if (amt <= 0) continue;
      await client.query(
        `INSERT INTO expense_splits (expense_id, user_id, share_paise)
         VALUES ($1,$2,$3)`,
        [expense.id, uid, amt]
      );
    }

    return { receipt, expense, itemIdMap };
  });
}

/**
 * Fetch a full receipt with items + assignments for the review screen.
 */
async function getReceipt(receiptId) {
  const recRes = await db.query(
    `SELECT r.*, a.stored_name, a.original_name, a.mime_type
       FROM receipts r
       LEFT JOIN attachments a ON a.id = r.attachment_id
      WHERE r.id = $1`,
    [receiptId]
  );
  if (!recRes.rows[0]) throw ApiError.notFound('Receipt not found');
  const receipt = recRes.rows[0];

  const itemsRes = await db.query(
    'SELECT * FROM receipt_items WHERE receipt_id = $1 ORDER BY position',
    [receiptId]
  );
  const items = itemsRes.rows;

  const assignmentsRes = await db.query(
    `SELECT a.item_id, a.user_id, a.share_paise, u.name
       FROM receipt_item_assignments a
       JOIN users u ON u.id = a.user_id
      WHERE a.item_id = ANY($1::uuid[])`,
    [items.map((i) => i.id)]
  );

  const byItem = new Map();
  for (const a of assignmentsRes.rows) {
    if (!byItem.has(a.item_id)) byItem.set(a.item_id, []);
    byItem.get(a.item_id).push({
      userId: a.user_id,
      name: a.name,
      sharePaise: a.share_paise,
    });
  }

  return {
    receipt,
    items: items.map((i) => ({ ...i, shares: byItem.get(i.id) || [] })),
  };
}

module.exports = { readImage, confirmReceipt, getReceipt };