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

// set some sensible defaults (commands may override when drawing)
ctx.lineCap = "round";
ctx.lineJoin = "round";
ctx.strokeStyle = "black";

// ==========================================================
//  Drawing State — now holds DisplayCommand objects
// ==========================================================
type Point = { x: number; y: number };

// ------------- command interface -------------
interface DisplayCommand {
  display(ctx: CanvasRenderingContext2D): void;
}

// ------------- MarkerCommand replaces raw Point[][] -------------
class MarkerCommand implements DisplayCommand {
  points: Point[] = [];
  thickness: number;

  constructor(thickness = 2) {
    this.thickness = thickness;
  }

  // called while dragging to extend the stroke
  drag(x: number, y: number) {
    this.points.push({ x, y });
  }

  // draws this command to the canvas
  display(ctx: CanvasRenderingContext2D) {
    if (this.points.length === 0) return;
    // save/restore so we don't permanently change ctx state
    ctx.save();
    ctx.lineWidth = this.thickness;
    ctx.beginPath();
    ctx.moveTo(this.points[0].x, this.points[0].y);
    for (let i = 1; i < this.points.length; i++) {
      ctx.lineTo(this.points[i].x, this.points[i].y);
    }
    ctx.stroke();
    ctx.restore();
  }
}

// Display list and stacks now hold DisplayCommand objects
let displayList: DisplayCommand[] = [];
let redoStack: DisplayCommand[] = [];
let currentCommand: MarkerCommand | null = null;

// small helper for current marker thickness
const currentThickness = 2;

// ==========================================================
//  Redraw on “drawing-changed”
// ==========================================================
canvas.addEventListener("drawing-changed", () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const cmd of displayList) {
    cmd.display(ctx);
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
//  Mouse Events (create/extend MarkerCommand objects)
// ==========================================================
let isDrawing = false;

canvas.addEventListener("mousedown", (e) => {
  isDrawing = true;
  currentCommand = new MarkerCommand(currentThickness);
  displayList.push(currentCommand);
  redoStack = []; // clear redo stack when new action starts
  const { x, y } = getMousePos(e);
  currentCommand.drag(x, y);
  canvas.dispatchEvent(new Event("drawing-changed"));
});

canvas.addEventListener("mousemove", (e) => {
  if (!isDrawing || !currentCommand) return;
  const { x, y } = getMousePos(e);
  currentCommand.drag(x, y);
  canvas.dispatchEvent(new Event("drawing-changed"));
});

canvas.addEventListener("mouseup", () => {
  isDrawing = false;
  currentCommand = null; // stop holding reference to finished command
});
canvas.addEventListener("mouseout", () => {
  isDrawing = false;
  currentCommand = null;
});

// ==========================================================
//  Buttons: Clear, Undo, Redo (work with commands now)
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
