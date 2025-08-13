// Basic unit conversion utilities for US -> Swedish metric display
// Note: This is a best-effort converter for common cooking units.

export type UnitSystem = "us" | "sv";

const FRACTION_MAP: Record<string, number> = {
  "1/2": 0.5,
  "1/3": 1 / 3,
  "2/3": 2 / 3,
  "1/4": 0.25,
  "3/4": 0.75,
  "1/8": 0.125,
  "3/8": 0.375,
  "5/8": 0.625,
  "7/8": 0.875,
};

function parseQuantity(q: string): number | null {
  // Handles: "1", "1.5", "1 1/2", "1/2"
  const trimmed = q.trim();
  if (!trimmed) return null;
  if (FRACTION_MAP[trimmed] != null) return FRACTION_MAP[trimmed];
  if (trimmed.includes(" ")) {
    const [a, b] = trimmed.split(" ").map((s) => s.trim());
    const aNum = Number(a.replace(",", "."));
    if (!isNaN(aNum)) {
      const bVal = FRACTION_MAP[b] ?? Number(b.replace(",", "."));
      if (!isNaN(bVal)) return aNum + bVal;
      return aNum;
    }
  }
  const direct = Number(trimmed.replace(",", "."));
  return isNaN(direct) ? null : direct;
}

function formatNumber(n: number): string {
  // Keep 0-2 decimals, trim trailing zeros
  const str = n.toFixed(n < 10 ? 2 : 1);
  return str.replace(/\.0+$/, "").replace(/(\.[1-9])0$/, "$1");
}

// Conversion factors
// Volume
const CUP_TO_DL = 2.3658823659; // 1 cup = 236.588 ml = 2.3659 dl
const TBSP_TO_ML = 15; // msk
const TSP_TO_ML = 5; // tsk
const FLOZ_TO_ML = 29.5735;
const PINT_TO_L = 0.473176;
const QUART_TO_L = 0.946353;
const GALLON_TO_L = 3.78541;

// Weight
const OZ_TO_G = 28.3495;
const LB_TO_KG = 0.453592;

const UNIT_PATTERNS: Array<{
  regex: RegExp;
  handler: (qty: number, unit: string) => { qty: number; unit: string };
}> = [
  // cups -> dl
  {
    regex: /\b(cups?|c)\b/i,
    handler: (qty) => ({ qty: qty * CUP_TO_DL, unit: "dl" }),
  },
  // tbsp -> msk
  {
    regex: /\b(tablespoons?|tbsp|tbs)\b/i,
    handler: (qty) => ({ qty: qty * TBSP_TO_ML, unit: "msk" }),
  },
  // tsp -> tsk
  {
    regex: /\b(teaspoons?|tsp)\b/i,
    handler: (qty) => ({ qty: qty * TSP_TO_ML, unit: "tsk" }),
  },
  // fl oz -> ml
  {
    regex: /\b(fl\.?\s*oz|fluid\s*ounces?)\b/i,
    handler: (qty) => ({ qty: qty * FLOZ_TO_ML, unit: "ml" }),
  },
  // pint -> l
  {
    regex: /\b(pints?|pt)\b/i,
    handler: (qty) => ({ qty: qty * PINT_TO_L, unit: "l" }),
  },
  // quart -> l
  {
    regex: /\b(quarts?|qt)\b/i,
    handler: (qty) => ({ qty: qty * QUART_TO_L, unit: "l" }),
  },
  // gallon -> l
  {
    regex: /\b(gallons?|gal)\b/i,
    handler: (qty) => ({ qty: qty * GALLON_TO_L, unit: "l" }),
  },
  // oz (weight) -> g
  {
    regex: /\b(oz|ounces?)\b/i,
    handler: (qty) => ({ qty: qty * OZ_TO_G, unit: "g" }),
  },
  // lb -> kg
  {
    regex: /\b(lbs?|pounds?)\b/i,
    handler: (qty) => ({ qty: qty * LB_TO_KG, unit: "kg" }),
  },
];

// Try to detect a leading quantity and unit and convert it. Example inputs:
// "1 cup sugar", "1 1/2 tbsp olive oil", "8 oz cheddar", "2 tsp salt"
export function convertIngredientUnitsToSwedish(line: string): string {
  try {
    const m = line.match(/^\s*([\d ,.\/]+)\s+([a-zA-Z.\s]+)\s+(.*)$/);
    if (!m) return line; // nothing to convert
    const [, qtyRaw, unitRaw, rest] = m;
    const qty = parseQuantity(qtyRaw);
    if (qty == null) return line;

    for (const pattern of UNIT_PATTERNS) {
      if (pattern.regex.test(unitRaw)) {
        const { qty: newQty, unit } = pattern.handler(qty, unitRaw);
        let display = `${formatNumber(newQty)} ${unit}`;
        // Prefer ml→dl or l with nicer thresholds
        if (unit === "msk" || unit === "tsk") {
          display = `${formatNumber(newQty)} ${unit}`; // qty is ml but label is msk/tsk; acceptable for display
        }
        if (unit === "ml") {
          // 100 ml = 1 dl; show dl when >= 100 ml
          if (newQty >= 100) {
            const dl = newQty / 100;
            const rounded = Math.round(dl * 2) / 2; // round to nearest 0.5 dl
            display = `${formatNumber(rounded)} dl`;
          } else {
            display = `${formatNumber(newQty)} ml`;
          }
        }
        // Ensure dl values are rounded nicely to 0.5 steps (e.g., 2.37 dl -> 2.5 dl)
        if (unit === "dl") {
          const rounded = Math.round(newQty * 2) / 2;
          display = `${formatNumber(rounded)} dl`;
        }
        if (unit === "g") {
          if (newQty >= 1000) {
            const kg = newQty / 1000;
            display = `${formatNumber(kg)} kg`;
          } else {
            display = `${formatNumber(newQty)} g`;
          }
        }
        if (unit === "l") {
          if (newQty < 1) {
            const ml = newQty * 1000;
            display = `${formatNumber(ml)} ml`;
          } else {
            display = `${formatNumber(newQty)} l`;
          }
        }
        return `${display} ${rest}`.trim();
      }
    }
    return line;
  } catch {
    return line;
  }
}

export function localizeUnitLabel(unit: string | null, lang: "en" | "sv"): string | null {
  if (!unit) return unit;
  if (lang === "en") return unit;
  const map: Record<string, string> = {
    cup: "dl",
    cups: "dl",
    tbsp: "msk",
    tablespoon: "msk",
    tablespoons: "msk",
    tsp: "tsk",
    teaspoon: "tsk",
    teaspoons: "tsk",
    oz: "g",
    ounce: "g",
    ounces: "g",
    lb: "kg",
    lbs: "kg",
    pound: "kg",
    pounds: "kg",
    pint: "l",
    pints: "l",
    quart: "l",
    quarts: "l",
    gallon: "l",
    gallons: "l",
    ml: "ml",
    l: "l",
    g: "g",
    kg: "kg",
  };
  const k = unit.toLowerCase();
  return map[k] ?? unit;
}
