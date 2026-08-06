import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
// Mapbox checks at runtime that its stylesheet is present and renders a broken
// map if it is not. Code splitting had moved it into a chunk that raced the map
// JS, so it is imported here, in the entry, where it is always applied first.
import "mapbox-gl/dist/mapbox-gl.css";

createRoot(document.getElementById("root")!).render(<App />);
