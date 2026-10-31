# Modeling roadmap: the entire catalog and resident

The work is a catalog-wide art redesign. The Virtual Cottage 2 references show
objects constructed from believable materials and characters settled into
furniture. Adding particles or recolouring generic boxes cannot produce that.
The current path is to author better SVG silhouettes, construction and poses
while preserving customisation and the existing placement/animation system.
A renderer migration is a separate decision; the older research is linked below.
`MODELS.md` describes current implementation, not future targets.

Fixed common places include Common Cottage and Willow Pond alongside the
editable home. [Common rooms](COMMON_ROOMS.md) records their connected
spaces, raised floors, simulated neighbours and six selectable seats per place.
Their floors and solid steps are authored at real heights in a fixed renderer;
the catalog stair sprite still does not provide an upper floor for editable
homes. Architecture, materials and seating poses need further art review.
Keep this scene work separate from the catalog-wide model redesign.

The seating follow-up replaces the armchair/sofa's tall box sides with
curved padded panels and visible timber frames, gives the desk chair a
shaped back shell and layered seat, and opens the garden bench into separate
slats, rails and legs. Existing seating anchors and heights are unchanged.
The art sheet now includes furniture contact at body extremes in both
facings and idle/focus/break, alongside cream/dark/sage material views.

All **168 catalog entries in 18 groups** have been reviewed in a labelled
contact sheet, including every advertised rear view. `npm run art` now writes
`frontend/art-sheet/catalog.json` and the complete `catalog-*` SVG fixtures,
as well as all wardrobe fixtures. An item absent from presets still gets reviewed.

## Next iteration draft — kitchen materials and tabletop life

The outdoor pass now gives five presets a stronger ground plane. The next
cohesive pass should improve the everyday objects people actually work beside,
without turning kitchens into dense prop displays:

1. **Set the module boundary first.** Extract the remaining kitchen appliances,
   cookware and food sprites from `IsoItems.jsx` into a small number of material-
   based modules. Keep registry keys, stack heights and footprints unchanged.
2. **Build the fixed kitchen run.** Give the oven recessed glass and controls,
   the sink a thick inset basin and curved supported faucet, and the fridge
   separate doors, gasket gap, handles, feet and toe-kick.
3. **Refine the small appliances.** Rebuild the microwave, toaster and kettle
   around wall thickness, openings, handles and feet rather than decorated boxes.
4. **Make cookware hollow and supported.** Add rolled rims, visible interiors
   and attached handles to the stockpot, teapot, mug and serving bowl while
   preserving their tabletop placement contracts.
5. **Give food a readable profile.** Prioritize bread, fruit bowl, cake, pie and
   ramen. Use overlapping broad forms and cut surfaces that survive room zoom;
   avoid garnish detail that collapses into noise.
6. **Repeat the room-scale review loop.** Judge Corner café, Cozy cabin and the
   kitchen-heavy home arrangements beside the isolated cutouts. Check counter
   stacking, rear paint order, routes and tint behavior before refreshing only
   the screenshots whose visible models changed.

Acceptance for that batch: saved keys, footprints, support heights and stacking
stay compatible; metal, ceramic, food and glass remain visually distinct; no
new prop blocks an authored route; the full suites, production build, art sheet,
artifact verification and isolated frozen self-test pass.

## Implemented 2026-10-25 — outdoor ground and resting places

The tree/support pass improved vertical silhouettes; this follow-up strengthens
what people sit beside and what those pieces touch:

1. **Outdoor ownership.** Picnic blanket, bench, fallen log, hammock and garden
   lantern now live in `IsoOutdoorStructures.jsx`. Planted scenery remains in
   `IsoOutdoorItems.jsx`, leaving a stable boundary between growth and built
   outdoor pieces instead of accumulating more code in `IsoItems.jsx`.
2. **Two water material systems.** Pond and garden pond share an irregular stone
   bank, earthen shelf and shallows. Pool and long pool share thick built coping,
   inset water and submerged entry ledges. All four footprints and clip polygons
   remain unchanged.
3. **Resting construction.** The bench exposes braces and pegs, the log has an
   irregular bark body and projecting end grain, and the hammock separates
   planted posts, tied ropes and a sagging cloth sling. Seat/lie anchors did not
   move.
4. **Ground contact.** Garden-trail stones now have unequal chipped outlines,
   cracks and contact shadows. Picnic and the outdoor-suitable rug families gain
   bound edges, cloth corners or offset ground contact at room-readable scale.
