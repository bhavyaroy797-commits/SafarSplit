import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import App from './App';

import authReducer from './features/auth/authSlice';
import tripsReducer from './features/trips/tripsSlice';
import itineraryReducer from './features/itinerary/itinerarySlice';
import expensesReducer from './features/expenses/expensesSlice';
import walletReducer from './features/wallet/walletSlice';
import uiReducer from './features/ui/uiSlice';

import './styles/index.css';

const store = configureStore({
  reducer: {
    auth: authReducer,
    trips: tripsReducer,
    itinerary: itineraryReducer,
    expenses: expensesReducer,
    wallet: walletReducer,
    ui: uiReducer,
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>
);