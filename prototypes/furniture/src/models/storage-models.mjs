import { bookshelf, bookcase, openShelf, ladderShelf } from './storage-shelves.mjs';
import { wardrobe, dresser, tvCabinet } from './storage-cabinets.mjs';
import { crates, vinylCrate, basket } from './storage-containers.mjs';
import { bookTrolley, coatRack, pastryCase } from './storage-fixtures.mjs';

export const STORAGE_BUILDERS = {
  bookshelf, bookcase, shelf: openShelf, wardrobe, dresser, tvunit: tvCabinet,
  pastrycase: pastryCase, crates, basket, vinylcrate: vinylCrate,
  ladder: ladderShelf, coatrack: coatRack, booktrolley: bookTrolley,
};