5. **Seasonal anchors.** The hay bale is a tied, slightly bulging straw bundle;
   the scarecrow has loose sleeves and a constructed brim; the snowman uses
   irregular snow masses; and firewood exposes unequal split ends and bark bodies.
6. **Room-scale review.** Secret Garden, Terrace, Autumn yard, Winter yard and
   Poolside were reviewed beside the isolated catalog renders. Their layouts and
   open routes remain intact, and the five built-app screenshots were refreshed.

Catalog keys, footprints, seat/surface metadata and authored preset placement
remain stable. Focused tests assert the water/material split, visible outdoor
construction, ground bindings and seasonal broad parts rather than pixel-locking
the artwork.

## Implemented 2026-10-24 — outdoor support pass

The seasonal trees made the simpler objects around them more obvious. This
pass improved that supporting layer as six connected work units:

1. **Generic outdoor silhouettes.** `tree`, `pine`, `birch`, `bush`, `hedge`,
   `rock` and `flowerbed` now live in the focused `IsoOutdoorItems.jsx`, reducing
   `IsoItems.jsx` to 3,794 lines. A shared `EvergreenCrown` supplies five curved,
   asymmetric tiers to pine, Snowy pine and the Christmas tree while leaving
   snow shelves, lights and ornaments species-specific.
2. **Autumn ground props.** The leaf pile is a low irregular mound built from
   overlapping veined leaves. Pumpkins use filled lobes and a rear-growing
   stem; the jack-o'-lantern's face now cuts through a visibly thick shell.
3. **Winter snow material.** The snow angel is a pressed field with broken rim
   catches, drifts have an irregular cool underside, and the unequal snowballs
   use hand-packed silhouettes, flattened contacts and short shadow facets.
4. **Poolside furniture.** The umbrella now has curved scalloped panels,
   underside ribs, a connected pole and weighted base. Loungers separate the
   neutral frame, planted legs, hinge hardware and tensioned fabric sling.
5. **Garden planting layer.** Flower patches mix daisies and bell flowers at
   different heights. Tulips lean on unequal stems, and the bird bath has a
   shaped pedestal, thick basin and recessed water below its rim.
6. **Room-scale review loop.** Secret garden, Autumn yard, Winter yard and
   Poolside were reviewed with the isolated cutouts. Their purposeful layouts
   stayed open rather than gaining extra pieces merely to display new artwork.

Acceptance for the batch: silhouettes remain legible at roughly 30 px; repeated
organic detail is consolidated into compound paths instead of hundreds of SVG
nodes; footprints, hit heights, seat/surface contracts and saved keys do not
change; no CSS animation shares an element with an SVG transform; the art sheet,
preset validation, full frontend suite, production build and packaged-app
self-test all pass. The rejected seated-character perspective and raised-floor
architecture remain separate projects—they each need their own coherent design
iteration rather than being folded into this catalog pass.

## Order of work

| Priority | Batch | What makes it worth doing |
|---|---|---|
| 1 | Resident at the window desk | A real seated profile, shaped jaw, visible neck, angled shoulders and hands at the work surface. The skewed perspective prototype was rejected by the owner and reverted. Design a coherent seated silhouette and garment planes before rigging it. |
| 1 | Main seating, bed and desk | Rounded upholstery, supported timber frames and layered bedding. Add the reference's raised platform bed as its own design, not a misleading repaint of the existing bed. |
| 1 | Storage and plants | Recessed cabinets, individual contents and species-specific leaves. The first detailed plant/storage pass is implemented; pots and secondary pieces need further work. |
| 2 | Kitchen and appliances | Distinct doors, handles, rims, supporting feet and material thickness. |
| 2 | Seasonal trees and outdoor structures | Seasonal and generic trees now use branching, overlapping foliage; continue the joined-construction pass on stairs and other outdoor structures. |
| 2 | Wall fixtures and lamps | Supported shades, framed glass, fabric drape and clear attachment points. |
| 3 | Food, tabletop objects and pets | Individually authored profiles and contact/overlap detail that survive room scale. |
| 3 | Rugs and small seasonal decorations | Physical cloth edges, irregular organic shapes and readable material differences. |

## Resident and wardrobe acceptance

The experimental chair perspective rig was rejected by the owner and has
been reverted. Its overlapping knees, skewed torso, profile head and reaching
forearms did not form a convincing seated figure. The established front/rear
seated rig is restored, including the original garment, shoe and activity
layering. The furniture/plant/lighting improvements and earlier shaped head,
neck and bun changes remain.

