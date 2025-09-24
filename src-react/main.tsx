import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import debug from "./services/debugLogger";
import "./styles/index.css";

// Initialize basic debug logging
debug.log("general", "Initializing Radar application");

// Enable specific debug areas
debug.enable("radar"); // Enable radar animation logs
debug.enable("network"); // Enable network scanning logs
debug.enable("events"); // Enable event handling logs

// Initialize the React app
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
