// Bento Layout Generator — main plugin code
// Builds grid or preset "bento" compositions with spans.

// Basic message types from UI
interface GeneratePayload {
  preset: PresetKey;
  width: number; // parent frame width
  height: number; // parent frame height
  rows: number; // for grid/custom
  cols: number; // for grid/custom
  gap: number;
  padding: number;
  radius: number;
  addShadow: boolean;
  palette: PaletteKey;
  labelStyle: 'none' | 'numbers' | 'letters';
}

type PresetKey = 'grid' | 'golden' | 'heroRight' | 'heroLeft' | 'masonry6';

type PaletteKey = 'neutral' | 'sunset' | 'mint' | 'ocean' | 'grape' | 'mono';

// A cell definition in the bento composition
interface CellSpan {
  row: number; // 0-based
  col: number; // 0-based
  rowSpan: number;
  colSpan: number;
}

// Preset registry
const PRESETS: Record<
  PresetKey,
  (
    rows: number,
    cols: number
  ) => { rows: number; cols: number; cells: CellSpan[] }
> = {
  grid: (r, c) => ({
    rows: r,
    cols: c,
    cells: Array.from({ length: r * c }, (_, i) => ({
      row: Math.floor(i / c),
      col: i % c,
      rowSpan: 1,
      colSpan: 1,
    })),
  }),

  // 3x3 with one 2x2 hero top-left
  golden: () => ({
    rows: 3,
    cols: 3,
    cells: [
      { row: 0, col: 0, rowSpan: 2, colSpan: 2 }, // hero
      { row: 0, col: 2, rowSpan: 1, colSpan: 1 },
      { row: 1, col: 2, rowSpan: 1, colSpan: 1 },
      { row: 2, col: 0, rowSpan: 1, colSpan: 1 },
      { row: 2, col: 1, rowSpan: 1, colSpan: 1 },
      { row: 2, col: 2, rowSpan: 1, colSpan: 1 },
    ],
  }),

  // 3x4, hero on the right spanning 2x3
  heroRight: () => ({
    rows: 3,
    cols: 4,
    cells: [
      { row: 0, col: 2, rowSpan: 3, colSpan: 2 }, // hero right
      { row: 0, col: 0, rowSpan: 1, colSpan: 1 },
      { row: 0, col: 1, rowSpan: 1, colSpan: 1 },
      { row: 1, col: 0, rowSpan: 1, colSpan: 2 },
      { row: 2, col: 0, rowSpan: 1, colSpan: 1 },
      { row: 2, col: 1, rowSpan: 1, colSpan: 1 },
    ],
  }),

  // 3x4, hero on the left spanning 2x3
  heroLeft: () => ({
    rows: 3,
    cols: 4,
    cells: [
      { row: 0, col: 0, rowSpan: 3, colSpan: 2 }, // hero left
      { row: 0, col: 2, rowSpan: 1, colSpan: 1 },
      { row: 0, col: 3, rowSpan: 1, colSpan: 1 },
      { row: 1, col: 2, rowSpan: 1, colSpan: 2 },
      { row: 2, col: 2, rowSpan: 1, colSpan: 1 },
      { row: 2, col: 3, rowSpan: 1, colSpan: 1 },
    ],
  }),

  // 3x4 visually balanced 6 cards with varied spans
  masonry6: () => ({
    rows: 3,
    cols: 4,
    cells: [
      { row: 0, col: 0, rowSpan: 2, colSpan: 2 },
      { row: 0, col: 2, rowSpan: 1, colSpan: 2 },
      { row: 1, col: 2, rowSpan: 1, colSpan: 1 },
      { row: 1, col: 3, rowSpan: 2, colSpan: 1 },
      { row: 2, col: 0, rowSpan: 1, colSpan: 1 },
      { row: 2, col: 1, rowSpan: 1, colSpan: 1 },
    ],
  }),
};

// Palettes (linear interpolation will generate variety)
const PALETTES: Record<PaletteKey, RGB[]> = {
  neutral: [rgb(0.95), rgb(0.9), rgb(0.85), rgb(0.8), rgb(0.75)],
  mono: [rgb(0.1), rgb(0.18), rgb(0.26), rgb(0.34), rgb(0.42)],
  sunset: [
    hex('#FF7A59'),
    hex('#FFB65C'),
    hex('#FFD36A'),
    hex('#E86BF5'),
    hex('#9A6BFF'),
  ],
  mint: [
    hex('#00EBA8'),
    hex('#7FFFD4'),
    hex('#2ED7A6'),
    hex('#A6FFE3'),
    hex('#11C5A1'),
  ],
  ocean: [
    hex('#0EA5E9'),
    hex('#38BDF8'),
    hex('#22D3EE'),
    hex('#0284C7'),
    hex('#14B8A6'),
  ],
  grape: [
    hex('#8B5CF6'),
    hex('#A78BFA'),
    hex('#C084FC'),
    hex('#7C3AED'),
    hex('#6D28D9'),
  ],
};

