# Modeling roadmap: the entire catalog and resident

The work is a catalog-wide art redesign. The Virtual Cottage 2 references show
objects constructed from believable materials and characters settled into
furniture. Adding particles or recolouring generic boxes cannot produce that.
The current path is to author better SVG silhouettes, construction and poses
while preserving customisation and the existing placement/animation system.
A renderer migration is a separate decision; the older research remains below.
`MODELS.md` describes current implementation, not future targets.

Fixed common places now have a first usable scene alongside the editable
home. [Common rooms](COMMON_ROOMS.md) records the Common Cottage's connected
spaces, raised reading floor, simulated neighbours and six selectable seats.
Its floors and solid steps are authored at real heights in a fixed renderer;
the catalog stair sprite still does not provide an upper floor for editable
homes. Architecture, materials and seating poses need further art review.
Keep this scene work separate from the catalog-wide model redesign.

The seating follow-up replaces the armchair/sofa's tall box sides with
curved padded panels and visible timber frames, gives the desk chair a
shaped back shell and layered seat, and opens the garden bench into separate
slats, rails and legs. Existing seating anchors and heights are unchanged.
The art sheet now includes furniture contact at body extremes in both
facings and idle/focus/break, alongside cream/dark/sage material views.

All **161 catalog entries in 18 groups** have been reviewed in a labelled
contact sheet, including every advertised rear view. `npm run art` now writes
`frontend/art-sheet/catalog.json` and the complete `catalog-*` SVG fixtures,
as well as all wardrobe fixtures. An item absent from presets still gets reviewed.

## Order of work

| Priority | Batch | What makes it worth doing |
|---|---|---|
| 1 | Resident at the window desk | A real seated profile, shaped jaw, visible neck, angled shoulders and hands at the work surface. The skewed perspective prototype was rejected by the owner and reverted. Design a coherent seated silhouette and garment planes before rigging it. |
| 1 | Main seating, bed and desk | Rounded upholstery, supported timber frames and layered bedding. Add the reference's raised platform bed as its own design, not a misleading repaint of the existing bed. |
| 1 | Storage and plants | Recessed cabinets, individual contents and species-specific leaves. The first detailed plant/storage pass is implemented; pots and secondary pieces need further work. |
| 2 | Kitchen and appliances | Distinct doors, handles, rims, supporting feet and material thickness. |
| 2 | Seasonal trees and outdoor structures | Replace stacked oval canopies and solid stair blocks with branching foliage and joined construction. |
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
All eight starting looks remain complete and editable. Loft, Corner café and
Reading room now make more deliberate use of the refined fern, orchid and
table-lamp models; new common-room props also use the updated upholstery and
storage. These are refinements, not completion of the resident backlog.

