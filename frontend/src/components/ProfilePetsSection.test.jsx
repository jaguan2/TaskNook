// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

import ProfilePetsSection from "./ProfilePetsSection";
import { PET_SPRITES } from "./IsoPetItems";
import { ISO_ITEMS } from "../lib/isoRoom";

afterEach(cleanup);

const emptyRoom = { placements: [] };
const cat = { id: "cat-1", item: "cat", name: "Miso", temper: "mellow", look: "ink" };
const dog = { id: "dog-1", item: "dog", name: "Pip", temper: "sleepy", look: "golden" };

function renderPets(placements = [], overrides = {}) {
  const props = {
    isoRoom: placements.length ? { placements } : emptyRoom,
    setPetIdentity: vi.fn(),
    addIsoItem: vi.fn(),
    removeIsoItem: vi.fn(),
    ...overrides,
  };
  render(<ProfilePetsSection {...props} />);
  return props;
}

describe("ProfilePetsSection", () => {
  it("has preview artwork for every adoptable roaming species", () => {
    const roamers = Object.entries(ISO_ITEMS)
      .filter(([, item]) => item.roamer)
      .map(([key]) => key);
    expect(Object.keys(PET_SPRITES).sort()).toEqual(roamers.sort());
  });

  it("adopts one chosen species and collapses the chooser", () => {
    const { addIsoItem } = renderPets();

    const adopt = screen.getByRole("button", { name: /Adopt/ });
    expect(adopt.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(adopt);
    expect(screen.getByRole("button", { name: /A cat/ })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /A cat/ }));
    expect(addIsoItem).toHaveBeenCalledTimes(1);
    expect(addIsoItem).toHaveBeenCalledWith("cat");
    expect(screen.queryByRole("button", { name: /A cat/ })).toBeNull();
  });

  it("saves names on blur and sends exact temper and coat patches", () => {
    const { setPetIdentity } = renderPets([cat]);
    const name = screen.getByRole("textbox", { name: "Pet name" });

    fireEvent.focus(name);
    fireEvent.change(name, { target: { value: "  Soot  " } });
    expect(setPetIdentity).not.toHaveBeenCalled();
    const blur = vi.spyOn(name, "blur").mockImplementation(() => {});
    fireEvent.keyDown(name, { key: "Enter" });
    expect(blur).toHaveBeenCalledTimes(1);
    expect(setPetIdentity).not.toHaveBeenCalled();
    blur.mockRestore();
    fireEvent.blur(name);
    expect(setPetIdentity).toHaveBeenNthCalledWith(1, "cat-1", { name: "  Soot  " });

    fireEvent.click(within(screen.getByRole("group", { name: "Temper" })).getByRole("button", { name: "Curious" }));
    fireEvent.click(within(screen.getByRole("group", { name: "Coat" })).getByRole("button", { name: "Calico" }));
    expect(setPetIdentity).toHaveBeenNthCalledWith(2, "cat-1", { temper: "curious" });
    expect(setPetIdentity).toHaveBeenNthCalledWith(3, "cat-1", { look: "calico" });
  });

  it("requires an explicit second step before rehoming", () => {
    const { removeIsoItem } = renderPets([cat]);

    fireEvent.click(screen.getByRole("button", { name: "Find them a new home" }));
    const firstDialog = screen.getByRole("alertdialog", { name: "Find them a new home?" });
    fireEvent.click(within(firstDialog).getByRole("button", { name: "Keep them" }));
    expect(removeIsoItem).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Find them a new home" }));
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "New home" }));
    expect(removeIsoItem).toHaveBeenCalledTimes(1);
    expect(removeIsoItem).toHaveBeenCalledWith("cat-1");
  });

  it("keeps changes scoped to the selected pet", () => {
    const { setPetIdentity } = renderPets([cat, dog]);
    const cards = screen.getAllByRole("textbox", { name: "Pet name" }).map((input) => input.closest(".relative"));
    const dogCard = cards[1];

    fireEvent.click(within(dogCard).getByRole("button", { name: "Curious" }));
    fireEvent.click(within(dogCard).getByRole("button", { name: "Husky" }));

    expect(setPetIdentity).toHaveBeenNthCalledWith(1, "dog-1", { temper: "curious" });
    expect(setPetIdentity).toHaveBeenNthCalledWith(2, "dog-1", { look: "husky" });
  });
});
