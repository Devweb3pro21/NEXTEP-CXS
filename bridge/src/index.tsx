import React from 'react';
import ReactDOM from 'react-dom';
// import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
// import reportWebVitals from './reportWebVitals';
// import { NotificationContainer } from "react-notifications";
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import Slice from './reducer'
const store = configureStore({ reducer: Slice.reducer });

// import 'react-notifications/lib/notifications.css';

ReactDOM.render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>,
  document.getElementById('root')
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
// reportWebVitals();
