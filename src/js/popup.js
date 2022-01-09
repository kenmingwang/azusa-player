import "../css/popup.css";
import {App} from "./popup/App";
import React from "react";
import { render } from "react-dom";

render(
  <App/>,
  window.document.getElementById("app-container")
);