Reapproach seating as an authored pose, not a collection of transforms:
first draw one coherent resting figure beside a real chair and desk, with a
clear pelvis, shoulder line, knees and supported feet. Fit the garment to that
pose instead of skewing frontal artwork. Resolve near/far limb overlap and
hand contact at the work surface in a static drawing. Only then introduce
focus/break gestures and body-slider variation. Judge model closeups and
room-scale captures together; tests cannot approve the art direction.

The following common-room pass refines the shared figure without changing
that seated rig: fitted shirt/blouse collars, narrow knit necklines and
smaller shaped palms replace the broad neck oval and round mitten masses.
All ten starting looks remain complete and editable. Loft, Corner café and
Reading room now make more deliberate use of the refined fern, orchid and
table-lamp models; new common-room props also use the updated upholstery and
storage. These are refinements, not completion of the resident backlog.

Review both body models and all ten complete looks (fall girl/guy,
school girl/boy, office female/male, lofi girl, cozy gamer, winter reader and
garden helper), front and rear,
in idle/focus/break poses. Test every bottom at multiple seat heights, all
body-slider extremes, long hair, hats, glasses and light/dark custom colours.
Keep these individual art passes open:

| Component | Remaining modeling work |
|---|---|
| Head and face | True quarter-view cheek/eye placement, less frontal collar exposure and jaw continuity from front to profile. |
| Hair | Shape-specific quarter-view fringe, scalp/nape coverage and asymmetric strands; the wrapped bun is already refined. |
| Torso and tops | Authored angled chest/side planes, neckline depth and shoulder seams instead of relying on a skewed frontal panel. |
| Coats and scarves | Separate open edges, lap drape and rear hem silhouettes when sitting. |
| Arms and hands | Near/far shoulder occlusion, flat resting palms and reach tuned to desk height, with idle hands on the lap. |
| Bottoms | Angled seated lap panels and overlapping far knees; retain denim seams, pressed creases and continuous skirt hems. |
| Shoes | Perspective-specific soles and floor contact under every seated bottom. |
| Hats and accessories | Side-specific brims, ear/temple clearance and headphone cup alignment. |
| Animation | Gentle typing/head movement anchored to the correct joints; no resident wandering and no shared element for an animation and static transform. |

## Per-item backlog

Statuses record the October 4 catalog review; "Refined this pass" and
"Refined previous pass" describe that work, not a new review on every edit.
Check the current sprite before starting a task. The next-work column remains
the planning guide, and refined artwork can still need further improvement.

Every row below was visually reviewed. **Refined this pass** and **Refined
previous pass** record actual authored changes, not completion. **Pending**
means the item still needs its own design pass; some receive a shared solid
bevel or drawer improvement, which does not count as an individual redesign.
Each item keeps a specific next task. No item is marked finished merely
because it renders or has a tint picker.

### Rugs & floor

| Item (catalog key) | Status | Next modeling work |
|---|---|---|
| Round rug (`rug`) | Pending | Rounded bound edge and a restrained woven surface at room scale. |
| Square rug (`squarerug`) | Pending | Replace hard slab corners with cloth corners and corner tassels. |
| Pet bed (`petbed`) | Pending | Raised stuffed rim, recessed fabric centre and a folded seam. |
| Runner rug (`runner`) | Pending | Long cloth drape, end binding and asymmetric fringe. |
| Oval rug (`ovalrug`) | Refined 2026-10-25 | Offset contact and a distinct braided material are implemented; an irregular textile perimeter remains future work. |
| Door mat (`matrug`) | Refined 2026-10-25 | Coir material and floor contact now distinguish it from soft rugs; add woven reed strips only if they survive room scale. |
| Pond (`pond`) | Refined 2026-10-25 | Irregular stone bank, earthen shelf and shallows are implemented; preserve the natural-water material contract. |
| Garden pond (`gardenpond`) | Refined 2026-10-25 | Inherits the shared natural bank at an 8-by-6 footprint; keep its larger water movement legible without tiling artifacts. |
| Stepping-stone trail (`gardentrail`) | Refined 2026-10-25 | Five unequal chipped stones now carry offset shadows, highlights and restrained cracks. |
| Picnic blanket (`picnic`) | Refined 2026-10-25 | Irregular cloth perimeter, binding, gathered corner and sparse fringe are implemented. |
| Patterned rug (`persianrug`) | Refined 2026-10-25 | Bound edge and offset contact are implemented; less uniform fringe remains. |
| Striped rug (`stripedrug`) | Refined 2026-10-25 | Bound edge and floor contact support the existing stripe rhythm; soften the perimeter in a later textile pass. |
| Sheepskin (`sheepskin`) | Pending | Uneven fleece perimeter with a few broad fur masses. |

