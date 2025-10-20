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

const stickerContainer = document.createElement("div");
stickerContainer.classList.add("button-container");
document.body.appendChild(stickerContainer);

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

// --- Sticker buttons (Row 3 - NEW) ---
const fishButton = document.createElement("button");
fishButton.textContent = "🐟";
stickerContainer.appendChild(fishButton);

const flowerButton = document.createElement("button");
flowerButton.textContent = "🌸";
stickerContainer.appendChild(flowerButton);

const smileButton = document.createElement("button");
smileButton.textContent = "😀";
stickerContainer.appendChild(smileButton);

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
  constructor(public x: number, public y: number, public thickness: number) {}
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

// StickerCommand draws a placed emoji (NEW)
class StickerCommand implements DisplayCommand {
  constructor(public x: number, public y: number, public emoji: string) {}
  display(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.font = "24px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.emoji, this.x, this.y);
    ctx.restore();
  }
}

// StickerPreview displays the emoji under the cursor (NEW)
class StickerPreview implements DisplayCommand {
  constructor(public x: number, public y: number, public emoji: string) {}
  display(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.font = "24px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.emoji, this.x, this.y);
    ctx.restore();
  }
}

let displayList: DisplayCommand[] = [];
let redoStack: DisplayCommand[] = [];
let currentCommand: MarkerCommand | null = null;
let currentPreview: DisplayCommand | null = null;

// tool state
let currentThickness = 2;
let currentTool: "marker" | "sticker" = "marker";
let currentSticker = "🐟";

// ==========================================================
//  Redraw on “drawing-changed”
// ==========================================================
canvas.addEventListener("drawing-changed", () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const cmd of displayList) cmd.display(ctx);

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
  const { x, y } = getMousePos(e);

  if (currentTool === "marker") {
    isDrawing = true;
    currentCommand = new MarkerCommand(currentThickness);
    displayList.push(currentCommand);
    redoStack = [];
    currentCommand.drag(x, y);
  }

  canvas.dispatchEvent(new Event("drawing-changed"));
});

canvas.addEventListener("mousemove", (e) => {
  const { x, y } = getMousePos(e);

  // Always fire tool-moved event
  canvas.dispatchEvent(new CustomEvent("tool-moved", { detail: { x, y } }));

  if (isDrawing && currentCommand) {
    currentCommand.drag(x, y);
    canvas.dispatchEvent(new Event("drawing-changed"));
  }
});

canvas.addEventListener("mouseup", (e) => {
  const { x, y } = getMousePos(e);

  if (currentTool === "marker") {
    isDrawing = false;
    currentCommand = null;
  } else if (currentTool === "sticker") {
    // ✨ Sticker now drops on mouse release
    displayList.push(new StickerCommand(x, y, currentSticker));
    redoStack = [];
  }

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
  currentTool = "marker";
  currentThickness = thickness;

  for (
    const btn of [
      thinButton,
      thickButton,
      fishButton,
      flowerButton,
      smileButton,
    ]
  ) {
    btn.classList.remove("selectedTool");
  }
  selectedButton.classList.add("selectedTool");
}

selectTool(2, thinButton);
thinButton.addEventListener("click", () => selectTool(2, thinButton));
thickButton.addEventListener("click", () => selectTool(6, thickButton));

// ==========================================================
//  Sticker Tool Selection (NEW)
// ==========================================================
function selectSticker(emoji: string, selectedButton: HTMLButtonElement) {
  currentTool = "sticker";
  currentSticker = emoji;

  for (
    const btn of [
      thinButton,
      thickButton,
      fishButton,
      flowerButton,
      smileButton,
    ]
  ) {
    btn.classList.remove("selectedTool");
  }
  selectedButton.classList.add("selectedTool");
}

fishButton.addEventListener("click", () => selectSticker("🐟", fishButton));
flowerButton.addEventListener("click", () => selectSticker("🌸", flowerButton));
smileButton.addEventListener("click", () => selectSticker("😀", smileButton));

// ==========================================================
//  Tool Preview Handling
// ==========================================================
canvas.addEventListener("tool-moved", (e: Event) => {
  const { x, y } = (e as CustomEvent).detail;

  if (!isDrawing) {
    if (currentTool === "marker") {
      currentPreview = new ToolPreview(x, y, currentThickness);
    } else if (currentTool === "sticker") {
      currentPreview = new StickerPreview(x, y, currentSticker);
    }
  }

  canvas.dispatchEvent(new Event("drawing-changed"));
});

// ==========================================================
//  Initial UI State
// ==========================================================
canvas.dispatchEvent(new Event("drawing-changed"));
