import "./style.css";

// ==========================================================
//  UI Setup
// ==========================================================
const appTitle = document.createElement("h1");
appTitle.textContent = "The Really Cool And Epic Canvas";
document.body.prepend(appTitle);

const canvas = document.createElement("canvas");
canvas.width = 256;
canvas.height = 256;
canvas.id = "game-canvas";
document.body.appendChild(canvas);

const clearButton = document.createElement("button");
clearButton.textContent = "Clear";
clearButton.style.display = "block";
clearButton.style.margin = "10px auto";
clearButton.style.padding = "8px 16px";
document.body.appendChild(clearButton);

// ==========================================================
//  Canvas Setup
// ==========================================================
const ctx = canvas.getContext("2d");
if (!ctx) throw new Error("2D context not supported");

ctx.lineWidth = 2;
ctx.lineCap = "round";
ctx.lineJoin = "round";
ctx.strokeStyle = "black";

// ==========================================================
//  Drawing State
// ==========================================================
type Point = { x: number; y: number };
let displayList: Point[][] = []; // Each stroke is an array of points
let currentStroke: Point[] | null = null;

// ==========================================================
//  Event: Redraw on “drawing-changed”
// ==========================================================
canvas.addEventListener("drawing-changed", () => {
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const stroke of displayList) {
    if (stroke.length === 0) continue;
    ctx.beginPath();
    ctx.moveTo(stroke[0].x, stroke[0].y);
    for (let i = 1; i < stroke.length; i++) {
      ctx.lineTo(stroke[i].x, stroke[i].y);
    }
    ctx.stroke();
  }
});

// ==========================================================
//  Helper: Get Mouse Position
// ==========================================================
function getMousePos(e: MouseEvent): Point {
  const rect = canvas.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

// ==========================================================
//  Mouse Events
// ==========================================================
let isDrawing = false;

canvas.addEventListener("mousedown", (e) => {
  isDrawing = true;
  currentStroke = [];
  displayList.push(currentStroke);
  currentStroke.push(getMousePos(e));
  canvas.dispatchEvent(new Event("drawing-changed"));
});

canvas.addEventListener("mousemove", (e) => {
  if (!isDrawing || !currentStroke) return;
  currentStroke.push(getMousePos(e));
  canvas.dispatchEvent(new Event("drawing-changed"));
});

canvas.addEventListener("mouseup", () => (isDrawing = false));
canvas.addEventListener("mouseout", () => (isDrawing = false));

// ==========================================================
//  Clear Button
// ==========================================================
clearButton.addEventListener("click", () => {
  displayList = [];
  canvas.dispatchEvent(new Event("drawing-changed"));
});
