// Show the UI to the user
figma.showUI(__html__, {
  width: 500,
  height: 700,
  title: 'Color Style Generator',
});

// --- Types ---
type HSL = [number, number, number];
type ColorWeight =
  | '50'
  | '100'
  | '200'
  | '300'
  | '400'
  | '500'
  | '600'
  | '700'
  | '800'
  | '900'
  | '950';

// --- Constants for the adaptive algorithm ---
const TARGET_LIGHTNESS: Record<ColorWeight, number> = {
  '50': 0.97,
  '100': 0.94,
  '200': 0.86,
  '300': 0.76,
  '400': 0.65,
  '500': 0.54,
  '600': 0.43,
  '700': 0.32,
  '800': 0.22,
  '900': 0.13,
  '950': 0.06,
};
const TARGET_SATURATION: Record<ColorWeight, number> = {
  '50': 0.8,
  '100': 0.85,
  '200': 0.9,
  '300': 0.95,
  '400': 1.0,
  '500': 1.0,
  '600': 1.0,
  '700': 0.98,
  '800': 0.95,
  '900': 0.9,
  '950': 0.85,
};
const ALL_WEIGHTS: ColorWeight[] = [
  '50',
  '100',
  '200',
  '300',
  '400',
  '500',
  '600',
  '700',
  '800',
  '900',
  '950',
];

// --- Main Message Handler ---
figma.ui.onmessage = async (msg: { type: string; [key: string]: any }) => {
  // --- Palette Generation Handler ---
  if (msg.type === 'generate-palette') {
    const { name, hex } = msg;
    const collection = figma.variables.createVariableCollection('UI Colors');

    const baseColorRgb = hexToRgb(hex);
    if (!baseColorRgb) {
      figma.notify('Invalid hex code provided.', { error: true });
      return;
    }

    const [inputH, inputS, inputL] = rgbToHsl(
      baseColorRgb.r,
      baseColorRgb.g,
      baseColorRgb.b
    );

    // Find the closest weight for the input color
    let baseWeight: ColorWeight = '500';
    let minLightnessDiff = Infinity;
    for (const weight of ALL_WEIGHTS) {
      const diff = Math.abs(inputL - TARGET_LIGHTNESS[weight]);
      if (diff < minLightnessDiff) {
        minLightnessDiff = diff;
        baseWeight = weight;
      }
    }

    // Calculate the difference between the input color and the "ideal" color at that weight
    const lightnessDelta = inputL - TARGET_LIGHTNESS[baseWeight];
    const saturationDelta = inputS - TARGET_SATURATION[baseWeight] * inputS;

    // Generate the full palette and create styles
    for (const weight of ALL_WEIGHTS) {
      const hue = inputH;
      const newLightness = TARGET_LIGHTNESS[weight] + lightnessDelta;
      const newSaturation =
        TARGET_SATURATION[weight] * inputS + saturationDelta;

      const clampedL = Math.max(0, Math.min(1, newLightness));
      const clampedS = Math.max(0, Math.min(1, newSaturation));

      const newRgbArray = hslToRgb(hue, clampedS, clampedL);
      const newRgb: RGB = {
        r: newRgbArray[0],
        g: newRgbArray[1],
        b: newRgbArray[2],
      };

      // Create a Figma Paint Style for each color
      const style = figma.createPaintStyle();
      style.name = `UI Colors/${name}/${weight}`;
      style.paints = [
        {
          type: 'SOLID',
          color: { r: newRgb.r / 255, g: newRgb.g / 255, b: newRgb.b / 255 },
        },
      ];

      const colorVariable = figma.variables.createVariable(
        `${name}/${weight}`,
        collection,
        'COLOR'
      );
      const lightModeId = collection.modes[0].modeId;

      colorVariable.setValueForMode(lightModeId, {
        r: newRgb.r / 255,
        g: newRgb.g / 255,
        b: newRgb.b / 255,
      });
    }

    figma.notify(`🎨 "${name}" styles created in the "UI Colors" group!`);
    figma.closePlugin();
  }
};

// --- Color Conversion Utilities ---
function hexToRgb(hex: string): RGB | null {
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    ((1 << 24) + (r << 16) + (g << 8) + b)
      .toString(16)
      .slice(1)
      .padStart(6, '0')
  );
}

function rgbToHsl(r: number, g: number, b: number): HSL {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h = 0,
    s = 0,
    l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}
