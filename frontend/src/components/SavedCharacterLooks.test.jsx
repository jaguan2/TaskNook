// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import SavedCharacterLooks from "./SavedCharacterLooks";
import { useSavedLooks } from "../lib/useSavedLooks";
import { DEFAULT_CHARACTER } from "../lib/profile";
import { removeStored } from "../lib/storage";

afterEach(cleanup);
const toast = () => {};
function Harness() {
  const [character, setCharacter] = useState({ ...DEFAULT_CHARACTER, garment: "turtleneck" });
  const { savedLooks, saveCharacterLook, removeCharacterLook } = useSavedLooks(toast);
  return <>
    <output aria-label="Current outfit">{character.garment} {character.skin}</output>
    <button onClick={() => setCharacter({ ...DEFAULT_CHARACTER, garment: "overalls", skin: "#8d5524" })}>Change outfit</button>
    <SavedCharacterLooks character={character} looks={savedLooks} onPick={setCharacter} onSave={saveCharacterLook} onRemove={removeCharacterLook} />
  </>;
}
it("saves, restores an outfit while preserving skin and confirms deletion", () => {
  removeStored("tasknook.characterLooks");
  render(<Harness />);
  fireEvent.change(screen.getByLabelText("Outfit name"), { target: { value: "My knits" } });
  fireEvent.click(screen.getByRole("button", { name: "Save look" }));
  expect(screen.getByLabelText("Outfit name").value).toBe("");
  fireEvent.click(screen.getByText("Change outfit"));
  fireEvent.click(screen.getByRole("button", { name: "Wear My knits" }));
  expect(screen.getByLabelText("Current outfit").textContent).toBe("turtleneck #8d5524");
  fireEvent.click(screen.getByRole("button", { name: "Remove outfit My knits" }));
  expect(screen.getByRole("button", { name: "Wear My knits" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Remove outfit My knits" }));
  expect(screen.queryByRole("button", { name: "Wear My knits" })).toBeNull();
});
