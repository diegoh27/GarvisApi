import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import App from "./app/App";
import { store } from "./store";
import "./style.css";

const container = document.querySelector("#app");

if (!container) {
	throw new Error("No se encontro el contenedor #app");
}

createRoot(container).render(
	<Provider store={store}>
		<App />
	</Provider>,
);