Review both body models and all eight complete looks (fall girl/guy,
school girl/boy, office female/male, lofi girl, cozy gamer), front and rear,
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
| Oval rug (`ovalrug`) | Pending | Irregular textile edge and thickness that follows the ellipse. |
| Door mat (`matrug`) | Pending | Woven reed strips and binding, distinct from the soft rugs. |
| Pond (`pond`) | Pending | Stone bank, shallows and irregular waterline rather than a flat diamond. |
| Picnic blanket (`picnic`) | Pending | Cloth thickness, gathered corner and spaced checks following projection. |
| Patterned rug (`persianrug`) | Pending | Readable border construction and less uniform fringe. |
| Striped rug (`stripedrug`) | Pending | Bound edges and a stripe rhythm that survives distant viewing. |
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
| Desk chair (`deskchair`) | Refined this pass | Arm support structure and quarter-view sitter alignment; retain the shaped back shell and layered padded seat. |
| Beanbag (`beanbag`) | Pending | One pear-shaped slumped cloth body with gathered base, replacing oval layers. |
| Wooden stool (`woodstool`) | Pending | Carved seat, splayed legs and visible stretcher joints. |
| Fallen log (`log`) | Pending | Uneven bark silhouette, exposed end grain and a grounded cut face. |
| Garden bench (`bench`) | Refined this pass | Joinery at the slat supports and subtle timber wear; separate slats, rails and open under-seat construction are now implemented. |
| Hammock (`hammock`) | Pending | Sagging woven sling, tied ends and a frame whose tension reads clearly. |

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
| Laundry basket (`basket`) | Pending | Woven wall construction and irregular folded laundry. |
| Coat rack (`coatrack`) | Pending | Sculpted hooks, hanging cloth silhouettes and thicker timber joints. |
| Ladder shelf (`ladder`) | Pending | Actual shelf boards with depth, angled side rails and books resting on them. |
| Stacked crates (`crates`) | Pending | Open slats, hand cutouts and visible contents instead of closed boxes. |
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
| Flower patch (`flowerbed`) | Pending | Soil bed edge and clustered blooms of different heights. |

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
| Maple (`mapletree`) | Pending | Branching trunk and irregular maple canopy clusters instead of stacked ovals. |
| Leaf pile (`leafpile`) | Pending | Overlapping broad leaf groups and uneven low mound outline. |
| Hay bale (`haybale`) | Pending | Rounded bound straw volume and bands that wrap both visible faces. |
| Pumpkin (`pumpkin`) | Pending | Stronger lobed silhouette and recessed stalk rather than surface stripes alone. |
| Jack-o'-lantern (`jackolantern`) | Pending | Cut openings with thickness and an uneven segmented shell. |
| Rake (`rake`) | Pending | Separated metal teeth and a believable handle/head connection. |
| Scarecrow (`scarecrow`) | Pending | Loose cloth sleeves, hat brim depth and visible crossbar attachment. |
| Turkey (`turkey`) | Pending | Layered feather shapes and distinct neck/head volume. |
| Wreath (`wreath`) | Pending | An irregular leafy ring with overlapping branches and tied ribbon. |

### Winter

| Item (catalog key) | Status | Next modeling work |
|---|---|---|
| Snowy pine (`snowpine`) | Pending | Uneven loaded boughs and snow caps with physical thickness. |
| Snowman (`snowman`) | Pending | Slightly irregular snow masses, inset facial pieces and wrapped scarf. |
| Snow drift (`snowdrift`) | Pending | Low irregular snow mound with a grounded underside. |
| Snowballs (`snowballs`) | Pending | Compressed snow spheres with soft contact stacking. |
| Christmas tree (`christmastree`) | Pending | Layered branch silhouette, wrapped garland and supported ornaments. |
| Snow angel (`snowangel`) | Pending | Depressed snow impression with a shallow rim, not an outlined figure. |
| Christmas lights (`christmaslights`) | Pending | Individual bulb housings and a sagging supported cable. |
| Snowy chimney (`chimney`) | Pending | Brick courses, mortar recess and separate cap/smoke opening. |
| Firewood (`logstack`) | Pending | Unequal split logs, bark sides and projecting cut ends. |
| Ice lantern (`icelantern`) | Pending | Thick translucent shell, melted rim and inset candle. |
| Icicles (`icicles`) | Pending | Unequal tapered hanging shards with supported attachment edges. |

### Spring

| Item (catalog key) | Status | Next modeling work |
|---|---|---|
| Blossom tree (`blossomtree`) | Pending | Branching tree with irregular blossom clusters and visible gaps. |
| Tulips (`tulips`) | Pending | Cup-shaped petal heads, curved broad leaves and unequal stems. |
| Watering can (`wateringcan`) | Pending | Rounded reservoir, rolled rim, hollow spout and separate handle. |
| Bird bath (`birdbath`) | Pending | Thick carved basin, water recess and sculpted pedestal. |
| Seedlings (`seedtray`) | Pending | Raised tray edges, separate soil cells and varied seedlings. |
| Bunting (`bunting`) | Pending | Sagging cord, folded cloth flags and visible attachment points. |

### Summer

