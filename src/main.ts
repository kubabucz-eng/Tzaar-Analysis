import { App } from "./app/App";
import "./styles.css";

const root = document.getElementById("app");
if (!root) {
  throw new Error('Missing #app root element');
}

// Starts on an empty board; a game arrives when the user opens a file.
new App(root);
