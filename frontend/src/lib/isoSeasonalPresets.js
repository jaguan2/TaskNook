/** Personal seasonal retreats, each organized around one focal activity.
 * The small seating, serving and planting groups share clear approaches. */
export function createIsoSeasonalPresets() {
  return {
    fall: {
      label: "Autumn yard",
      icon: "🍂",
      size: { w: 8, d: 7, env: "garden" },
      items: [
        // A sheltered owner seat.
        { item: "bench", gx: 1, gy: 4.5, rot: 2 },
        { item: "lantern", gx: 0.5, gy: 4 },
        { item: "dog", gx: 0.5, gy: 5.5 },
        // Falling leaves and the job half done.
        { item: "mapletree", gx: 0.5, gy: 0 },
        { item: "mapletree", gx: 5.5, gy: 0, tint: "#c9762f" },
        { item: "bush", gx: 0.5, gy: 2.5, tint: "#a8863a" },
        { item: "leafpile", gx: 2.5, gy: 1.5 },
        { item: "rake", gx: 3.5, gy: 2 },
        // One harvest cluster.
        { item: "scarecrow", gx: 6, gy: 2.5, tint: "#a85a43" },
        { item: "haybale", gx: 5, gy: 4 },
        { item: "pumpkin", gx: 6.5, gy: 4 },
        { item: "pumpkin", gx: 5.5, gy: 5.5 },
        { item: "turkey", gx: 4, gy: 4.5, tint: "#7f4e37" },
      ],
    },
    winter: {
      label: "Winter yard",
      icon: "☃️",
      size: { w: 8, d: 7, env: "snow", lighting: "moonlit" },
      items: [
        // The bench precedes the firewood as the intentional arrival seat.
        { item: "bench", gx: 1, gy: 4.5, rot: 2, tint: "#755743" },
        { item: "logstack", gx: 3, gy: 4.5 },
        { item: "lantern", gx: 0.5, gy: 4.5 },
        { item: "icelantern", gx: 3.5, gy: 5.5 },
        // A grouped winter backdrop.
        { item: "snowpine", gx: 0.5, gy: 0 },
        { item: "christmastree", gx: 5.5, gy: 0.5 },
        { item: "snowdrift", gx: 0.5, gy: 2 },
        // A single snow-play area.
        { item: "snowman", gx: 3, gy: 2 },
        { item: "snowballs", gx: 4.5, gy: 3 },
        { item: "snowangel", gx: 5.5, gy: 3.5 },
        { item: "bunny", gx: 6.5, gy: 5.5, tint: "#d8dde2" },
      ],
    },
    holiday: {
      label: "Holiday hearth",
      icon: "🎁",
      size: { w: 8, d: 6, env: "room", lighting: "candle", wallColors: { left: "#6f5148", right: "#4e4740" } },
      items: [
        // The conversation group faces the hearth.
        { item: "fireplace", gx: 2, gy: 0 },
        { item: "persianrug", gx: 1.5, gy: 2.5, tint: "#8e3a3f" },
        { item: "sofa", gx: 2, gy: 4, rot: 2, tint: "#61765d" },
        { item: "coffeetable", gx: 2, gy: 2.5, tint: "#9b7659" },
        { item: "armchair", gx: 0.5, gy: 2.5, rot: 1, tint: "#61765d" },
        { item: "ciderset", gx: 2, gy: 2.5 },
        // One seasonal corner.
        { item: "christmastree", gx: 6, gy: 0.5 },
        { item: "giftstack", gx: 6, gy: 2 },
        { item: "evergreengarland", gx: 0.5, gy: 0 },
        { item: "stocking", gx: 2.5, gy: 0, tint: "#a9474c" },
        // A small lived-in edge.
        { item: "blanketbasket", gx: 4.5, gy: 4, tint: "#9b7659" },
        { item: "cat", gx: 4, gy: 5, tint: "#3a3142" },
        { item: "fern", gx: 6.5, gy: 4.5 },
      ],
    },
    summer: {
      label: "Poolside",
      icon: "⛱️",
      size: { w: 10, d: 8, env: "terrace", lighting: "golden" },
      items: [
        // One pool with a planted backdrop.
        { item: "longpool", gx: 1.5, gy: 1.5 },
        { item: "coconutpalm", gx: 0.5, gy: 0, tint: "#986a42" },
        { item: "coconutpalm", gx: 8.5, gy: 0, tint: "#a27448" },
        // One paired lounging and serving area.
        { item: "sunlounger", gx: 2.5, gy: 5, rot: 3, tint: "#67a9bf" },
        { item: "sunlounger", gx: 5.5, gy: 5, rot: 3, tint: "#67a9bf" },
        { item: "cafetable", gx: 4, gy: 5.5, tint: "#b78d67" },
        { item: "fruitbowl", gx: 4, gy: 5.5 },
        { item: "mug", gx: 4.5, gy: 6 },
        { item: "poolumbrella", gx: 6.5, gy: 5.5, tint: "#67a9bf" },
        // A clear deck approach.
        { item: "lantern", gx: 1.5, gy: 6.5, tint: "#b78d67" },
        { item: "beachball", gx: 8.5, gy: 4.5 },
      ],
    },
  };
}
