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

// --- Button containers ---
const actionContainer = document.createElement("div");
actionContainer.classList.add("button-container");
document.body.appendChild(actionContainer);

const toolContainer = document.createElement("div");
toolContainer.classList.add("button-container");
document.body.appendChild(toolContainer);

// --- Buttons (Row 1) ---
const clearButton = document.createElement("button");
clearButton.textContent = "Clear";
actionContainer.appendChild(clearButton);

const undoButton = document.createElement("button");
undoButton.textContent = "Undo";
actionContainer.appendChild(undoButton);

const redoButton = document.createElement("button");
redoButton.textContent = "Redo";
actionContainer.appendChild(redoButton);

// --- Marker tool buttons (Row 2) ---
const thinButton = document.createElement("button");
thinButton.textContent = "Thin Marker";
toolContainer.appendChild(thinButton);

const thickButton = document.createElement("button");
thickButton.textContent = "Thick Marker";
toolContainer.appendChild(thickButton);

// ==========================================================
//  Canvas Setup
// ==========================================================
const ctx = canvas.getContext("2d");
if (!ctx) throw new Error("2D context not supported");
ctx.lineCap = "round";
ctx.lineJoin = "round";
ctx.strokeStyle = "black";

// ==========================================================
//  Drawing State
// ==========================================================
type Point = { x: number; y: number };

interface DisplayCommand {
  display(ctx: CanvasRenderingContext2D): void;
}

// MarkerCommand represents one drawn line
class MarkerCommand implements DisplayCommand {
  points: Point[] = [];
  thickness: number;

  constructor(thickness = 2) {
    this.thickness = thickness;
  }

  drag(x: number, y: number) {
    this.points.push({ x, y });
  }

  display(ctx: CanvasRenderingContext2D) {
    if (this.points.length === 0) return;
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

// ToolPreview displays a circle where the tool will draw
class ToolPreview implements DisplayCommand {
  x: number;
  y: number;
  thickness: number;

  constructor(x: number, y: number, thickness: number) {
    this.x = x;
    this.y = y;
    this.thickness = thickness;
  }

  display(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.strokeStyle = "gray";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.thickness / 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

let displayList: DisplayCommand[] = [];
let redoStack: DisplayCommand[] = [];
let currentCommand: MarkerCommand | null = null;

// NEW: current tool preview object
let currentPreview: ToolPreview | null = null;

// tool state
let currentThickness = 2;

// ==========================================================
//  Redraw on “drawing-changed”
// ==========================================================
canvas.addEventListener("drawing-changed", () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const cmd of displayList) cmd.display(ctx);

  // draw preview if not drawing
  if (!isDrawing && currentPreview) currentPreview.display(ctx);

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
  currentCommand = new MarkerCommand(currentThickness);
  displayList.push(currentCommand);
  redoStack = [];
  const { x, y } = getMousePos(e);
  currentCommand.drag(x, y);
  canvas.dispatchEvent(new Event("drawing-changed"));
});

canvas.addEventListener("mousemove", (e) => {
  const { x, y } = getMousePos(e);

  // Always fire tool-moved event
  canvas.dispatchEvent(
    new CustomEvent("tool-moved", { detail: { x, y } }),
  );

  if (!isDrawing || !currentCommand) return;
  currentCommand.drag(x, y);
  canvas.dispatchEvent(new Event("drawing-changed"));
});

canvas.addEventListener("mouseup", () => {
  isDrawing = false;
  currentCommand = null;
  canvas.dispatchEvent(new Event("drawing-changed"));
});

canvas.addEventListener("mouseout", () => {
  isDrawing = false;
  currentPreview = null;
  canvas.dispatchEvent(new Event("drawing-changed"));
});

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
//  Marker Tool Selection
// ==========================================================
function selectTool(thickness: number, selectedButton: HTMLButtonElement) {
  currentThickness = thickness;

  for (const btn of [thinButton, thickButton]) {
    btn.classList.remove("selectedTool");
  }
  selectedButton.classList.add("selectedTool");
}

// default selected tool
selectTool(2, thinButton);

// hook up buttons
thinButton.addEventListener("click", () => selectTool(2, thinButton));
thickButton.addEventListener("click", () => selectTool(6, thickButton));

// ==========================================================
//  Tool Preview Handling (NEW)
// ==========================================================
canvas.addEventListener("tool-moved", (e: Event) => {
  const { x, y } = (e as CustomEvent).detail;
  if (!isDrawing) {
    currentPreview = new ToolPreview(x, y, currentThickness);
  }
  canvas.dispatchEvent(new Event("drawing-changed"));
});

// ==========================================================
//  Initial UI State
// ==========================================================
canvas.dispatchEvent(new Event("drawing-changed"));
