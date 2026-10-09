'use strict';

/**
 * Labelled conversation set for the assistant NLU pipeline.
 * Each entry:
 *   { id, turns: [userMsg, ...], expected: { intent, slots?, clarification? } }
 * Used by scripts/eval-assistant.js to measure intent accuracy, slot F1,
 * and clarification-question accuracy.
 */

module.exports = [
  // ---------- Simple add_expense (English) ----------
  { id: 'ae-01', turns: ['Rahul paid 500 for dinner'],
    expected: { intent: 'add_expense', slots: { payerName: 'Rahul', amountText: '500', description: 'dinner' } } },
  { id: 'ae-02', turns: ['Priya paid 1200 for cab'],
    expected: { intent: 'add_expense', slots: { payerName: 'Priya', amountText: '1200', description: 'cab' } } },
  { id: 'ae-03', turns: ['Amit spent 300 on chai'],
    expected: { intent: 'add_expense', slots: { payerName: 'Amit', amountText: '300', description: 'chai' } } },
  { id: 'ae-04', turns: ['Sneha paid 2500 for hotel'],
    expected: { intent: 'add_expense', slots: { payerName: 'Sneha', amountText: '2500', description: 'hotel' } } },
  { id: 'ae-05', turns: ['Add 400 rupees petrol, paid by Rahul'],
    expected: { intent: 'add_expense', slots: { payerName: 'Rahul', amountText: '400', description: 'petrol' } } },

  // ---------- Add_expense (Hinglish) ----------
  { id: 'ah-01', turns: ['Rahul ne 1200 diye dinner ke liye'],
    expected: { intent: 'add_expense', slots: { payerName: 'Rahul', amountText: '1200', description: 'dinner' } } },
  { id: 'ah-02', turns: ['Priya ne 500 diya chai ke liye'],
    expected: { intent: 'add_expense', slots: { payerName: 'Priya', amountText: '500', description: 'chai' } } },
  { id: 'ah-03', turns: ['Amit ne 800 diye cab ke liye'],
    expected: { intent: 'add_expense', slots: { payerName: 'Amit', amountText: '800', description: 'cab' } } },
  { id: 'ah-04', turns: ['Sneha ne 1500 diya lunch ke liye'],
    expected: { intent: 'add_expense', slots: { payerName: 'Sneha', amountText: '1500', description: 'lunch' } } },
  { id: 'ah-05', turns: ['Rahul ne 300 diye auto ke liye'],
    expected: { intent: 'add_expense', slots: { payerName: 'Rahul', amountText: '300', description: 'auto' } } },

  // ---------- Exclusions ----------
  { id: 'ex-01', turns: ['Rahul ne 1200 diye dinner ke liye, Amit ko chhod ke split'],
    expected: { intent: 'add_expense', slots: { payerName: 'Rahul', amountText: '1200', excludedNames: ['Amit'] } } },
  { id: 'ex-02', turns: ['Priya paid 800 for cab, excluding Amit'],
    expected: { intent: 'add_expense', slots: { payerName: 'Priya', amountText: '800', excludedNames: ['Amit'] } } },
  { id: 'ex-03', turns: ['Sneha ne 600 diye snacks ke liye, Amit ko chhod ke'],
    expected: { intent: 'add_expense', slots: { payerName: 'Sneha', amountText: '600', excludedNames: ['Amit'] } } },

  // ---------- Typo handling ----------
  { id: 'ty-01', turns: ['Rahool paid 500 for cab'],
    expected: { intent: 'add_expense', slots: { payerName: 'Rahul', amountText: '500' } } },
  { id: 'ty-02', turns: ['Prya ne 300 diye chai ke liye'],
    expected: { intent: 'add_expense', slots: { payerName: 'Priya', amountText: '300' } } },
  { id: 'ty-03', turns: ['Ameet paid 400 for toll'],
    expected: { intent: 'add_expense', slots: { payerName: 'Amit', amountText: '400' } } },
  { id: 'ty-04', turns: ['Snehaa ne 200 diye water ke liye'],
    expected: { intent: 'add_expense', slots: { payerName: 'Sneha', amountText: '200' } } },

  // ---------- Amount variants ----------
  { id: 'am-01', turns: ['Rahul paid 1.2k for dinner'],
    expected: { intent: 'add_expense', slots: { amountText: '1.2k' } } },
  { id: 'am-02', turns: ['Priya ne dedh sau diye chai ke liye'],
    expected: { intent: 'add_expense', slots: { amountText: 'dedh sau' } } },
  { id: 'am-03', turns: ['Amit paid 2 hazaar for hotel'],
    expected: { intent: 'add_expense', slots: { amountText: '2 hazaar' } } },
  { id: 'am-04', turns: ['Sneha ne paanch sau diye cab ke liye'],
    expected: { intent: 'add_expense', slots: { amountText: 'paanch sau' } } },
  { id: 'am-05', turns: ['Rahul paid sawa lakh for booking'],
    expected: { intent: 'add_expense', slots: { amountText: 'sawa lakh' } } },

  // ---------- Ambiguous names ----------
  { id: 'ab-01', turns: ['Priya paid 500 for cab'],
    expected: { intent: 'add_expense', clarification: 'priya-vs-priyanka' } },

  // ---------- Missing slots ----------
  { id: 'ms-01', turns: ['Rahul paid for dinner'],
    expected: { intent: 'add_expense', clarification: 'amount' } },
  { id: 'ms-02', turns: ['500 diye dinner ke liye'],
    expected: { intent: 'add_expense', clarification: 'payer' } },
  { id: 'ms-03', turns: ['Add 500 for dinner'],
    expected: { intent: 'add_expense', clarification: 'payer' } },
  { id: 'ms-04', turns: ['Priya paid'],
    expected: { intent: 'add_expense', clarification: 'amount' } },
  { id: 'ms-05', turns: ['Kuch add karo'],
    expected: { intent: 'unknown', clarification: null } },

  // ---------- Multi-expense ----------
  { id: 'mu-01', turns: ['Rahul ne 500 diye lunch ke liye, Priya ne 300 diye chai ke liye'],
    expected: { intent: 'add_multiple_expenses' } },
  { id: 'mu-02', turns: ['500 for dinner by Rahul, 200 for cab by Priya, 100 for chai by Amit'],
    expected: { intent: 'add_multiple_expenses' } },
  { id: 'mu-03', turns: ['Rahul paid 1200 for hotel, Priya paid 800 for food'],
    expected: { intent: 'add_multiple_expenses' } },

  // ---------- Coreference ----------
  { id: 'co-01', turns: ['Rahul paid 500 for dinner', 'uska bhi add kar do'],
    expected: { intent: 'add_expense' } },
  { id: 'co-02', turns: ['Rahul ne 500 diye dinner', 'same split mein Priya ne bhi 300 diye'],
    expected: { intent: 'add_expense' } },
  { id: 'co-03', turns: ['Priya paid 800 for cab', 'usi mein Amit ko bhi'],
    expected: { intent: 'add_expense' } },
  { id: 'co-04', turns: ['Rahul paid 1200 for hotel', 'wo cab wala bhi add karo'],
    expected: { intent: 'add_expense' } },

  // ---------- Balance queries ----------
  { id: 'bq-01', turns: ['Kitna baaki hai?'],
    expected: { intent: 'query_balance' } },
  { id: 'bq-02', turns: ['Who owes whom?'],
    expected: { intent: 'query_balance' } },
  { id: 'bq-03', turns: ['mera hisaab batao'],
    expected: { intent: 'query_balance' } },
  { id: 'bq-04', turns: ['Show balances'],
    expected: { intent: 'query_balance' } },

  // ---------- Settle up ----------
  { id: 'su-01', turns: ['Settle up karo'],
    expected: { intent: 'settle_up' } },
  { id: 'su-02', turns: ['How to settle?'],
    expected: { intent: 'settle_up' } },
  { id: 'su-03', turns: ['Hisaab chukta karo'],
    expected: { intent: 'settle_up' } },

  // ---------- Packing ----------
  { id: 'pk-01', turns: ['Add sunscreen to packing'],
    expected: { intent: 'add_packing' } },
  { id: 'pk-02', turns: ['Packing mein power bank add karo'],
    expected: { intent: 'add_packing' } },
  { id: 'pk-03', turns: ['Add medicines to the list'],
    expected: { intent: 'add_packing' } },

  // ---------- Claim ----------
  { id: 'cl-01', turns: ["I'll get the sunscreen"],
    expected: { intent: 'claim_item' } },
  { id: 'cl-02', turns: ['maine power bank le liya'],
    expected: { intent: 'claim_item' } },

  // ---------- Vote ----------
  { id: 'vo-01', turns: ['Vote pass for water sports'],
    expected: { intent: 'vote' } },
  { id: 'vo-02', turns: ['reject fort aguada'],
    expected: { intent: 'vote' } },

  // ---------- Edit / delete ----------
  { id: 'ed-01', turns: ['Edit last expense to 600'],
    expected: { intent: 'edit_expense' } },
  { id: 'ed-02', turns: ['delete the chai expense'],
    expected: { intent: 'delete_expense' } },
  { id: 'ed-03', turns: ['cab wala delete karo'],
    expected: { intent: 'delete_expense' } },

  // ---------- Unknown / noisy ----------
  { id: 'un-01', turns: ['asdfgh'],
    expected: { intent: 'unknown' } },
  { id: 'un-02', turns: ['hello'],
    expected: { intent: 'unknown' } },
  { id: 'un-03', turns: ['kya haal hai'],
    expected: { intent: 'unknown' } },

  // ---------- Mixed / tricky ----------
  { id: 'mx-01', turns: ['Rahul ne 1.2k diye dinner ke liye'],
    expected: { intent: 'add_expense', slots: { payerName: 'Rahul', amountText: '1.2k' } } },
  { id: 'mx-02', turns: ['Priya ne dedh sau diye chai ke liye'],
    expected: { intent: 'add_expense', slots: { payerName: 'Priya', amountText: 'dedh sau' } } },
  { id: 'mx-03', turns: ['Rahool ne 800 diye cab ke liye'],
    expected: { intent: 'add_expense', slots: { payerName: 'Rahul', amountText: '800' } } },
  { id: 'mx-04', turns: ['Amit ne 500 diye dinner ke liye, Priya ko chhod ke'],
    expected: { intent: 'add_expense', slots: { payerName: 'Amit', excludedNames: ['Priya'] } } },
  { id: 'mx-05', turns: ['Sneha paid 3000 for resort, split between all except Amit'],
    expected: { intent: 'add_expense', slots: { payerName: 'Sneha', amountText: '3000', excludedNames: ['Amit'] } } },

  // ---------- Multi-currency / rupee variants ----------
  { id: 'cr-01', turns: ['Rahul paid ₹500 for dinner'],
    expected: { intent: 'add_expense', slots: { payerName: 'Rahul', amountText: '₹500' } } },
  { id: 'cr-02', turns: ['Priya ne Rs 800 diye cab ke liye'],
    expected: { intent: 'add_expense', slots: { payerName: 'Priya', amountText: 'Rs 800' } } },
];