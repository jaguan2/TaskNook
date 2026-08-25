/**
 * Seasonal showcase rooms. Keeping these together makes the growing seasonal
 * catalog independent from the everyday indoor presets.
 */
export function createIsoSeasonalPresets() {
  return {
  fall: {
    label: "Autumn yard",
    icon: "\u{1F342}",
    size: { w: 10, d: 8, env: "garden" },
    items: [
      // A copse at the back-left and one tree opposite, rather than three
      // spaced evenly across the skyline.
      { item: "mapletree", gx: 0.5, gy: 0 },
      { item: "mapletree", gx: 2.5, gy: 0.5, tint: "#c9762f" },
      { item: "birch", gx: 7.5, gy: 0, tint: "#c9a24b" },
      { item: "bush", gx: 0.5, gy: 3, tint: "#a8863a" },
      { item: "rock", gx: 9, gy: 2.5 },
      { item: "scarecrow", gx: 5.5, gy: 0.5, tint: "#a85a43" },
      // the job someone is halfway through, under the trees that shed it
      { item: "leafpile", gx: 3, gy: 2.5 },
      { item: "rake", gx: 4, gy: 2.5 },
      // the corner you actually sit in — the bench kept empty for you,
      // the dog keeping it warm (a dog in a yard, not a cat: owner call)
      { item: "bench", gx: 1, gy: 5.5 },
      { item: "dog", gx: 1, gy: 6.5 },
      { item: "turkey", gx: 5.5, gy: 5.5, tint: "#7f4e37" },
      { item: "lantern", gx: 3, gy: 5.5 },
      // and the harvest, spread a full tile apart so they don't stack up
      { item: "haybale", gx: 7.5, gy: 4 },
      { item: "pumpkin", gx: 6.5, gy: 5.5 },
      { item: "pumpkin", gx: 8, gy: 6 },
      { item: "jackolantern", gx: 7, gy: 7 },
    ],
  },
  winter: {
    label: "Winter yard",
    icon: "☃️",
    size: { w: 10, d: 8, env: "garden", lighting: "moonlit" },
    items: [
      { item: "snowpine", gx: 0.5, gy: 0 },
      { item: "christmastree", gx: 2.5, gy: 0 },
      { item: "chimney", gx: 5, gy: 0, tint: "#8b5546" },
      { item: "snowpine", gx: 7.5, gy: 0.5, tint: "#46644f" },
      { item: "snowdrift", gx: 0.5, gy: 3 },
      { item: "snowman", gx: 2.5, gy: 3 },
      { item: "snowballs", gx: 4, gy: 3.5 },
      { item: "snowangel", gx: 5, gy: 2.5 },
      { item: "logstack", gx: 7.5, gy: 3 },
      { item: "icelantern", gx: 8.5, gy: 4 },
      { item: "bench", gx: 1.5, gy: 6, tint: "#755743" },
      { item: "lantern", gx: 3.5, gy: 6 },
      { item: "snowdrift", gx: 6.5, gy: 6 },
      { item: "bunny", gx: 8, gy: 6.5, tint: "#d8dde2" },
    ],
  },
  summer: {
    label: "Poolside",
    icon: "⛱️",
    size: { w: 10, d: 8, env: "terrace", lighting: "golden" },
    items: [
      { item: "coconutpalm", gx: 0, gy: 0, tint: "#986a42" },
      { item: "coconutpalm", gx: 8, gy: 0, tint: "#a27448" },
      { item: "pool", gx: 3, gy: 2 },
      { item: "poolumbrella", gx: 0.5, gy: 3, tint: "#df765f" },
      { item: "sunlounger", gx: 0.5, gy: 5.5, tint: "#67a9bf" },
      { item: "sunlounger", gx: 6.5, gy: 5.5, tint: "#df765f" },
      { item: "beachball", gx: 7.5, gy: 3.5 },
      { item: "sidetable", gx: 4.5, gy: 5.5, tint: "#b78d67" },
      { item: "fruitbowl", gx: 4.5, gy: 5.5 },
      { item: "mug", gx: 5, gy: 5.5 },
      { item: "lantern", gx: 8.5, gy: 6.5, tint: "#b78d67" },
      { item: "plant", gx: 9, gy: 2.5 },
    ],
  },
  };
}