### Tables & desks

| Item (catalog key) | Status | Next modeling work |
|---|---|---|
| Workstation (`desk`) | Pending | Under-top apron, framed drawers, recessed pulls and visible leg joinery. |
| Nightstand (`nightstand`) | Pending | Inset drawer faces, grounded feet and a thicker projecting top. |
| Side table (`sidetable`) | Pending | Open leg bracing and separate top/apron construction. |
| Café table (`cafetable`) | Pending | Shaped pedestal, bevelled circular top and stable foot contacts. |
| Counter (`counter`) | Pending | Recessed door panels, toe-kick and a separate worktop material. |
| Café bar (`barcounter`) | Pending | Overhanging top, foot rail and panelled frontage. |
| Coffee counter (`coffeecounter`) | Pending | Worktop lip, service shelves and individually modelled fittings. |
| Coffee table (`coffeetable`) | Pending | Mortise-like leg joints, underside rail and softened top corners. |
| Dining table (`diningtable`) | Pending | Leg/apron separation and a warm bevelled timber top. |

### Seating & beds

| Item (catalog key) | Status | Next modeling work |
|---|---|---|
| Stool (`stool`) | Pending | Compressible round seat and a frame with individual supports. |
| Sofa (`sofa`) | Refined this pass | Joinery at the open frame and a throw wrapping the curved arm; retain the new bowed back and rounded arm profiles. |
| Armchair (`armchair`) | Refined this pass | More natural arm-to-back joins and sitter contact; retain the curved upholstery and visible timber frame. |
| Wooden chair (`chair`) | Refined previous pass | Seat/back thickness and timber joints visible from the rear. |
| Bed (`bed`) | Refined previous pass | Authored raised platform alternative with ladder and under-bed storage. |
| Floor cushion (`cushion`) | Refined this pass | Replace the remaining angular piping with curved seams and cloth squash. |
| Flower cushion (`flowercushion`) | Added 2026-10-23 | Layered petal construction and a stitched centre are implemented; add restrained seam variation while preserving its soft-seat readability. |
| Desk chair (`deskchair`) | Refined this pass | Arm support structure and quarter-view sitter alignment; retain the shaped back shell and layered padded seat. |
| Beanbag (`beanbag`) | Pending | One pear-shaped slumped cloth body with gathered base, replacing oval layers. |
| Wooden stool (`woodstool`) | Pending | Carved seat, splayed legs and visible stretcher joints. |
| Fallen log (`log`) | Refined 2026-10-25 | Uneven bark silhouette, branch stub, knot and projecting exposed end grain are implemented. |
| Garden bench (`bench`) | Refined 2026-10-25 | Separate slats, rails and open under-seat construction now include visible braces and fastening pegs. |
| Hammock (`hammock`) | Refined 2026-10-25 | Planted tapered posts, tied ropes and an inset sagging cloth sling make the tension readable. |

### Storage

| Item (catalog key) | Status | Next modeling work |
|---|---|---|
| Open shelf (`shelf`) | Refined this pass | Shelf thickness and individual shelf contents with less uniform books. |
| Wide bookcase (`bookcase`) | Pending | Frame joinery and deeper overlapping books/ceramics. |
| Pastry case (`pastrycase`) | Pending | Glass side depth, framed doors, tray rails and shaped pastries. |
| TV cabinet (`tvunit`) | Pending | Panelled cabinet doors, cable opening and raised feet. |
| Wardrobe (`wardrobe`) | Refined this pass | A restrained timber grain pass and distinct rear construction. |
| Dresser (`dresser`) | Refined this pass | Drawer side depth and a slightly rounded projecting top. |
| Record crate (`vinylcrate`) | Refined this pass | Open slatted construction and varied sleeve silhouettes. |
| Laundry basket (`basket`) | Refined 2026-10-23 | Tapered wicker, a bound recessed rim and draped cloth implemented; further fold variation remains. |
| Coat rack (`coatrack`) | Pending | Sculpted hooks, hanging cloth silhouettes and thicker timber joints. |
| Ladder shelf (`ladder`) | Refined 2026-10-23 | Projected shelf boards, leaning rails and supported contents implemented; assess rail joinery at room scale. |
| Stacked crates (`crates`) | Refined 2026-10-23 | Open slats, corner battens and a supporting lower lid implemented; carrying cutouts and varied contents remain. |
| Book trolley (`booktrolley`) | Added 2026-10-23 | Open two-tier frame, casters, side handle and clear usable upper tray; consider a distinct rear view if four-way facing becomes useful. |
| Bookshelf (`bookshelf`) | Refined previous pass | More depth in leaning books and a less repetitive shelf arrangement. |

