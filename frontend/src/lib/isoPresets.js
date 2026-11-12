import { createIsoSeasonalPresets } from "./isoSeasonalPresets";

/** Compact personal rooms: group useful furniture first, then fit the floor.
 * Shared public places and their capacity live separately in commonRooms.js.
 * Coordinates remain explicit so access, support and facing can be reviewed. */
export function createIsoPresets(defaultIsoSize) {
  return {
    home: {
      label: "Shared home",
      icon: "🏡",
      size: { w: 9, d: 8, env: "room", wallColors: { left: "#8b7974", right: "#666c79" }, lighting: "golden" },
      items: [
        // Two coordinated window workstations.
        { item: "desk", gx: 0, gy: 1.5, rot: 1, tint: "#bb9674" },
        { item: "computer", gx: 0, gy: 2, rot: 1 },
        { item: "deskchair", gx: 1, gy: 2, rot: 3, tint: "#78998d" },
        { item: "desk", gx: 0, gy: 4.5, rot: 1, tint: "#bb9674" },
        { item: "computer", gx: 0, gy: 5, rot: 1 },
        { item: "deskchair", gx: 1, gy: 5, rot: 3, tint: "#78998d" },
        { item: "resident", gx: 1, gy: 5, tint: "#78998d" },
        // Shared sleeping and storage wall.
        { item: "bed", gx: 7, gy: 0, tint: "#78998d" },
        { item: "nightstand", gx: 6, gy: 0, tint: "#bb9674" },
        { item: "tablelamp", gx: 6, gy: 0, tint: "#dfc591" },
        { item: "wardrobe", gx: 4.5, gy: 0, tint: "#bb9674" },
        { item: "bookshelf", gx: 0, gy: 0, tint: "#bb9674" },
        // One small lounge.
        { item: "squarerug", gx: 4, gy: 4.5, tint: "#aa8b7c" },
        { item: "sofa", gx: 4, gy: 4, tint: "#78998d" },
        { item: "coffeetable", gx: 4.5, gy: 5.5, tint: "#bb9674" },
        { item: "floorlamp", gx: 6.5, gy: 4.5, tint: "#dfc591" },
        { item: "fern", gx: 6.5, gy: 6 },
        { item: "cat", gx: 4, gy: 6.5 },
        // Light and one wall accent.
        { item: "bigwindow", gx: 0, gy: 4.5, rot: 1 },
        { item: "frame", gx: 2.5, gy: 0, tint: "#aa8b7c" },
      ],
    },
    loft: {
      label: "Loft",
      icon: "⭐",
      size: { w: 8, d: 6, wallColors: { left: "#6f566e", right: "#4b425d" }, lighting: "golden" },
      items: [
        // Window workstation and books.
        { item: "desk", gx: 0, gy: 1.5, rot: 1, tint: "#7f9ec9" },
        { item: "computer", gx: 0, gy: 2, rot: 1 },
        { item: "deskchair", gx: 1, gy: 2, rot: 3, tint: "#7f9ec9" },
        { item: "bookshelf", gx: 0, gy: 0 },
        // Sleeping bay.
        { item: "bed", gx: 6, gy: 0, tint: "#7f9ec9" },
        { item: "nightstand", gx: 5, gy: 0.5 },
        { item: "tablelamp", gx: 5, gy: 0.5, tint: "#e2c69b" },
        // One conversation group.
        { item: "squarerug", gx: 3, gy: 3, tint: "#8a7ac2" },
        { item: "sofa", gx: 3, gy: 2.5, tint: "#7f9ec9" },
        { item: "coffeetable", gx: 3, gy: 4 },
        { item: "armchair", gx: 5, gy: 4, rot: 3, tint: "#7f9ec9" },
        { item: "floorlamp", gx: 6, gy: 3.5 },
        // Soft edges.
        { item: "bigwindow", gx: 2.5, gy: 0 },
        { item: "pennant", gx: 4.5, gy: 0, tint: "#5b6b9b" },
        { item: "fern", gx: 0.5, gy: 4.5 },
        { item: "cat", gx: 2, gy: 4.5, tint: "#2c2438" },
      ],
    },
    classic: {
      label: "Cozy study",
      icon: "🕯️",
      size: { w: 7, d: 6, wallColors: { left: "#8a7562", right: "#6f6658" }, lighting: "golden" },
      items: [
        // The window desk is the primary seat.
        { item: "desk", gx: 0, gy: 1.5, rot: 1, tint: "#b78d67" },
        { item: "computer", gx: 0, gy: 2, rot: 1 },
        { item: "deskchair", gx: 1, gy: 2, rot: 3, tint: "#71806c" },
        { item: "desklamp", gx: 0, gy: 1.5, tint: "#c68d59" },
        // Books and daylight.
        { item: "bookshelf", gx: 3, gy: 0, tint: "#9b7659" },
        { item: "frame", gx: 1.5, gy: 0, tint: "#a56f5e" },
        { item: "bigwindow", gx: 5, gy: 0 },
        // A single reading corner.
        { item: "squarerug", gx: 3.5, gy: 3, tint: "#a76f60" },
        { item: "armchair", gx: 4, gy: 3.5, tint: "#70806a" },
        { item: "sidetable", gx: 5.5, gy: 3.5, tint: "#a87c59" },
        { item: "tablelamp", gx: 5.5, gy: 3.5, tint: "#d2a164" },
        { item: "cat", gx: 3, gy: 5 },
        { item: "monstera", gx: 6, gy: 4.5 },
      ],
    },
    cabin: {
      label: "Cozy cabin",
      icon: "🪵",
      size: { w: 8, d: 6, wallColors: { left: "#765242", right: "#59423b" }, lighting: "candle" },
      items: [
        // Hearth, sleeping and storage wall.
        { item: "fireplace", gx: 3, gy: 0 },
        { item: "bed", gx: 6, gy: 0 },
        { item: "nightstand", gx: 5, gy: 0 },
        { item: "candle", gx: 5, gy: 0 },
        { item: "wardrobe", gx: 0, gy: 0 },
        { item: "bookshelf", gx: 1.5, gy: 0 },
        // The lounge faces both the table and the hearth.
        { item: "squarerug", gx: 1.5, gy: 3 },
        { item: "sofa", gx: 2, gy: 4, rot: 2, tint: "#8baba0" },
        { item: "coffeetable", gx: 2.5, gy: 2.5 },
        { item: "armchair", gx: 1, gy: 2.5, rot: 1, tint: "#8baba0" },
        { item: "mug", gx: 2.5, gy: 2.5 },
        // A fireside companion and window dressing.
        { item: "dog", gx: 3.5, gy: 1.5 },
        { item: "curtain", gx: 0, gy: 1, rot: 1 },
        { item: "frame", gx: 0, gy: 4, rot: 1 },
      ],
    },
    garden: {
      label: "Secret garden",
      icon: "🌿",
      size: { w: 9, d: 7, env: "garden" },
      items: [
        // One pond and its water-facing seat.
        { item: "pond", gx: 3.5, gy: 1.5 },
        { item: "bench", gx: 4, gy: 5, rot: 2 },
        { item: "log", gx: 6, gy: 5, rot: 2 },
        // A framed garden edge.
        { item: "blossomtree", gx: 0.5, gy: 0 },
        { item: "tree", gx: 7.5, gy: 0 },
        { item: "bush", gx: 0.5, gy: 3.5 },
        { item: "flowers", gx: 1.5, gy: 2 },
        { item: "flowerbed", gx: 7.5, gy: 4.5 },
        // A short approach and one companion.
        { item: "gardentrail", gx: 0.5, gy: 5 },
        { item: "lantern", gx: 2.5, gy: 4.5 },
        { item: "bunny", gx: 7.5, gy: 5.5 },
      ],
    },
    cafeteria: {
      label: "Corner café",
      icon: "🥐",
      size: { w: 7, d: 6, env: "cafe", wallColors: { left: "#8d5947", right: "#68433f" }, lighting: "golden" },
      items: [
        // A short counter with a real staff aisle behind it.
        { item: "barcounter", gx: 4, gy: 1.5 },
        { item: "barcounter", gx: 5, gy: 1.5 },
        { item: "coffeecounter", gx: 6, gy: 1.5 },
        { item: "pastrycase", gx: 4, gy: 1.5 },
        { item: "till", gx: 5, gy: 1.5 },
        { item: "shelf", gx: 5, gy: 0 },
        { item: "fridge", gx: 6, gy: 0 },
        // One served two-person table.
        { item: "persianrug", gx: 1, gy: 2, rot: 1, tint: "#7a4034" },
        { item: "cafetable", gx: 1.5, gy: 3 },
        { item: "chair", gx: 2, gy: 2 },
        { item: "chair", gx: 2, gy: 4.5, rot: 2 },
        { item: "orchid", gx: 1.5, gy: 3 },
        { item: "resident", gx: 2, gy: 4.5, tint: "#6fb8cf" },
        // Entrance and shop identity.
        { item: "doorway", gx: 0.5, gy: 0 },
        { item: "menuboard", gx: 2.5, gy: 0 },
        { item: "monstera", gx: 6, gy: 4.5 },
      ],
    },
    plantshop: {
      label: "Plant shop",
      icon: "🪴",
      size: { w: 9, d: 7, env: "cafe", wallColors: { left: "#58735f", right: "#3f5d52" }, lighting: "natural" },
      items: [
        // The proprietor has a genuine potting seat.
        { item: "diningtable", gx: 0, gy: 1.5, rot: 1, tint: "#9a7959" },
        { item: "woodstool", gx: 1.5, gy: 2, rot: 3 },
        { item: "seedtray", gx: 0, gy: 1.5 },
        { item: "wateringcan", gx: 0, gy: 2.5 },
        // A single stocked perimeter.
        { item: "plantshelf", gx: 4.5, gy: 0.5, tint: "#6c5d46" },
        { item: "plantshelf", gx: 6, gy: 0.5, tint: "#a87c57" },
        { item: "plantshelf", gx: 7.5, gy: 0.5, tint: "#6c5d46" },
        { item: "plantshelf", gx: 0, gy: 4, rot: 1, tint: "#6c5d46" },
        // One display island.
        { item: "diningtable", gx: 4, gy: 3.5, tint: "#9a7959" },
        { item: "orchid", gx: 4, gy: 3.5, tint: "#a87591" },
        { item: "succulent", gx: 5, gy: 4, tint: "#c7775b" },
        // A short checkout and an open browsing route.
        { item: "barcounter", gx: 1.5, gy: 5.5, tint: "#9a7959" },
        { item: "barcounter", gx: 2.5, gy: 5.5, tint: "#9a7959" },
        { item: "till", gx: 1.5, gy: 5.5 },
        { item: "monstera", gx: 7.5, gy: 4.5 },
        { item: "bigwindow", gx: 2, gy: 0 },
        { item: "menuboard", gx: 0, gy: 0, tint: "#466b54" },
      ],
    },
    library: {
      label: "Reading room",
      icon: "📚",
      size: { w: 8, d: 6, env: "library" },
      items: [
        // One window writing desk.
        { item: "desk", gx: 0, gy: 1.5, rot: 1, tint: "#9b7659" },
        { item: "computer", gx: 0, gy: 2, rot: 1 },
        { item: "deskchair", gx: 1, gy: 2, rot: 3, tint: "#70806a" },
        { item: "desklamp", gx: 0, gy: 1.5, tint: "#d9b178" },
        // Books stay on an L-shaped wall run.
        { item: "bookshelf", gx: 0, gy: 0, tint: "#5c3a2c" },
        { item: "bookshelf", gx: 1.5, gy: 0, tint: "#5c3a2c" },
        { item: "bookshelf", gx: 3, gy: 0, tint: "#5c3a2c" },
        { item: "bookcase", gx: 0, gy: 4, rot: 1, tint: "#6b4a39" },
        { item: "bigwindow", gx: 5, gy: 0 },
        // One comfortable reading seat.
        { item: "squarerug", gx: 4, gy: 3, tint: "#8a5346" },
        { item: "armchair", gx: 5.5, gy: 3.5, tint: "#70806a" },
        { item: "sidetable", gx: 4, gy: 3.5, tint: "#6b4a39" },
        { item: "tablelamp", gx: 4, gy: 3.5, tint: "#d9b178" },
        { item: "cat", gx: 3, gy: 5, tint: "#3a2a24" },
        { item: "fern", gx: 7, gy: 5 },
      ],
    },
    hall: {
      label: "Study studio",
      icon: "🧑‍🤝‍🧑",
      size: { w: 8, d: 6, env: "library" },
      items: [
        // One shared table for one or two people.
        { item: "persianrug", gx: 2.5, gy: 1.5, rot: 1, tint: "#8f4a3c" },
        { item: "diningtable", gx: 3, gy: 2.5 },
        { item: "chair", gx: 3.5, gy: 1.5 },
        { item: "chair", gx: 3.5, gy: 4, rot: 2 },
        { item: "bookstack", gx: 3, gy: 2.5 },
        { item: "mug", gx: 4, gy: 3 },
        { item: "desklamp", gx: 4, gy: 2.5 },
        // A short storage run and a simple reading seat.
        { item: "bookcase", gx: 0, gy: 0 },
        { item: "bookcase", gx: 0, gy: 4, rot: 1 },
        { item: "armchair", gx: 6, gy: 4, tint: "#7faf8f" },
        { item: "floorlamp", gx: 7, gy: 4 },
        // Daylight, a noticeboard and soft edges.
        { item: "bigwindow", gx: 4.5, gy: 0 },
        { item: "corkboard", gx: 2, gy: 0 },
        { item: "monstera", gx: 6.5, gy: 1 },
        { item: "cat", gx: 1.5, gy: 5 },
      ],
    },
    terrace: {
      label: "Terrace",
      icon: "🪴",
      size: { w: 8, d: 6, env: "terrace" },
      items: [
        // One outdoor dining group.
        { item: "persianrug", gx: 2.5, gy: 1.5, rot: 1, tint: "#9a665d" },
        { item: "diningtable", gx: 3, gy: 2.5, tint: "#9b7659" },
        { item: "woodstool", gx: 3.5, gy: 1.5 },
        { item: "woodstool", gx: 3.5, gy: 4, rot: 2 },
        { item: "candelabra", gx: 3.5, gy: 2.5, tint: "#b88a58" },
        { item: "mug", gx: 3, gy: 3, tint: "#d9c5ac" },
        // Planting follows the sheltered edge.
        { item: "hedge", gx: 0, gy: 0 },
        { item: "hedge", gx: 2, gy: 0 },
        { item: "fern", gx: 0.5, gy: 1.5 },
        { item: "bonsai", gx: 6.5, gy: 0.5 },
        { item: "plant", gx: 6.5, gy: 2.5 },
        // A lit approach.
        { item: "lantern", gx: 1.5, gy: 3.5 },
        { item: "cat", gx: 6.5, gy: 4.5 },
      ],
    },
    ...createIsoSeasonalPresets(),
    empty: {
      label: "Empty room",
      icon: "🫙",
      size: defaultIsoSize,
      items: [],
    },
  };
}
