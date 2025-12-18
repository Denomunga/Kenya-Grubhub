import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

console.log("Starting app...");

const rootElement = document.getElementById("root");

if (!rootElement) {
  console.error("Failed to find root element!");
  throw new Error("Root element not found. Make sure you have a div with id='root' in your index.html");
}

console.log("Rendering app...");
const root = createRoot(rootElement);
root.render(<App />);
console.log("App rendered!");
