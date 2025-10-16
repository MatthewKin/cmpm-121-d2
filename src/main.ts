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
canvas.id = "game-canvas";
document.body.appendChild(canvas);

const ctx = canvas.getContext("2d");

if (!ctx) {
  throw new Error(
    "Failed to get 2D context — your browser may not support it.",
  );
}

ctx.lineWidth = 2;
ctx.lineCap = "round";
ctx.strokeStyle = "black";
ctx.lineJoin = "round";

let isDrawing = false;

// Mouse down - start drawing
canvas.addEventListener("mousedown", (e) => {
  isDrawing = true;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  ctx.beginPath();
  ctx.moveTo(x, y);
});

// Mouse move - draw line if mouse is down
canvas.addEventListener("mousemove", (e) => {
  if (isDrawing) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke(); // Make the line visible
  }
});

// Stop drawing when mouse leaves or button is released
canvas.addEventListener("mouseup", () => {
  isDrawing = false;
});

canvas.addEventListener("mouseout", () => {
  isDrawing = false;
});

const clearButton = document.createElement("button");
clearButton.textContent = "Clear";
clearButton.style.display = "block";
clearButton.style.margin = "10px auto";
clearButton.style.padding = "8px 16px";
document.body.appendChild(clearButton);

clearButton.addEventListener("click", () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
});
