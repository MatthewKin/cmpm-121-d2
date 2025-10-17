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

// --- Button container ---
const buttonContainer = document.createElement("div");
buttonContainer.style.display = "flex";
buttonContainer.style.justifyContent = "center";
buttonContainer.style.gap = "10px";
buttonContainer.style.marginTop = "12px";
document.body.appendChild(buttonContainer);

// --- Buttons ---
const clearButton = document.createElement("button");
clearButton.textContent = "Clear";
buttonContainer.appendChild(clearButton);

const undoButton = document.createElement("button");
undoButton.textContent = "Undo";
buttonContainer.appendChild(undoButton);

const redoButton = document.createElement("button");
redoButton.textContent = "Redo";
buttonContainer.appendChild(redoButton);

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
let displayList: Point[][] = []; // current strokes
let redoStack: Point[][] = []; // undone strokes
let currentStroke: Point[] | null = null;

// ==========================================================
//  Redraw on “drawing-changed”
// ==========================================================
canvas.addEventListener("drawing-changed", () => {
  ctx!.clearRect(0, 0, canvas.width, canvas.height);

  for (const stroke of displayList) {
    if (stroke.length === 0) continue;
    ctx!.beginPath();
    ctx!.moveTo(stroke[0].x, stroke[0].y);
    for (let i = 1; i < stroke.length; i++) {
      ctx!.lineTo(stroke[i].x, stroke[i].y);
    }
    ctx!.stroke();
  }

  // Disable buttons if nothing to undo/redo
  undoButton.disabled = displayList.length === 0;
  redoButton.disabled = redoStack.length === 0;
});

// ==========================================================
//  Helpers
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
  redoStack = []; // ✅ Clear redo stack when new stroke starts
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
//  Buttons: Clear, Undo, Redo
// ==========================================================
clearButton.addEventListener("click", () => {
  displayList = [];
  redoStack = [];
  canvas.dispatchEvent(new Event("drawing-changed"));
});

undoButton.addEventListener("click", () => {
  if (displayList.length === 0) return;
  const undone = displayList.pop();
  if (undone) redoStack.push(undone);
  canvas.dispatchEvent(new Event("drawing-changed"));
});

redoButton.addEventListener("click", () => {
  if (redoStack.length === 0) return;
  const redone = redoStack.pop();
  if (redone) displayList.push(redone);
  canvas.dispatchEvent(new Event("drawing-changed"));
});

// ==========================================================
//  Initial UI State
// ==========================================================
canvas.dispatchEvent(new Event("drawing-changed"));