### Plants & greenery

| Item (catalog key) | Status | Next modeling work |
|---|---|---|
| Plant display (`plantshelf`) | Pending | Miniature leaf silhouettes matching the individually redesigned plants. |
| Cactus (`cactus`) | Refined this pass | Continuous branching body and flower/needle silhouettes instead of joined rectangles. |
| Terrarium (`terrarium`) | Pending | Layered gravel, identifiable foliage and glass thickness. |
| Monstera (`monstera`) | Refined previous pass | More varied cut leaf sizes and round ceramic planter alternative. |
| Fern (`fern`) | Refined this pass | Broader curved fronds and a few drooping lower leaves. |
| Parlour palm (`palm`) | Refined this pass | Arcing trunks and longer drooping fronds, keeping the leaflet rhythm. |
| Snake plant (`snakeplant`) | Refined this pass | Unequal sword thickness, curled tips and a ceramic planter alternative. |
| Bonsai (`bonsai`) | Refined this pass | More asymmetric leaf pads and visibly shallow ceramic dish. |
| Succulent (`succulent`) | Refined this pass | A fuller tilted rosette and ceramic pot rather than a flat star. |
| Orchid (`orchid`) | Refined this pass | More curved petal silhouettes and a taller arched stem. |
| Potted plant (`plant`) | Refined this pass | Unequal curved leaves, fuller crown and less rigid stem spacing. |
| Wildflowers (`flowers`) | Pending | Different flower heads, leaves and stem bends rather than identical daisies. |
| Flower patch (`flowerbed`) | Refined 2026-10-24 | Soil inset, broad leaves and two flower species now form unequal clusters; future work should stay restrained at room scale. |

### Tech & music

| Item (catalog key) | Status | Next modeling work |
|---|---|---|
| Television (`tv`) | Pending | Separate bezel, glass, stand supports and restrained rear connectors. |
| Laptop (`laptop`) | Pending | Thin hinge, stepped keyboard deck and screen-frame thickness. |
| Radio (`radio`) | Pending | Rounded housing, recessed speaker grille and separate dial knobs. |
| Computer (`computer`) | Pending | Thinner display supports, layered keyboard deck and restrained cable details. |
| Record player (`recordplayer`) | Pending | Platter recess, articulated tonearm, controls and separate dust-cover hinge. |

### Autumn

| Item (catalog key) | Status | Next modeling work |
|---|---|---|
| Maple (`mapletree`) | Refined | A connected shadow crown, overlapping tilted lobes and partly hidden branch forks form one full canopy instead of a stack of ovals. |
| Leaf pile (`leafpile`) | Refined 2026-10-24 | Low scalloped masses, broad individual leaves and veins replace the tall abstract pile. |
| Hay bale (`haybale`) | Refined 2026-10-25 | Slightly bulging straw faces, loose ends and four wrapping band surfaces replace the crate-like box. |
| Pumpkin (`pumpkin`) | Refined 2026-10-24 | Filled overlapping lobes, volume shading and a rear-growing stalk replace surface stripes alone. |
| Jack-o'-lantern (`jackolantern`) | Refined 2026-10-24 | Dark recesses and warm inner facets give the cut openings visible shell thickness. |
| Rake (`rake`) | Pending | Separated metal teeth and a believable handle/head connection. |
| Scarecrow (`scarecrow`) | Refined 2026-10-25 | Loose sleeves, straw cuffs, stitched hem and separate hat crown/brim now expose its construction. |
| Turkey (`turkey`) | Pending | Layered feather shapes and distinct neck/head volume. |
| Wreath (`wreath`) | Pending | An irregular leafy ring with overlapping branches and tied ribbon. |

### Winter

