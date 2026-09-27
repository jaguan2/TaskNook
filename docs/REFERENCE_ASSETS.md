# Furniture reference notes

Local references are in [`inpso/`](inpso/) (the folder's current spelling).
These observations identify visible forms, not the original game's internal
asset names. Use them to design TaskNook's own SVG furniture in our dimetric
grid; do not trace or import the reference artwork.

## Pieces visible in the references

| Reference and visible piece | TaskNook equivalent | Useful difference / next step |
| --- | --- | --- |
| [Café](inpso/ss_18f591f3e019a2fa4e390c661167a536b08d6ded.1920x1080.jpg): espresso machine at the left counter | `coffeecounter` | **Improved:** metal housing, dark brewing bay, gauge/buttons, portafilter, steam wand, cup and drip tray. Existing steam remains. |
| Café: shelves of books and plants near the rear door | `bookshelf`, `bookcase`, `wallshelf` | **Improved:** the low bookcase mixes upright books, page-edged stacks, a ceramic bowl and a linen basket. The wall shelf has matching book spines and a rooted trailing vine. Tall bookshelf unchanged. |
| Café: wooden chairs and round stools around shared tables | `chair`, `woodstool`, `cafetable`, `diningtable` | Already present. A future chair variant could use a curved spindle back; retain the current seat-height contract. |
| Café: warm patterned lampshades | `floorlamp`, `desklamp` | Existing lighting works; a stained-glass shade is a distinct silhouette/material opportunity, not just a brighter bulb. |
| Café: vine-covered arch and room divider | `archway`, partitions, plants | Architecture exists. An optional climbing-plant treatment would connect plants to the structure instead of adding unrelated pots. |
| Café: pictures, wall-mounted supply shelves and window curtains | `frame`, `poster`, `wallshelf`, `curtain` | Improve variety through a few authored arrangements, keeping objects legible at room scale. |
| [Loft](inpso/ss_82d9f29a63805ec614dc8262cef91726b1238f21.1920x1080.jpg): colourful stacked storage cubbies | `bookcase`, `shelf`, `tvunit` | A staggered cubby cabinet would add a genuinely different outline. Current shelves are rectangular carcasses. |
| Loft: bed with bright bedding, loose pillows and a flower cushion | `bed`, `cushion` | Layered bedding exists; a separate flower cushion would add a readable new shape. Avoid making every bed permanently busy. |
| Loft: compact sink, hob and toaster run | `sink`, `oven`, `counter`, `toaster` | Assets already exist. Arrange them as a coherent kitchenette before adding duplicate appliances. |
| Loft: raised sleeping platform, rail and stairs | No functional raised floor | Larger architecture work: needs elevation, placement, sorting and access rules together. A decorative ladder alone would imply functionality the room does not have. |

## This pass

The three updated sprites keep their catalog keys, footprints, heights and
placement rules, so existing rooms gain the artwork without a migration.
Bookcase shelf edges follow the selected wood tint; books, ceramics, linen,
foliage and machine metal retain their own materials. Shared `ShelfBooks`
art keeps the standing and wall furniture consistent.

Validation: render the actual cabin, reading-room and café presets, including
the reading room's mirrored bookcases, then inspect both the whole room and
the furniture close up. Existing catalog tests cover every facing; artwork
quality still requires looking at it.
