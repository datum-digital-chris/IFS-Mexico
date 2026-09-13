/**
 * Spanish label → icon, for the application grids.
 *
 * The US site authors an icon name onto every item of an applications block.
 * These lists are extracted copy with no such field, so the icon is matched
 * from the label: the lists are overwhelmingly nouns naming a thing that gets
 * coated, and the icon library (145 line-art marks, copied from that site's
 * `public/icons/`) is built around exactly those things.
 *
 * Matching is on a normalised label — accents stripped, lowercased — against
 * the longest phrase first, so "muebles de exterior" beats "muebles".
 *
 * A list only renders as an icon grid when most of its items match; the rest
 * keep the brand check, because a benefit ("Excelente adherencia") is not a
 * thing and there is no honest icon for it.
 */

/** phrase → icon slug. Longest phrase wins, so order here does not matter. */
const ICONS = {
  // vehicles and their parts
  ruedas: "wheel",
  bicicletas: "bicycle",
  motocicletas: "motorbike",
  "autos de carreras": "hot-rod",
  "kits de autos": "car",
  "piezas de automoviles": "car",
  "partes automotrices": "car",
  "partes debajo del cofre": "auto-underhood",
  "parte inferior de la carroceria": "car",
  "piezas de la parte inferior": "car",
  remolques: "trailer",
  trailers: "trailer",
  trailer: "trailer",
  tapiceria: "furniture",

  // architectural
  "muro cortina": "curtain-wall",
  "pared de ventana": "window",
  ventanas: "window",
  puertas: "door",
  "puertas de madera": "door",
  montantes: "window",
  paneles: "arch-panel",
  "elementos de fachada": "arch-panel",
  extrusiones: "louver",
  molduras: "arch-panel",
  barandilla: "handrail",
  pasamanos: "handrail",
  cerca: "fence",
  vallas: "fence",
  "revestimiento residencial": "home",
  toldos: "awning",
  "rejas y puertas enrollables": "roller-door",
  escaparate: "storefront",
  "escaparate comercial": "storefront",
  "interiores para venta minorista": "retail-display",
  skylight: "skylight",
  persianas: "louver",

  // furniture and interiors
  muebles: "furniture",
  "muebles de oficina": "office-desk",
  "muebles de exterior": "garden-furniture",
  "mueble para exteriores": "garden-furniture",
  "muebles de bano": "bathroom-hardware",
  "asientos de estadio": "stadium",
  estanteria: "shelving",
  "armarios metalicos": "cabinet",
  gabinetes: "cabinet",
  "gabinetes de cocina": "cabinet",
  "gabinetes de garaje": "cabinet",
  "taquillas y buzones": "locker",
  banos: "restroom",
  "estructuras de banos": "restroom",
  "piezas decorativas": "picture-frame",

  // appliances
  "electrodomesticos de cocina": "oven-range",
  "ropa blanca": "washing-machine",
  lavadoras: "washing-machine",
  secadoras: "dryer",
  refrigeradores: "fridge",
  hornos: "oven-range",
  microondas: "microwave",
  lavavajillas: "dishwasher",
  "maquinas expendedoras": "vending-machine",
  "campanas de cocina": "kitchen-hood",
  "cafeteras": "coffee-machine",

  // lighting and electrical
  "accesorios de iluminacion": "light-bulb",
  "aparatos de iluminacion": "light-bulb",
  iluminacion: "light-bulb",
  "bandejas electricas": "electrical-enclosure",
  "cajas de bateria": "battery-box",
  "tanques transformadores": "transformer-tank",

  // industrial and infrastructure
  "barra de refuerzo": "rebar",
  "varillas de refuerzo": "rebar",
  puentes: "bridge",
  "maquinaria agricola": "agricultural-equipment",
  "equipos de cesped y jardin": "lawn-and-patio",
  "equipos de juegos y recreacion": "playground",
  "puertas y equipos de juego": "playground",
  "material deportivo y recreativo": "fitness-equipment",
  "herramientas manuales": "power-tool",
  "herramientas electricas": "power-tool",
  "productos de alambre": "wire-goods",
  "tela de alambre": "wire-goods",
  "tuberia de agua": "pipe-fitting",
  "tuberia de aceite": "pipe-fitting",
  "tanques de propano": "propane-tank",
  "torres de agua": "water-tower",
  "torres de cerveza": "beer-tower",
  "marcos de metal": "grid",
  "barcos y naves": "boat",
  "equipo marino": "marine",
  "equipo medico": "hospital",
  hospitales: "hospital",
  laboratorios: "beaker",
  "cajas de herramientas": "toolbox",
  estacionamiento: "parking-garage",
  tuneles: "tunnel",
  "accesorios de fontaneria": "faucet",
  "ferreteria de laton": "stainless-hardware",
  "transporte publico": "public-transit",
  senalizacion: "signage",
  "juegos infantiles": "playground",
  "equipos de gimnasia": "fitness-equipment",
  parteluces: "window",
  "uso arquitectonico": "arch-panel",
  "instalaciones y accesorios": "cog",
  "estructuras de acero": "grid",
  "postes de alumbrado": "street-light",
  carretillas: "forklift",
  montacargas: "forklift",
  "equipo de construccion": "excavator",
  "maquinaria pesada": "bulldozer",
  tractores: "tractor",
  "articulos de alambre": "wire-goods",
  "revestimientos de tuberias": "pipe-fitting",
};

const PHRASES = Object.keys(ICONS).sort((a, b) => b.length - a.length);

/** Lowercase, accents stripped, punctuation collapsed. */
export const normalise = (label) =>
  String(label ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** The icon for a label, or null where no honest match exists. */
export function iconFor(label) {
  const text = normalise(label);
  if (!text) return null;
  for (const phrase of PHRASES) if (text.includes(phrase)) return ICONS[phrase];
  return null;
}

/** A list renders as an icon grid only when most of it matches. */
export const ICON_LIST_THRESHOLD = 0.6;
