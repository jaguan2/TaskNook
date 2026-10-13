// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import Cottage from "./Cottage";
import { duplicatePlacement } from "../lib/room";

afterEach(cleanup);
function Harness() {
  const [room, setRoom] = useState([{ id: "sofa", item: "sofa", x: 200, y: 432, tint: "#7faf8f" }]);
  return <Cottage room={room} editMode reduceMotion
    onMoveItem={(id, x, y) => setRoom((prev) => prev.map((p) => p.id === id ? { ...p, x, y } : p))}
    onDuplicateItem={(id) => { const copy = duplicatePlacement(room, id); if (copy) setRoom([...room, copy]); }}
    onTintItem={(id, tint) => setRoom((prev) => prev.map((p) => p.id === id ? { ...p, tint } : p))}
    onRemoveItem={(id) => setRoom((prev) => prev.filter((p) => p.id !== id))} />;
}
describe("2D decoration controls", () => {
  it("selects with a keyboard, nudges, keeps text-input arrows local, copies and confirms removal", () => {
    render(<Harness />);
    fireEvent.keyDown(screen.getByRole("button", { name: "Select Cozy sofa" }), { key: "Enter" });
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByRole("button", { name: "Select Cozy sofa" }).getAttribute("transform")).toBe("translate(204,432)");
    fireEvent.keyDown(window, { key: "ArrowUp", shiftKey: true });
    expect(screen.getByRole("button", { name: "Select Cozy sofa" }).getAttribute("transform")).toBe("translate(204,412)");
    fireEvent.keyDown(screen.getByPlaceholderText("#rrggbb"), { key: "ArrowRight" });
    expect(screen.getByRole("button", { name: "Select Cozy sofa" }).getAttribute("transform")).toBe("translate(204,412)");
    fireEvent.click(screen.getByRole("button", { name: "Duplicate", exact: true }));
    expect(screen.getAllByRole("button", { name: "Select Cozy sofa" })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Select Cozy sofa" })[1].getAttribute("transform")).toBe("translate(228,424)");
    fireEvent.click(screen.getByRole("button", { name: "Remove", exact: true }));
    expect(screen.getAllByRole("button", { name: "Select Cozy sofa" })).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Remove?", exact: true }));
    expect(screen.getAllByRole("button", { name: "Select Cozy sofa" })).toHaveLength(1);
  });
});
