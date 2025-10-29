import "./style.css";

// ==========================================================
//  UI Setup
// ==========================================================
const appTitle = document.createElement("h1");
appTitle.textContent = "The Garden Sketchbook 🌿";
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
  color: string;

  constructor(thickness = 2, color = "black") {
    this.thickness = thickness;
    this.color = color;
  }

  drag(x: number, y: number) {
    this.points.push({ x, y });
  }

  display(ctx: CanvasRenderingContext2D) {
    if (this.points.length === 0) return;
    ctx.save();
    ctx.lineWidth = this.thickness;
    ctx.strokeStyle = this.color;
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
  constructor(
    public x: number,
    public y: number,
    public thickness: number,
    public color: string,
  ) {}
  display(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.thickness / 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

// StickerCommand draws a placed emoji (NEW)
class StickerCommand implements DisplayCommand {
  constructor(
    public x: number,
    public y: number,
    public emoji: string,
    public rotation: number,
  ) {}
  display(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate((this.rotation * Math.PI) / 180);
    ctx.font = "32px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.emoji, 0, 0);
    ctx.restore();
  }
}

// StickerPreview displays the emoji under the cursor (NEW)
class StickerPreview implements DisplayCommand {
  constructor(
    public x: number,
    public y: number,
    public emoji: string,
    public rotation: number,
  ) {}
  display(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.translate(this.x, this.y);
    ctx.rotate((this.rotation * Math.PI) / 180);
    ctx.font = "24px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.emoji, 0, 0);
    ctx.restore();
  }
}

let displayList: DisplayCommand[] = [];
let redoStack: DisplayCommand[] = [];
let currentCommand: MarkerCommand | null = null;
let currentPreview: DisplayCommand | null = null;

// ==========================================================
//  Tool State
// ==========================================================
let currentThickness = 2;
let currentTool: "marker" | "sticker" = "marker";
let currentSticker = "🌻";
let currentStickerRotation = 0;
let currentMarkerColor = "black";

// Helper: random color and rotation
function getRandomColor() {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 90%, 55%)`;
}
function getRandomRotation() {
  return Math.random() * 360;
}

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
    currentCommand = new MarkerCommand(currentThickness, currentMarkerColor);
    displayList.push(currentCommand);
    redoStack = [];
    currentCommand.drag(x, y);
  }

  canvas.dispatchEvent(new Event("drawing-changed"));
});

canvas.addEventListener("mousemove", (e) => {
  const { x, y } = getMousePos(e);

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
    displayList.push(
      new StickerCommand(x, y, currentSticker, currentStickerRotation),
    );
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
//  Export Button (Step 10)
// ==========================================================
const exportButton = document.createElement("button");
exportButton.textContent = "Export PNG";
actionContainer.appendChild(exportButton);

exportButton.addEventListener("click", () => {
  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = 1024;
  exportCanvas.height = 1024;
  const exportCtx = exportCanvas.getContext("2d");
  if (!exportCtx) return;

  exportCtx.scale(4, 4);
  for (const cmd of displayList) cmd.display(exportCtx);

  const link = document.createElement("a");
  link.download = "garden-sketch.png";
  link.href = exportCanvas.toDataURL("image/png");
  link.click();
});

// ==========================================================
//  Marker Tool Selection
// ==========================================================
function selectTool(thickness: number, selectedButton: HTMLButtonElement) {
  currentTool = "marker";
  currentThickness = thickness;
  currentMarkerColor = getRandomColor(); // randomize each time tool selected

  for (const btn of document.querySelectorAll("button")) {
    btn.classList.remove("selectedTool");
  }
  selectedButton.classList.add("selectedTool");

  canvas.dispatchEvent(new Event("drawing-changed"));
}

selectTool(2, thinButton);
thinButton.addEventListener("click", () => selectTool(2, thinButton));
thickButton.addEventListener("click", () => selectTool(6, thickButton));

// ==========================================================
//  Sticker Buttons (Garden Theme)
// ==========================================================
const gardenStickers = [
  "🌻",
  "🌷",
  "🌿",
  "🍄",
  "🌞",
  "🦋",
  "🐝",
  "🍃",
  "🌼",
  "🌸",
];

function renderStickerButtons() {
  stickerContainer.innerHTML = "";
  gardenStickers.forEach((emoji) => {
    const btn = document.createElement("button");
    btn.textContent = emoji;
    stickerContainer.appendChild(btn);
    btn.addEventListener("click", () => selectSticker(emoji, btn));
  });
}
renderStickerButtons();

// ==========================================================
//  Sticker Tool Selection with Random Rotation
// ==========================================================
function selectSticker(emoji: string, selectedButton: HTMLButtonElement) {
  currentTool = "sticker";
  currentSticker = emoji;
  currentStickerRotation = getRandomRotation(); // random rotation

  for (const btn of document.querySelectorAll("button")) {
    btn.classList.remove("selectedTool");
  }
  selectedButton.classList.add("selectedTool");

  canvas.dispatchEvent(new Event("drawing-changed"));
}

// ==========================================================
//  Tool Preview Handling
// ==========================================================
canvas.addEventListener("tool-moved", (e: Event) => {
  const { x, y } = (e as CustomEvent).detail;

  if (!isDrawing) {
    if (currentTool === "marker") {
      currentPreview = new ToolPreview(
        x,
        y,
        currentThickness,
        currentMarkerColor,
      );
    } else if (currentTool === "sticker") {
      currentPreview = new StickerPreview(
        x,
        y,
        currentSticker,
        currentStickerRotation,
      );
    }
  }

  canvas.dispatchEvent(new Event("drawing-changed"));
});

// ==========================================================
//  Initial UI State
// ==========================================================
canvas.dispatchEvent(new Event("drawing-changed"));
