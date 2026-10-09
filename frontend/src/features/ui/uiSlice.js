import { createSlice, nanoid } from '@reduxjs/toolkit';

const initialState = {
  toasts: [], // [{ id, type, message }]
  sidebarOpen: false,
  reduceMotion: false,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    pushToast: {
      reducer: (state, action) => {
        state.toasts.push(action.payload);
      },
      prepare: ({ type = 'info', message, ttl = 4000 }) => ({
        payload: { id: nanoid(), type, message, ttl },
      }),
    },
    dismissToast: (state, action) => {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },
    setReduceMotion: (state, action) => {
      state.reduceMotion = action.payload;
    },
    toggleSidebar: (state, action) => {
      state.sidebarOpen =
        action.payload === undefined ? !state.sidebarOpen : action.payload;
    },
  },
});

export const { pushToast, dismissToast, setReduceMotion, toggleSidebar } =
  uiSlice.actions;
export default uiSlice.reducer;