| Item (catalog key) | Status | Next modeling work |
|---|---|---|
| Swimming pool (`pool`) | Pending | Thick coping, inset waterline, step entry and readable shallow/deep planes. |
| Coconut palm (`coconutpalm`) | Pending | Curved trunk, hanging segmented fronds and coconuts nestled at the crown. |
| Pool umbrella (`poolumbrella`) | Pending | Curved fabric panels, ribs and a more grounded stand. |
| Beach ball (`beachball`) | Pending | Panel seams following a rounded sphere and floor contact. |
| Sun lounger (`sunlounger`) | Pending | Curved reclining seat, separate slats and visible hinge structure. |

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
| Curtains (`curtain`) | Pending | Grouped draping folds, tied-back volume and visible curtain rail. |
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
| Tree (`tree`) | Refined this pass | Unequal branching crown masses and a bark/branch construction pass. |
| Pine tree (`pine`) | Pending | Individual branch tiers and irregular needle silhouette. |
| Birch tree (`birch`) | Refined this pass | Branch splits and a lighter, more open cluster arrangement. |
| Hedge (`hedge`) | Pending | Irregular clipped foliage top and visible rooted base. |
| Rock (`rock`) | Pending | Unequal facets, chipped outline and a grounded underside. |
| Bush (`bush`) | Refined this pass | Unequal leaf groups with visible inner branching. |

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

---

The following renderer/proportion research is a historical decision record.
Claims about what the rig supported at that time are not current acceptance
criteria. In particular, the old adult-proportion pivot and a claim that a
standing side rig already provided the desk pose have been superseded by
`MODELS.md` and the rejected seated-perspective experiment described above.

## Historical renderer decision: modelling roadmap — how the characters get to "actually 3D"

Current implementation note (2026-09-10): the later reference review restored
`HEAD_SCALE = 1` while keeping the longer legs. `docs/MODELS.md` and
`lib/body.js` describe the shipped proportions; the adult-pivot decision
below is historical. Bob and long hairstyles now have continuous rear
silhouettes that cover the back instead of being hidden by the torso.

Written 2026-08-19, from a research pass over three candidate pipelines. The
owner's goal: models that look **3D, cohesive, and normal** — and openness to
"actual modelling instead of just formatting with CSS", thinking long-term.
This file is the decision record; docs/MODELS.md stays the authority on how
today's models are drawn.

## Where we are

The characters are parametric SVG: a body rig (`lib/body.js` numbers,
`character/` artwork), registries for hair/garments/hats/scarves, and a
CSS-keyframe animation substrate that survives the scene's 1Hz re-render.
Three facts about this system constrain every pipeline choice:

1. **The customization space is effectively infinite.** ~575k discrete
   silhouette combinations, times three CONTINUOUS body sliders
   (width/height/torso), times six independent user-picked hex colour
   channels with luminance-adaptive shading (`toneFor`) and derived far-limb
   colours (`farColor`).
2. **Animation is structural.** Up to six nested CSS-animation wrappers per
   figure animate SUB-PARTS (per-limb stride clocks, head-only gestures, the
   held-pose dangle with a mug riding inside an arm group). Anything that
   flattens the figure to an image loses all of it.
