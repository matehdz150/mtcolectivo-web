/* Generates the isometric line art of the small vans (same style as the design-system vehicles).
 * node scripts/gen-vehicles.cjs  → prints JSON { minivan, microbus } ({viewBox, svg}) */
const S = 4.4; // screen units per model unit
const C = 0.866;
const P = (l, w, h) => [(l + w) * C * S, ((w - l) * 0.5 - h) * S];
const f = (n) => n.toFixed(2);
const pts = (arr) => arr.map((p) => `${f(p[0])},${f(p[1])}`).join(" ");
const poly = (arr, cls) => `<polygon points="${pts(arr)}" class="${cls}"></polygon>`;
const line = (a, b, extra = "") => `<line x1="${f(a[0])}" y1="${f(a[1])}" x2="${f(b[0])}" y2="${f(b[1])}"${extra}></line>`;
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

function wheel(l, h, r, w) {
  const ring = (rad) => Array.from({ length: 28 }, (_, i) => P(l + Math.cos((i / 28) * 2 * Math.PI) * rad, w, h + Math.sin((i / 28) * 2 * Math.PI) * rad));
  return poly(ring(r), "f3") + poly(ring(r * 0.52), "f1");
}

function vehicle({ profile, W, windows, shield, rear, wheels, doors, lights, wr = 0.62 }) {
  let out = "";
  const n = profile.length;
  const faces = [];
  for (let i = 0; i < n; i++) {
    const [l0, h0] = profile[i];
    const [l1, h1] = profile[(i + 1) % n];
    // profile runs clockwise (front, hood, roof, rear); outward normal = (-dh, dl)
    if (h1 > h0 || l1 > l0) faces.push(i); // faces the front or the roof: visible from this angle
  }
  // far-to-near: roof/hood quads and then the near side
  for (const i of faces) {
    const [l0, h0] = profile[i];
    const [l1, h1] = profile[(i + 1) % n];
    const top = h1 > h0 && l1 === l0 ? "f3" : "f1";
    out += poly([P(l0, 0, h0), P(l1, 0, h1), P(l1, W, h1), P(l0, W, h0)], top);
  }
  out += poly(profile.map(([l, h]) => P(l, W, h)), "f2");

  // windshield on the sloped edge that rises the most
  if (shield !== undefined) {
    const [l0, h0] = profile[shield];
    const [l1, h1] = profile[shield + 1];
    const q = (t, w) => P(l0 + (l1 - l0) * t, w, h0 + (h1 - h0) * t);
    out += poly([q(0.12, 0.2), q(0.88, 0.2), q(0.88, W - 0.2), q(0.12, W - 0.2)], "f2");
  }
  // side windows
  for (const [a, b, c, d] of windows) out += poly([P(a, W, c), P(b, W, c), P(b, W, d), P(a, W, d)], "f2");
  // rear window
  if (rear) {
    const [l0, h0] = profile[rear];
    const [l1, h1] = profile[rear + 1];
    void l0; void h0; void l1; void h1;
  }
  // doors: thin vertical lines on the side
  for (const [l, h0, h1] of doors) out += line(P(l, W, h0), P(l, W, h1));
  // bumper + headlights on the front face
  out += poly([P(0, 0, 0.7), P(0, W, 0.7), P(0, W, 1.0), P(0, 0, 1.0)], "f1");
  for (const w of [0.3, W - 0.3 - lights]) out += poly([P(0, w, 1.15), P(0, w + lights, 1.15), P(0, w + lights, 1.5), P(0, w, 1.5)], "f1");
  out += line(P(0, 0.9, 1.3), P(0, W - 0.9, 1.3));
  // wheels (near side)
  for (const l of wheels) out += wheel(l, wr, wr, W + 0.02);
  // body sill line
  out += line(P(0.2, W, 0.95), P(profile[profile.length - 1][0] - 0.2, W, 0.95), ' stroke-opacity="0.45"');
  return out;
}

function pack(svg) {
  // bbox from numbers in points / x1.. attributes
  const xs = [];
  const ys = [];
  for (const m of svg.matchAll(/(-?\d+\.\d+),(-?\d+\.\d+)/g)) {
    xs.push(+m[1]);
    ys.push(+m[2]);
  }
  const x0 = Math.min(...xs) - 1.6;
  const y0 = Math.min(...ys) - 1.6;
  const w = Math.max(...xs) - Math.min(...xs) + 3.2;
  const h = Math.max(...ys) - Math.min(...ys) + 3.2;
  return { viewBox: `${f(x0)} ${f(y0)} ${f(w)} ${f(h)}`, svg: `<g fill="none" stroke="currentColor" stroke-width="0.48" stroke-linejoin="round" stroke-linecap="round">${svg}</g>` };
}

// 6 passengers: compact minivan, short and rounded
const minivan = pack(
  vehicle({
    W: 3.4,
    profile: [[0, 0.7], [0, 1.6], [1.5, 2.0], [3.0, 3.5], [6.0, 3.6], [7.4, 2.4], [7.6, 2.0], [7.6, 0.7]],
    shield: 2,
    windows: [[3.3, 4.6, 2.3, 3.3], [4.8, 6.0, 2.3, 3.3], [6.15, 7.0, 2.3, 3.1]],
    doors: [[4.7, 1.0, 3.4]],
    wheels: [1.7, 6.0],
    lights: 0.6,
  }),
);

// 20 passengers: long van with a high roof and a row of windows
const microbus = pack(
  vehicle({
    W: 3.8,
    profile: [[0, 0.7], [0, 1.9], [1.0, 2.4], [2.2, 4.3], [14.2, 4.5], [14.6, 4.1], [14.6, 0.7]],
    shield: 2,
    windows: [[2.6, 4.4, 2.6, 3.9], [4.7, 6.5, 2.6, 3.9], [6.8, 8.6, 2.6, 3.9], [8.9, 10.7, 2.6, 3.9], [11.0, 12.8, 2.6, 3.9], [13.1, 14.2, 2.6, 3.9]],
    doors: [[2.5, 1.0, 4.2], [13.0, 1.0, 4.2]],
    wheels: [2.4, 11.6],
    wr: 0.85,
    lights: 0.7,
  }),
);

// SUV: boxy, tall, short overhangs
const suv = pack(
  vehicle({
    W: 3.5,
    profile: [[0, 0.8], [0, 1.9], [1.4, 2.3], [2.8, 3.7], [7.6, 3.8], [8.0, 3.4], [8.0, 0.8]],
    shield: 2,
    windows: [[3.1, 4.6, 2.5, 3.5], [4.8, 6.4, 2.5, 3.5], [6.6, 7.7, 2.5, 3.4]],
    doors: [[4.7, 1.0, 3.6]],
    wheels: [1.7, 6.3],
    lights: 0.6,
    wr: 0.75,
  }),
);

// Midibus: a short bus, flat front, big windows
const midibus = pack(
  vehicle({
    W: 4.0,
    profile: [[0, 0.7], [0, 4.6], [0.3, 4.9], [14.4, 4.9], [14.6, 4.6], [14.6, 0.7]],
    shield: undefined,
    windows: [[2.4, 4.4, 2.5, 4.0], [4.7, 6.7, 2.5, 4.0], [7.0, 9.0, 2.5, 4.0], [9.3, 11.3, 2.5, 4.0], [11.6, 13.6, 2.5, 4.0]],
    doors: [[2.2, 1.0, 4.6]],
    wheels: [2.4, 11.8],
    lights: 0.7,
    wr: 0.9,
  }),
);

console.log(JSON.stringify({ minivan, microbus, suv, midibus }));
