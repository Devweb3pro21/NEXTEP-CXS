
import './App.scss';
import react, { useEffect, useState } from "react";
import Home from './Home';
import BlockchainProvider from "./context";
// import { NotificationContainer, NotificationManager } from "react-notifications";
import { BrowserRouter as Router, Routes, Route, Navigate, HashRouter } from "react-router-dom";
// import { HashRouter, Route, Routes, RouterProvider } from "react-router-dom";
// import "./assets/css/app.css"

function App() {

  return (
    <BlockchainProvider>
      <Router>
        <Routes>
          <Route path='/' element={<Home />} />
        </Routes>
      </Router>
    </BlockchainProvider>
  );

}

export default App;
