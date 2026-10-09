import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { itineraryApi, votesApi, aiApi } from '../../services/api';

export const fetchItinerary = createAsyncThunk(
  'itinerary/fetchAll',
  async (tripId) => itineraryApi.list(tripId)
);

export const createItem = createAsyncThunk(
  'itinerary/create',
  async ({ tripId, payload }) => itineraryApi.create(tripId, payload)
);

export const updateItem = createAsyncThunk(
  'itinerary/update',
  async ({ itemId, patch }) => itineraryApi.update(itemId, patch)
);

export const deleteItem = createAsyncThunk(
  'itinerary/delete',
  async ({ itemId }) => {
    await itineraryApi.remove(itemId);
    return itemId;
  }
);

export const reorderItems = createAsyncThunk(
  'itinerary/reorder',
  async ({ tripId, orderedItemIds, dayNumber }) => {
    await itineraryApi.reorder(tripId, orderedItemIds, dayNumber);
    return { orderedItemIds, dayNumber };
  }
);

export const castVote = createAsyncThunk(
  'itinerary/castVote',
  async ({ tripId, itemId, value }) =>
    votesApi.cast(tripId, { itemId, value })
);

export const removeVote = createAsyncThunk(
  'itinerary/removeVote',
  async ({ tripId, itemId }) => {
    await votesApi.remove(tripId, itemId);
    return itemId;
  }
);

export const generateWithAI = createAsyncThunk(
  'itinerary/generateWithAI',
  async ({ tripId, params }) => aiApi.generateItinerary(tripId, params)
);

export const replanWithAI = createAsyncThunk(
  'itinerary/replanWithAI',
  async ({ tripId, reason, affectedDayNumbers }) =>
    aiApi.replan(tripId, { reason, affectedDayNumbers })
);

export const explainStop = createAsyncThunk(
  'itinerary/explainStop',
  async ({ tripId, itemId }) => aiApi.explainStop(tripId, itemId)
);

const initialState = {
  items: [],
  votes: [], // [{item_id, user_id, value}]
  status: 'idle',
  aiStatus: 'idle', // idle | loading | error
  aiError: null,
  lastGenerated: null,
  error: null,
};

const itinerarySlice = createSlice({
  name: 'itinerary',
  initialState,
  reducers: {
    // Socket-driven live merge
    upsertFromSocket: (state, action) => {
      const item = action.payload;
      const idx = state.items.findIndex((i) => i.id === item.id);
      if (idx >= 0) state.items[idx] = item;
      else state.items.push(item);
      state.items.sort(
        (a, b) =>
          a.day_number - b.day_number || a.position - b.position
      );
    },
    removeFromSocket: (state, action) => {
      state.items = state.items.filter((i) => i.id !== action.payload);
    },
    voteFromSocket: (state, action) => {
      const { itemId, upvotes, downvotes } = action.payload;
      const item = state.items.find((i) => i.id === itemId);
      if (item) {
        item.upvotes = upvotes;
        item.downvotes = downvotes;
      }
    },
    clearAI: (state) => {
      state.lastGenerated = null;
      state.aiError = null;
      state.aiStatus = 'idle';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchItinerary.pending, (s) => {
        s.status = 'loading';
        s.error = null;
      })
      .addCase(fetchItinerary.fulfilled, (s, a) => {
        s.status = 'idle';
        s.items = a.payload || [];
      })
      .addCase(fetchItinerary.rejected, (s, a) => {
        s.status = 'error';
        s.error = a.error.message;
      })
      .addCase(createItem.fulfilled, (s, a) => {
        s.items.push(a.payload);
        s.items.sort(
          (a2, b2) =>
            a2.day_number - b2.day_number || a2.position - b2.position
        );
      })
      .addCase(updateItem.fulfilled, (s, a) => {
        const idx = s.items.findIndex((i) => i.id === a.payload.id);
        if (idx >= 0) s.items[idx] = a.payload;
      })
      .addCase(deleteItem.fulfilled, (s, a) => {
        s.items = s.items.filter((i) => i.id !== a.payload);
      })
      .addCase(castVote.fulfilled, (s, a) => {
        const item = s.items.find((i) => i.id === a.payload.id);
        if (item) {
          item.upvotes = a.payload.upvotes;
          item.downvotes = a.payload.downvotes;
        }
      })
      .addCase(generateWithAI.pending, (s) => {
        s.aiStatus = 'loading';
        s.aiError = null;
      })
      .addCase(generateWithAI.fulfilled, (s, a) => {
        s.aiStatus = 'idle';
        s.lastGenerated = a.payload;
      })
      .addCase(generateWithAI.rejected, (s, a) => {
        s.aiStatus = 'error';
        s.aiError = a.error.message;
      })
      .addCase(replanWithAI.pending, (s) => {
        s.aiStatus = 'loading';
        s.aiError = null;
      })
      .addCase(replanWithAI.fulfilled, (s, a) => {
        s.aiStatus = 'idle';
        s.lastGenerated = a.payload;
      })
      .addCase(replanWithAI.rejected, (s, a) => {
        s.aiStatus = 'error';
        s.aiError = a.error.message;
      });
  },
});

export const {
  upsertFromSocket,
  removeFromSocket,
  voteFromSocket,
  clearAI,
} = itinerarySlice.actions;
export default itinerarySlice.reducer;