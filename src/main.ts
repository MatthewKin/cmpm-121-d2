// import exampleIconUrl from "./noun-paperclip-7598668-00449F.png";
import "./style.css";

// document.body.innerHTML = `
//   <p>Example image asset: <img src="${exampleIconUrl}" class="icon" /></p>
// `;

const appTitle = document.createElement("h1");
appTitle.textContent = "The Really Cool And Epic Canvas";
document.body.prepend(appTitle);

const canvas = document.createElement("canvas");
canvas.width = 256;
canvas.height = 256;
canvas.id = "game-canvas"; // helpful for styling or debugging
document.body.appendChild(canvas);