| Item (catalog key) | Status | Next modeling work |
|---|---|---|
| Snowy pine (`snowpine`) | Refined | Five broad curved tiers overlap darker rear boughs; small offset snow shelves leave the conifer silhouette visible. |
| Snowman (`snowman`) | Refined 2026-10-25 | Three unequal irregular snow masses, cool away-side shading and the wrapped scarf replace perfect balls. |
| Snow drift (`snowdrift`) | Refined 2026-10-24 | Low compound snow mass with an irregular cool underside and restrained highlight. |
| Snowballs (`snowballs`) | Refined 2026-10-24 | Unequal hand-packed silhouettes, flattened contacts and short lower-right facets replace perfect spheres. |
| Christmas tree (`christmastree`) | Refined | Foreground and interstitial boughs make a dense crown without repeating identical triangles; the wrapped garland and ornaments remain independently readable. |
| Snow angel (`snowangel`) | Refined 2026-10-24 | Broad depressed fields and broken rim catches replace the continuous chalk-like outline. |
| Christmas lights (`christmaslights`) | Pending | Individual bulb housings and a sagging supported cable. |
| Snowy chimney (`chimney`) | Pending | Brick courses, mortar recess and separate cap/smoke opening. |
| Firewood (`logstack`) | Refined 2026-10-25 | Separate bark bodies support four unequal projecting split-log ends with restrained growth rings. |
| Ice lantern (`icelantern`) | Pending | Thick translucent shell, melted rim and inset candle. |
| Icicles (`icicles`) | Pending | Unequal tapered hanging shards with supported attachment edges. |

### Spring

| Item (catalog key) | Status | Next modeling work |
|---|---|---|
| Blossom tree (`blossomtree`) | Refined | A connected rear crown and overlapping pink lobes partly hide the forked branches, with small flowers and falling petals preserving species identity. |
| Tulips (`tulips`) | Refined 2026-10-24 | Unequal leaning stems, cup-shaped heads and broad curved leaves give the cluster a planted rhythm. |
| Watering can (`wateringcan`) | Pending | Rounded reservoir, rolled rim, hollow spout and separate handle. |
| Bird bath (`birdbath`) | Refined 2026-10-24 | Shaped foot, pedestal and capital support a thick basin with water recessed below its rim. |
| Seedlings (`seedtray`) | Pending | Raised tray edges, separate soil cells and varied seedlings. |
| Bunting (`bunting`) | Pending | Sagging cord, folded cloth flags and visible attachment points. |

### Summer

| Item (catalog key) | Status | Next modeling work |
|---|---|---|
| Swimming pool (`pool`) | Refined 2026-10-25 | Thick built coping, inset water and three submerged entry ledges are implemented. |
| Long swimming pool (`longpool`) | Refined 2026-10-25 | Inherits the built-water construction at seven tiles with repeated coping joints and an unstretched inset plane. |
| Coconut palm (`coconutpalm`) | Refined | Curved ringed trunk, nine layered segmented fronds with unequal droop/value and a three-coconut crown. |
| Pool umbrella (`poolumbrella`) | Refined 2026-10-24 | Curved scalloped panels, underside ribs, connected pole and weighted base provide fabric and structural reads. |
| Beach ball (`beachball`) | Pending | Panel seams following a rounded sphere and floor contact. |
| Sun lounger (`sunlounger`) | Refined 2026-10-24 | Neutral frame, planted legs, braces, hinge hardware and a tensioned fabric sling are visibly separate. |

### Kitchen

| Item (catalog key) | Status | Next modeling work |
|---|---|---|
| Oven (`oven`) | Pending | Recessed door glass, knobs, handle depth and lower feet. |
| Sink (`sink`) | Pending | Inset basin with wall thickness, rim and curved faucet. |
| Microwave (`microwave`) | Pending | Door-frame thickness, recessed controls and supporting feet. |
| Toaster (`toaster`) | Pending | Rounded housing, recessed slots, lever and crumb-tray seam. |
| Kettle (`kettle`) | Pending | Separate spout, lid rim and loop handle around a rounded reservoir. |
| Stockpot (`pot`) | Pending | Rolled rim, hollow inner wall and physically attached handles. |
| Little fridge (`fridge`) | Pending | Separate door faces, gasket gap, handle supports and toe-kick. |

### Food & drink

