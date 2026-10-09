import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authApi } from '../../services/api';
import { LS } from '../../utils/constants';

function persist(user, token) {
  if (token) localStorage.setItem(LS.TOKEN, token);
  if (user) localStorage.setItem(LS.USER, JSON.stringify(user));
}

function clear() {
  localStorage.removeItem(LS.TOKEN);
  localStorage.removeItem(LS.USER);
}

const cachedUser = (() => {
  try {
    const raw = localStorage.getItem(LS.USER);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
})();

export const registerUser = createAsyncThunk(
  'auth/register',
  async (payload) => {
    const data = await authApi.register(payload);
    persist(data.user, data.token);
    return data;
  }
);

export const loginUser = createAsyncThunk('auth/login', async (payload) => {
  const data = await authApi.login(payload);
  persist(data.user, data.token);
  return data;
});

export const fetchMe = createAsyncThunk('auth/fetchMe', async () => {
  const user = await authApi.me();
  persist(user, null);
  return user;
});

export const updateMe = createAsyncThunk('auth/updateMe', async (payload) => {
  const user = await authApi.updateMe(payload);
  persist(user, null);
  return user;
});

const initialState = {
  user: cachedUser,
  token: localStorage.getItem(LS.TOKEN) || null,
  status: 'idle', // idle | loading | error
  error: null,
  bootstrapped: !!cachedUser,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.error = null;
      clear();
    },
    clearAuthError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(registerUser.pending, (s) => {
        s.status = 'loading';
        s.error = null;
      })
      .addCase(registerUser.fulfilled, (s, a) => {
        s.status = 'idle';
        s.user = a.payload.user;
        s.token = a.payload.token;
        s.bootstrapped = true;
      })
      .addCase(registerUser.rejected, (s, a) => {
        s.status = 'error';
        s.error = a.error.message;
      })
      .addCase(loginUser.pending, (s) => {
        s.status = 'loading';
        s.error = null;
      })
      .addCase(loginUser.fulfilled, (s, a) => {
        s.status = 'idle';
        s.user = a.payload.user;
        s.token = a.payload.token;
        s.bootstrapped = true;
      })
      .addCase(loginUser.rejected, (s, a) => {
        s.status = 'error';
        s.error = a.error.message;
      })
      .addCase(fetchMe.pending, (s) => {
        s.status = 'loading';
      })
      .addCase(fetchMe.fulfilled, (s, a) => {
        s.status = 'idle';
        s.user = a.payload;
        s.bootstrapped = true;
      })
      .addCase(fetchMe.rejected, (s) => {
        s.status = 'idle';
        s.user = null;
        s.token = null;
        s.bootstrapped = true;
        clear();
      })
      .addCase(updateMe.fulfilled, (s, a) => {
        s.user = a.payload;
      });
  },
});

export const { logout, clearAuthError } = authSlice.actions;
export default authSlice.reducer;