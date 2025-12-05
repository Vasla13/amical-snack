import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { CartProvider } from "./context/CartContext.jsx"; // <--- Import

import { FeedbackProvider } from "./context/FeedbackContext.jsx";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <FeedbackProvider>
          <CartProvider>
            <App />
          </CartProvider>
        </FeedbackProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
