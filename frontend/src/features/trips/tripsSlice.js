import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { tripsApi } from '../../services/api';

export const fetchTrips = createAsyncThunk('trips/fetchAll', async () => {
  return tripsApi.list();
});

export const fetchTrip = createAsyncThunk('trips/fetchOne', async (tripId) => {
  return tripsApi.get(tripId);
});

export const createTrip = createAsyncThunk('trips/create', async (body) => {
  return tripsApi.create(body);
});

export const updateTrip = createAsyncThunk(
  'trips/update',
  async ({ tripId, patch }) => {
    return tripsApi.update(tripId, patch);
  }
);

export const deleteTrip = createAsyncThunk('trips/delete', async (tripId) => {
  await tripsApi.remove(tripId);
  return tripId;
});

export const joinTrip = createAsyncThunk('trips/join', async (joinCode) => {
  return tripsApi.join(joinCode);
});

const initialState = {
  list: [],
  current: null,
  status: 'idle',
  error: null,
};

const tripsSlice = createSlice({
  name: 'trips',
  initialState,
  reducers: {
    clearCurrentTrip: (state) => {
      state.current = null;
    },
    clearTripsError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTrips.pending, (s) => {
        s.status = 'loading';
        s.error = null;
      })
      .addCase(fetchTrips.fulfilled, (s, a) => {
        s.status = 'idle';
        s.list = a.payload || [];
      })
      .addCase(fetchTrips.rejected, (s, a) => {
        s.status = 'error';
        s.error = a.error.message;
      })
      .addCase(fetchTrip.pending, (s) => {
        s.status = 'loading';
      })
      .addCase(fetchTrip.fulfilled, (s, a) => {
        s.status = 'idle';
        s.current = a.payload;
      })
      .addCase(fetchTrip.rejected, (s, a) => {
        s.status = 'error';
        s.error = a.error.message;
      })
      .addCase(createTrip.fulfilled, (s, a) => {
        s.list.unshift(a.payload);
      })
      .addCase(updateTrip.fulfilled, (s, a) => {
        const idx = s.list.findIndex((t) => t.id === a.payload.id);
        if (idx >= 0) s.list[idx] = { ...s.list[idx], ...a.payload };
        if (s.current?.id === a.payload.id) {
          s.current = { ...s.current, ...a.payload };
        }
      })
      .addCase(deleteTrip.fulfilled, (s, a) => {
        s.list = s.list.filter((t) => t.id !== a.payload);
        if (s.current?.id === a.payload) s.current = null;
      })
      .addCase(joinTrip.fulfilled, () => {
        // caller refetches trips
      });
  },
});

export const { clearCurrentTrip, clearTripsError } = tripsSlice.actions;
export default tripsSlice.reducer;