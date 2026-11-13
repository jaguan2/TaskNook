// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import RoomTintPicker from "./RoomTintPicker";
import { hexToHsl } from "../lib/palette";
import { FURNITURE_COLOR_PARTS, withFurnitureColor } from '../lib/furnitureColors';

afterEach(cleanup);

it('shows the authored default colour before tinting instead of a different swatch', () => {
  render(<RoomTintPicker placement={{ id: 'sofa', item: 'sofa' }}
    item={{ label: 'Sofa', defaultColor: '#8baba0' }} onTint={vi.fn()} />);
  expect(screen.getByRole('textbox', { name: 'Finish colour hex' }).value).toBe('#8baba0');
  expect(screen.getAllByRole('slider')[0].value).toBe(String(Math.round(hexToHsl('#8baba0').h)));
});

it('edits and resets bed materials independently with the same colour controls', () => {
  let placement = { id: 'bed-one', item: 'bed', tint: '#778899', colors: { frame: '#112233', pillows: '#445566' } };
  const item = { label: 'Bed', colorParts: FURNITURE_COLOR_PARTS.bed };
  const onTint = vi.fn((id, value, part) => {
    placement = withFurnitureColor(placement, value, part);
    rerender(<RoomTintPicker placement={placement} item={item} onTint={onTint} />);
  });
  const { rerender } = render(<RoomTintPicker placement={placement} item={item} onTint={onTint} />);
  fireEvent.change(screen.getByRole('combobox', { name: 'Furniture part' }), { target: { value: 'sheets' } });
  fireEvent.change(screen.getByRole('textbox', { name: 'Sheets colour hex' }), { target: { value: '#abcdef' } });
  expect(placement).toMatchObject({ tint: '#778899', colors: { frame: '#112233', pillows: '#445566', sheets: '#abcdef' } });
  fireEvent.click(screen.getByRole('button', { name: 'Reset sheets colour' }));
  expect(placement.colors).toEqual({ frame: '#112233', pillows: '#445566' });
  fireEvent.change(screen.getByRole('combobox', { name: 'Furniture part' }), { target: { value: 'main' } });
  fireEvent.change(screen.getByRole('textbox', { name: 'Blanket colour hex' }), { target: { value: '#aabbcc' } });
  expect(placement.tint).toBe('#aabbcc');
  expect(placement.colors.pillows).toBe('#445566');
});

// A piece that offers free tinting (SVG art) …
const PAINTABLE = { label: "Floor cushion" };
// … and one that ships fixed pre-shaded colourways (a rendered PNG).
const VARIANT = {
  label: "Bed",
  variants: { "#e0774a": "orange", "#7f9ec9": "blue" },
};

const at = (id, tint) => ({ id, item: "cushion", ...(tint && { tint }) });

function sliders() {
  return document.querySelectorAll('input[type="range"]');
}

describe("RoomTintPicker — the two pickers are separate components", () => {
  it("shows swatches only for a colourway item", () => {
    render(<RoomTintPicker placement={at("a")} item={VARIANT} onTint={() => {}} />);
    expect(screen.getByText(/set colours/i)).toBeTruthy();
    expect(sliders().length).toBe(0);
  });

  it("shows the full H/S/L picker for a paintable item", () => {
    render(<RoomTintPicker placement={at("b")} item={PAINTABLE} onTint={() => {}} />);
    expect(sliders().length).toBe(3);
  });

  it("survives swapping between the two kinds", () => {
    // Regression: these used to be one component with an early return above
    // the hooks, so selecting a bed after a cushion changed the hook COUNT
    // between renders — an outright React crash, found by ESLint.
    const { rerender } = render(
      <RoomTintPicker placement={at("b")} item={PAINTABLE} onTint={() => {}} />
    );
    expect(() => {
      rerender(<RoomTintPicker placement={at("a")} item={VARIANT} onTint={() => {}} />);
      rerender(<RoomTintPicker placement={at("b")} item={PAINTABLE} onTint={() => {}} />);
    }).not.toThrow();
    expect(sliders().length).toBe(3);
  });

  it("renders nothing for an item that is no longer in the catalog", () => {
    const { container } = render(
      <RoomTintPicker placement={{ id: "x", item: "atlantis" }} onTint={() => {}} />
    );
    expect(container.innerHTML).toBe("");
  });
});

describe("RoomTintPicker — lightness is a round trip", () => {
  it("keeps the hue after a trip to black", () => {
    // Regression: h/s/l were re-derived from the committed hex every render.
    // Drag Lightness to 0 and the tint is #000000, whose hue and saturation
    // are 0 BY DEFINITION — so the hue and saturation sliders snapped to the
    // left and then wrote black wherever you dragged them. Only a swatch or
    // the hex field could escape.
    const onTint = vi.fn();
    let placement = at("b", "#7f9ec9"); // a clear blue
    const blueHue = hexToHsl("#7f9ec9").h;

    const { rerender } = render(
      <RoomTintPicker placement={placement} item={PAINTABLE} onTint={onTint} />
    );
    // The picker is controlled: each commit comes back as a new placement.
    onTint.mockImplementation((_id, tint) => {
      placement = at("b", tint);
      rerender(<RoomTintPicker placement={placement} item={PAINTABLE} onTint={onTint} />);
    });

    const [hue, , lightness] = sliders();
    fireEvent.change(lightness, { target: { value: "0" } });
    expect(placement.tint).toBe("#000000");

    // The hue slider must still be where we left it, not reset to 0…
    expect(Number(hue.value)).toBeCloseTo(Math.round(blueHue), 0);
    // …and dragging lightness back up must return a colour, not more black.
    fireEvent.change(lightness, { target: { value: "60" } });
    expect(placement.tint).not.toBe("#000000");
    expect(hexToHsl(placement.tint).h).toBeCloseTo(blueHue, 0);
  });

  it("adopts a tint set from outside the sliders", () => {
    const onTint = vi.fn();
    const { rerender } = render(
      <RoomTintPicker placement={at("b", "#7f9ec9")} item={PAINTABLE} onTint={onTint} />
    );
    const [hue] = sliders();
    const before = Number(hue.value);

    // A quick-pick swatch commits a colour the sliders didn't produce.
    rerender(<RoomTintPicker placement={at("b", "#7faf8f")} item={PAINTABLE} onTint={onTint} />);
    expect(Number(sliders()[0].value)).not.toBe(before);
    expect(Number(sliders()[0].value)).toBeCloseTo(Math.round(hexToHsl("#7faf8f").h), 0);
  });
});
