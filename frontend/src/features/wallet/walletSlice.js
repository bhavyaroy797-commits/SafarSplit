import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { walletApi } from '../../services/api';

export const fetchWallet = createAsyncThunk('wallet/fetch', async () =>
  walletApi.get()
);

export const fetchTransactions = createAsyncThunk(
  'wallet/fetchTransactions',
  async (limit) => walletApi.transactions(limit)
);

export const topUpWallet = createAsyncThunk(
  'wallet/topUp',
  async ({ amountPaise, note }) => walletApi.topUp({ amountPaise, note })
);

export const transferWallet = createAsyncThunk(
  'wallet/transfer',
  async ({ toUserId, amountPaise, note }) =>
    walletApi.transfer({ toUserId, amountPaise, note })
);

const initialState = {
  wallet: null,
  transactions: [],
  status: 'idle',
  error: null,
};

const walletSlice = createSlice({
  name: 'wallet',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchWallet.pending, (s) => {
        s.status = 'loading';
      })
      .addCase(fetchWallet.fulfilled, (s, a) => {
        s.status = 'idle';
        s.wallet = a.payload;
      })
      .addCase(fetchWallet.rejected, (s, a) => {
        s.status = 'error';
        s.error = a.error.message;
      })
      .addCase(fetchTransactions.fulfilled, (s, a) => {
        s.transactions = a.payload || [];
      })
      .addCase(topUpWallet.fulfilled, (s, a) => {
        s.wallet = a.payload;
      })
      .addCase(transferWallet.fulfilled, (s, a) => {
        if (a.payload?.to) s.wallet = { ...s.wallet, ...a.payload.to };
      });
  },
});

export default walletSlice.reducer;