| Item (catalog key) | Status | Next modeling work |
|---|---|---|
| Teapot (`teapot`) | Pending | Sculpted body, lid seat and continuous hollow spout/handle. |
| Fruit bowl (`fruitbowl`) | Pending | Thick bowl rim and individually shaped fruit with overlapping depth. |
| Bread (`bread`) | Pending | Irregular loaf outline, sliced end and scored crust following curvature. |
| Cake (`cake`) | Pending | Layered sponge/icing thickness and uneven decoration placement. |
| Pie (`pie`) | Pending | Rolled crust rim, recessed filling and overlapping lattice strips. |
| Ramen (`ramen`) | Pending | Bowl-wall thickness, noodle loops and individually shaped toppings. |
| Mug (`mug`) | Pending | Curved hollow handle, lip thickness and recessed drink surface. |

### Decoration

| Item (catalog key) | Status | Next modeling work |
|---|---|---|
| Till (`till`) | Pending | Layered keypad, angled display support and separate cash-drawer opening. |
| Standing mirror (`standmirror`) | Pending | Frame thickness, rear easel support and a grounded stand. |
| Guitar (`guitar`) | Pending | Body bevel, recessed sound hole, bridge and tuning peg detail. |
| Stack of books (`bookstack`) | Pending | Unequal covers, visible page blocks and less perfect alignment. |
| Open journal (`openjournal`) | Added 2026-10-23 | Bound page spread, ribbon and pencil; retain readable page planes and cover tint when adding future variants. |
| Folded blanket (`foldedblanket`) | Added 2026-10-23 | Staggered folded layers, rounded cloth edges and loose fringe are implemented; add subtle thickness variation without making the stack noisy. |
| Aquarium (`aquarium`) | Pending | Glass frame thickness, gravel bank and identifiable underwater plants. |
| Upright piano (`piano`) | Pending | Separate keybed, unequal black/white keys, lid and leg construction. |
| Easel (`easel`) | Pending | Actual crossed support joints, tray lip and canvas frame depth. |
| Birdcage (`birdcage`) | Pending | Arched bars, top ring, separate base and inner perch. |
| Folding screen (`screen`) | Pending | Panelled timber frame and folded fabric inserts with hinge depth. |
| Globe (`globe`) | Pending | Axis tilt, separate meridian ring and layered pedestal. |
| Chess set (`chess`) | Pending | Recognisable piece silhouettes and a thick board rim. |

### Light & warmth

| Item (catalog key) | Status | Next modeling work |
|---|---|---|
| Desk lamp (`desklamp`) | Refined this pass | More curved metal shade and attached hinge-arm segments. |
| Jar of lights (`lightjar`) | Pending | Glass thickness, screw lid and softly separated lights inside. |
| Lava lamp (`lavalamp`) | Pending | Thick glass chamber, cap/base materials and more organic wax shapes. |
| Mushroom lamp (`mushroomlamp`) | Pending | Curved translucent shade lip and sculpted stem/base. |
| Moon lamp (`moonlamp`) | Pending | Spherical form with a visible cradle and subtle crater relief. |
| Floor lamp (`floorlamp`) | Refined this pass | Deeper fabric shade rim, curved pleats and separate stand fittings. |
| Fireplace (`fireplace`) | Pending | Recessed firebox, hearth lip, masonry joints and layered logs. |
| Candle (`candle`) | Pending | Irregular melted wax lip and wick at the actual flame root. |
| Table lamp (`tablelamp`) | Refined this pass | Curved stained-glass panels, thicker bronze rim and shaped pedestal. |
| Candelabra (`candelabra`) | Pending | Curved arms, candle sockets and stable weighted base. |
| Paper lamp (`paperlantern`) | Pending | Unequal curved paper ribs, inset end rings and wood base. |
| Garden lantern (`lantern`) | Pending | Thick metal frame, separate glass panes and grounded pedestal. |

### Living things

| Item (catalog key) | Status | Next modeling work |
|---|---|---|
| Cat (`cat`) | Pending | More articulated shoulder/haunch silhouette and paw-to-floor contact in each pose. |
| You (`you`) | Refined previous pass | Perspective-specific torso/garments and distinct far-arm occlusion at a desk. |
| Resident (`resident`) | Refined previous pass | Perspective-specific torso/garments and headwear across all body extremes. |
| Dog (`dog`) | Pending | Shaped muzzle, shoulder/haunch transition and individual planted paws. |
| Rabbit (`bunny`) | Pending | Continuous cheek/chest outline and more distinct folded hind legs. |

### Architecture