3. **The camera is viewBox math** — any raster asset blurs on zoom. The
   repo already paid for this lesson once: the Kenney PNG furniture renders
   were removed (see IsoItems.jsx's header) for exactly this plus the
   tint problem.

## The three options, evaluated

### A. Richer SVG modelling — SHIPPED (2026-08-19)
Soft-volume gradients over the existing rigs: `character/volume.jsx` defines
a sphere (heads, pet masses) and a cylinder (torsos) as stacks of translucent
GLINT/SHADE stops — recolour-safe by construction, GPU paint servers with no
per-frame cost. The hard cel marks stay; gradient + crescent together is what
reads as modelled. **The guardrail: deltas stay subtle** (the furniture is
deliberately flat three-tone, and a figure shaded much softer than its sofa
reads as pasted from another kit — the §10 cohesion rule, in reverse).
**Never SVG filters** (feGaussianBlur etc.): they force per-frame
re-rasterization under animation, the exact CPU bill the memo'd scene avoids.
Ceiling: excellent 2D. It will never read as *rendered*.

### B. Pre-rendered 3D sprites — RULED OUT
Blender-rendered sprite sheets fail every constraint at once: the continuous
sliders can't re-derive raster anchors (disqualifying on its own), faithful
6-channel hex recolour on rasters means rebuilding a renderer at runtime,
per-limb CSS animation dies, and the viewBox camera blurs every raster — the
Kenney lesson at 100× the asset count. Do not revisit.

### C. Runtime 3D (three.js / react-three-fiber) — THE LONG-TERM PATH
Everything hard about A and B is natural here: recolour is
`material.color.set(hex)`, the sliders map to bone scales (continuous by
nature), skeletal animation replaces six keyframe classes with one walk clip
that works at ANY angle, and wardrobe pieces are mesh swaps (~54 assets,
comparable to today's registry count). A toon gradient-map shader in the §10
palette keeps the look.

**The killer problem is the hybrid seam**: the room is ONE svg depth-sorted
by paint order; a WebGL character layered over it breaks the moment anyone
walks behind a sofa. Every workaround (foreignObject, render-to-texture,
GL depth proxies for 150 furniture items) is bad. So "characters-only 3D" is
a waystation — the stable end state is the WHOLE scene in one WebGL canvas:
furniture as the existing SVG art rasterized to billboard quads (2:1
dimetric maps 1:1 onto an orthographic camera; `project()` already is one),
depth from the same front-corner sort written to z, characters as true
meshes. Ports required: painted-pixel hit-testing → raycasting, `applyHeld`
→ per-frame ref writes, `--phase` desync → per-instance time offsets,
`prefers-reduced-motion` by hand. Bundle: ~200KB gzip (fine for a desktop
app). WebView2 does WebGL2; SwiftShader fallback is a small support risk.

Effort, honestly: **20–40 days after a successful spike.** It re-platforms
the app's most-loved layer; commit only with the seam proven.

## The gate: a 3–5 day throwaway spike

Before any commitment, build an offline spike page (not wired into the app):

- One R3F canvas, orthographic camera byte-matching `project()` from lib/iso.js
- One low-poly character blockout with:
  1. toon gradient-map shader in the SHADE/GLINT palette
  2. live hex recolour on 3 channels
  3. width/height sliders driven by bone scale
  4. one walk clip
  5. two furniture sprites rasterized to billboards at two depths, with the
     character walking BETWEEN them
- Screenshot it beside the real room.

**Pass/fail is one question, answered by the owner's eye: does the mesh sit
in the same world as the SVG furniture?** If yes → plan the full migration.
If no → Option A was the ceiling, and it has already shipped.

## VC2 reference notes (2026-08-19 - owner supplied Virtual Cottage 2 art)

What the reference actually does, read off the capsule/screenshots:

1. **Proportions are ADULT, not chibi** - roughly 5 heads tall, real necks,
   long legs. TaskNook's figure is ~2.4 heads at 57px (the clay-toy kit
   reference of the earlier retunes). These are different families: moving
   to VC2 proportions is a re-proportion of the whole rig (seat heights,
   hitH, walk stride, every garment), not a tune. Decide deliberately, once
   the owner's full reference set arrives.
2. **The shading is painterly, one warm light.** Soft two-step value ramps
   on every mass, a warm ambient wash (sunset oranges), and rim light off
   the window/lamp. Our equivalent lever is the soft-volume pass + toneFor
   strengths - a "warm room light" pass (slightly warm GLINT everywhere,
   cool SHADE) would move us closer without new geometry.
3. **Hair is a SILHOUETTE with 2-3 interior value steps** - chunky locks,
   a ponytail that reads at any size. Ours already follows this doctrine;
   the gap is value steps (we have shadow wedges + one light band).
4. **Characters are seen 3/4-back, seated, typing** - VC2's identity shot.
   Historical assessment: the earlier rigs approximated this pose. The
   follow-up review found their front/rear seating insufficient; the current
   chair perspective prototype was later rejected and reverted. The new pose
   must be designed as a coherent silhouette before adding animation.
5. **What ports NOW without a proportion decision**: warmer light pass,
   hair value steps, upright posture (done 2026-08-19 - the lean is fixed),
   consistent front-lit profile (done same day).

**DECIDED (2026-08-19, same day)**: the owner chose ADULT proportions ("we
can make our characters adult proportioned as well"). Shipped via
`HEAD_SCALE` in lib/body.js — the head unit scales about its centre so all
authored assets ride along, legs +2px, ~5 heads at the same room height.
The owner's additional VC2 reference images will drive the NEXT layer:
painterly warm-light pass and hair value steps (points 2-3 above).
