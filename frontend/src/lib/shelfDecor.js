// Placement data only. Rendering and controls share these bounded choices;
// the room's existing storage gateway persists them with the rest of the item.
export const SHELF_ITEMS = ['bookshelf', 'bookcase', 'shelf', 'ladder', 'wallshelf', 'plantshelf'];
export const SHELF_LAYOUTS = { books: 'Books', plants: 'Plants', mixed: 'Books & plants', empty: 'Open shelves' };
export const BOOK_COLORS = ['#cf765c', '#598fa4', '#8a79b5', '#6b986a', '#d0a34d'];

export function cleanShelfDecor(item, value) {
  if (!SHELF_ITEMS.includes(item) || !value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const layout = Object.hasOwn(SHELF_LAYOUTS, value.layout) ? value.layout : undefined;
  const bookColor = typeof value.bookColor === 'string' && /^#[0-9a-f]{6}$/i.test(value.bookColor) ? value.bookColor.toLowerCase() : undefined;
  return layout || bookColor ? { ...(layout && { layout }), ...(bookColor && { bookColor }) } : undefined;
}
