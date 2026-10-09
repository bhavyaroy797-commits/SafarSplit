import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { expensesApi, aiApi } from '../../services/api';

export const fetchExpenses = createAsyncThunk(
  'expenses/fetchAll',
  async (tripId) => expensesApi.list(tripId)
);

export const createExpense = createAsyncThunk(
  'expenses/create',
  async ({ tripId, payload }) => expensesApi.create(tripId, payload)
);

export const deleteExpense = createAsyncThunk(
  'expenses/delete',
  async ({ tripId, expenseId }) => {
    await expensesApi.remove(tripId, expenseId);
    return expenseId;
  }
);

export const fetchBalances = createAsyncThunk(
  'expenses/fetchBalances',
  async (tripId) => expensesApi.balances(tripId)
);

export const fetchSettleUp = createAsyncThunk(
  'expenses/fetchSettleUp',
  async (tripId) => expensesApi.settleUp(tripId)
);

export const parseExpenseText = createAsyncThunk(
  'expenses/parseText',
  async ({ tripId, text }) => aiApi.parseExpense(tripId, text)
);

const initialState = {
  items: [],
  balances: [],
  settleUp: { balances: [], transfers: [] },
  parsed: null,
  parseStatus: 'idle',
  parseError: null,
  status: 'idle',
  error: null,
};

const expensesSlice = createSlice({
  name: 'expenses',
  initialState,
  reducers: {
    upsertExpenseFromSocket: (state, action) => {
      const e = action.payload;
      const idx = state.items.findIndex((i) => i.id === e.id);
      if (idx >= 0) state.items[idx] = e;
      else state.items.unshift(e);
    },
    removeExpenseFromSocket: (state, action) => {
      state.items = state.items.filter((i) => i.id !== action.payload);
    },
    setSettleUpFromSocket: (state, action) => {
      state.settleUp = action.payload;
      state.balances = action.payload.balances || [];
    },
    clearParsed: (state) => {
      state.parsed = null;
      state.parseError = null;
      state.parseStatus = 'idle';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchExpenses.pending, (s) => {
        s.status = 'loading';
      })
      .addCase(fetchExpenses.fulfilled, (s, a) => {
        s.status = 'idle';
        s.items = a.payload || [];
      })
      .addCase(fetchExpenses.rejected, (s, a) => {
        s.status = 'error';
        s.error = a.error.message;
      })
      .addCase(createExpense.fulfilled, (s, a) => {
        s.items.unshift(a.payload.expense);
      })
      .addCase(deleteExpense.fulfilled, (s, a) => {
        s.items = s.items.filter((i) => i.id !== a.payload);
      })
      .addCase(fetchBalances.fulfilled, (s, a) => {
        s.balances = a.payload || [];
      })
      .addCase(fetchSettleUp.fulfilled, (s, a) => {
        s.settleUp = a.payload || { balances: [], transfers: [] };
      })
      .addCase(parseExpenseText.pending, (s) => {
        s.parseStatus = 'loading';
        s.parseError = null;
        s.parsed = null;
      })
      .addCase(parseExpenseText.fulfilled, (s, a) => {
        s.parseStatus = 'idle';
        s.parsed = a.payload;
      })
      .addCase(parseExpenseText.rejected, (s, a) => {
        s.parseStatus = 'error';
        s.parseError = a.error.message;
      });
  },
});

export const {
  upsertExpenseFromSocket,
  removeExpenseFromSocket,
  setSettleUpFromSocket,
  clearParsed,
} = expensesSlice.actions;
export default expensesSlice.reducer;