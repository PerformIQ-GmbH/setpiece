import { createRoot } from "react-dom/client";
import { setBaseUrl } from "@workspace/api-client-react";
import App from "./App";
import { captureSignupAttribution } from "./lib/signup-attribution";
import "./index.css";

setBaseUrl("");
captureSignupAttribution();

createRoot(document.getElementById("root")!).render(<App />);