function hex(h: string): RGB {
  const r = parseInt(h.slice(1, 3), 16) / 255;
  const g = parseInt(h.slice(3, 5), 16) / 255;
  const b = parseInt(h.slice(5, 7), 16) / 255;
  return { r, g, b };
}

function rgb(v: number): RGB {
  return { r: v, g: v, b: v };
}

function paint(color: RGB): Paint {
  return { type: 'SOLID', color };
}

// ---- Core generation ----
async function generateBento(p: GeneratePayload) {
  const preset = PRESETS[p.preset](p.rows, p.cols);
  const { rows, cols, cells } = preset;

  const width = p.width;
  const height = p.height;
  const gap = p.gap;
  const padding = p.padding;
  const radius = p.radius;

  const gridWidth = width - padding * 2 - gap * (cols - 1);
  const gridHeight = height - padding * 2 - gap * (rows - 1);

  const unitW = gridWidth / cols;
  const unitH = gridHeight / rows;

  // Parent container
  const frame = figma.createFrame();
  frame.name = 'Bento';
  frame.resizeWithoutConstraints(width, height);
  frame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  frame.cornerRadius = 16;
  frame.clipsContent = false;
  frame.x = figma.viewport.center.x - width / 2;
  frame.y = figma.viewport.center.y - height / 2;

  // Optional soft shadow for cards
  const cardEffect: Effect[] = p.addShadow
    ? [
        {
          type: 'DROP_SHADOW',
          color: { r: 0, g: 0, b: 0, a: 0.08 },
          offset: { x: 0, y: 6 },
          radius: 16,
          spread: 0,
          visible: true,
          blendMode: 'NORMAL',
        },
      ]
    : [];

  // Fill map for variety
  const palette = PALETTES[p.palette];

  // Background padding area is simulated by placing children inside and offsetting by padding
  // We'll position children absolutely

  const taken: boolean[] = []; // for potential future overlap checks

  const labels: SceneNode[] = [];

  for (let i = 0; i < cells.length; i++) {
    const c = cells[i];
    const x = padding + c.col * (unitW + gap);
    const y = padding + c.row * (unitH + gap);
    const w = c.colSpan * unitW + (c.colSpan - 1) * gap;
    const h = c.rowSpan * unitH + (c.rowSpan - 1) * gap;

    const card = figma.createFrame();
    card.name = `Card ${i + 1}`;
    card.x = x;
    card.y = y;
    card.resizeWithoutConstraints(w, h);
    card.cornerRadius = radius;
    card.fills = [paint(palette[i % palette.length])];
    card.effects = cardEffect;

    // Make it a small auto-layout to host content later
    card.layoutMode = 'VERTICAL';
    card.primaryAxisSizingMode = 'AUTO';
    card.counterAxisSizingMode = 'AUTO';
    card.paddingLeft = card.paddingRight = 16;
    card.paddingTop = card.paddingBottom = 16;
    card.itemSpacing = 8;

    // Optional label
    if (p.labelStyle !== 'none') {
      const label = figma.createText();
      label.name = 'Label';
      try {
        await figma.loadFontAsync({ family: 'Inter', style: 'Bold' });
      } catch {}
      label.characters =
        p.labelStyle === 'numbers' ? `${i + 1}` : String.fromCharCode(65 + i);
      label.fontSize = 16;
      label.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
      card.appendChild(label);
      labels.push(label);
    }

    frame.appendChild(card);
  }

  figma.currentPage.selection = [frame];
  figma.viewport.scrollAndZoomIntoView([frame]);
}

// Message handling
figma.ui.onmessage = (msg) => {
  if (msg.type === 'generate') {
    generateBento(msg.payload as GeneratePayload).then(() =>
      figma.closePlugin()
    );
  }

  if (msg.type === 'relaunch') {
    figma.closePlugin();
  }
};

// Show UI
figma.showUI(__html__, { width: 360, height: 500, themeColors: true });
