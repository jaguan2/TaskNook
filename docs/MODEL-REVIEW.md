# Character and furniture review

## Findings addressed

- Seated skirts, pleated skirts and maxi skirts reused separate cloth thighs,
  making them look like shorts. They now share a continuous lap panel, with
  distinct hems and folds. The maxi length follows the seat height.
- Sitting removed denim's rolled hems and stitching and dress trousers'
  pressed creases. The seated drawing now preserves these material details.
  Bare shins also draw behind shorts, preserving the cloth hem at the knee.
- The desk chair's dark spokes disappeared against dark floors and had no
  wheels. Its base now has visible casters and warm metal edge highlights.
- Artwork comparison tests counted unique React IDs as visual differences.
  Comparisons now ignore instance IDs and descriptive data attributes, and
  check that every bottom remains distinct at three seat heights.

## Review coverage

Inspected rendered SVG contact sheets for clothing and furniture, light and
dark skirt colours, both character models, and minimum/maximum body sizes.
Checked the seated clothing and desk chair together in rendered Loft scenes.
These are static render checks; they do not exercise live drag or animation.

The opt-in art-sheet generator includes the expanded fixtures for future
reviews. The model spec records the seated clothing rules. No profile data
format, furniture placement geometry or saved wardrobe selections changed.