| Item (catalog key) | Status | Next modeling work |
|---|---|---|
| Archway (`archway`) | Pending | Frame thickness, corner joints and a clearer rear face. |
| Door (`doorway`) | Pending | Recessed frame and panelled door with separate handle depth. |
| Tall window (`bigwindow`) | Pending | Mullion/frame depth, sill projection and separate glass plane. |
| Staircase (`stairs`) | Pending | Individual treads, risers and open stringer construction. |
| Railing (`railing`) | Pending | Top rail, individual post attachments and timber end joints. |
| Pillar (`pillar`) | Pending | Separate capital/base proportions and fluted or bevelled shaft. |

### On the wall

| Item (catalog key) | Status | Next modeling work |
|---|---|---|
| Picture frame (`frame`) | Pending | Bevelled frame profile, glass plane and inset artwork. |
| Wall shelf (`wallshelf`) | Pending | Supporting brackets, thick shelf edge and varied small contents. |
| Round mirror (`mirror`) | Pending | Frame bevel and a reflection plane recessed behind it. |
| Wall clock (`wallclock`) | Pending | Housing thickness, glass face and separate hand pivots. |
| Poster (`poster`) | Pending | Paper corners, attachment points and restrained curl. |
| Menu board (`menuboard`) | Pending | Recessed chalk surface and shaped timber frame. |
| Curtains (`curtain`) | Refined this pass | Projecting rail, brackets and rings; gathered upper folds, tied-back waists and softly fanned uneven hems. |
| Hanging plant (`hangplant`) | Pending | Arcing trailing vines, distinct small leaves and visible pot rim. |
| Neon sign (`neon`) | Pending | Tubing mounted on standoffs with a separate cable. |
| Fairy lights (`fairylights`) | Pending | Sagging cable, distinct bulbs and clear attachment points. |
| Wall sconce (`sconce`) | Pending | Bracket connection, shade depth and wall contact. |
| Pendant light (`pendant`) | Pending | Suspension cable, inset bulb and layered shade rim. |
| Corkboard (`corkboard`) | Pending | Frame thickness, pins and overlapping paper depths. |
| Pennant (`pennant`) | Pending | Sagging fabric edge, fold at the support and tied cord. |

### Outdoors

| Item (catalog key) | Status | Next modeling work |
|---|---|---|
| Tree (`tree`) | Refined 2026-10-24 | Shared broadleaf construction gives it a joined crown, branching depth and a full room-scale silhouette. |
| Pine tree (`pine`) | Refined 2026-10-24 | Five asymmetric curved tiers overlap darker rear boughs around a visible trunk. |
| Birch tree (`birch`) | Refined 2026-10-24 | A tapered forked trunk and three open leaf clusters preserve its lighter species silhouette. |
| Hedge (`hedge`) | Refined 2026-10-24 | Organic clipped foliage, a ragged top and lower stems replace the hard box silhouette. |
| Rock (`rock`) | Refined 2026-10-24 | Unequal planes, chipped edges and a dark grounded facet create a compact stone mass. |
| Bush (`bush`) | Refined 2026-10-24 | Overlapping clustered foliage, inner branches and a ground shadow replace the flat blob. |

## Definition of a reviewed improvement

An item's identity must read from its silhouette at normal room zoom. Major
materials must have thickness, supports and consistent light direction.
Details must survive a room screenshot without becoming noisy. Check front,
rear and all supported rotations, light/dark tints, an isolated catalog sheet
and an actual furnished preset. Preserve existing footprints, seat heights,
wall anchors, recolouring, contact shadows and reduced-motion behavior.

Character changes additionally need all wardrobe combinations to remain
valid, separate animation wrappers and checks for focus/break/carry layering.
Only then refresh screenshots, rebuild `TaskNook.exe` with its matching
`desktop-update.json`, and run the frozen self-test on isolated app data.

The reference folder is `docs/inpso/` (the existing spelling). Treat its
screenshots as design evidence, not artwork to copy into the shipped app.
See `MODEL-REVIEW.md` for findings and review evidence.

## Renderer decisions

The shipped renderer remains SVG. A runtime 3D migration requires a separate
cohesion and performance spike; pre-rendered characters cannot preserve the
continuous customization and limb animation contracts. The
[August renderer evaluation](archive/RENDERER-EVALUATION-2026-08-19.md) records
the alternatives and the superseded proportion experiments. Use `MODELS.md`
for the current rig.
