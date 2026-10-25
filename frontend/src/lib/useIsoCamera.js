import { useCallback, useEffect, useRef, useState } from "react";
import { TILE_W } from "./iso";
import { readStored, writeStored } from "./storage";

export const DEFAULT_ISO_VIEW = { x: 0, y: 0, w: 640, h: 480 };
const VIEW_MIN_W = 220;
const VIEW_MAX_W = 1600;

function loadView() {
  try {
    const view = JSON.parse(readStored("tasknook.isoView") || "null");
    if (
      view &&
      [view.x, view.y, view.w, view.h].every(Number.isFinite) &&
      view.w >= VIEW_MIN_W &&
      view.w <= VIEW_MAX_W
    ) return view;
  } catch {
    // Corrupted device state falls back to the canonical view.
  }
  return DEFAULT_ISO_VIEW;
}

function clampView(view) {
  const margin = 60;
  return {
    ...view,
    x: Math.min(320 - margin, Math.max(320 + margin - view.w, view.x)),
    y: Math.min(240 - margin, Math.max(240 + margin - view.h, view.y)),
  };
}

/** Camera state, persistence and pointer-rate pan compositing for IsoRoom. */
export function useIsoCamera({ size, saveView }) {
  const svgRef = useRef(null);
  const panLayerRef = useRef(null);
  const panRef = useRef(null);
  const [view, setView] = useState(() => saveView ? loadView() : { ...DEFAULT_ISO_VIEW });
  const viewRef = useRef(view);
  viewRef.current = view;
  const saveViewRef = useRef(saveView);
  saveViewRef.current = saveView;
  const sizeRef = useRef(size);
  sizeRef.current = size;
  const persistTimer = useRef(null);
  const pendingView = useRef(null);

  const flushView = useCallback(() => {
    clearTimeout(persistTimer.current);
    if (!pendingView.current) return;
    writeStored("tasknook.isoView", JSON.stringify(pendingView.current));
    pendingView.current = null;
  }, []);
  useEffect(() => flushView, [flushView]);

  const applyView = useCallback((next) => {
    const clamped = clampView(next);
    viewRef.current = clamped;
    setView(clamped);
    if (!saveViewRef.current) return;
    pendingView.current = clamped;
    clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => {
      writeStored("tasknook.isoView", JSON.stringify(clamped));
      pendingView.current = null;
    }, 300);
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return undefined;
    const onWheel = (event) => {
      event.preventDefault();
      const ctm = svg.getScreenCTM();
      if (!ctm) return;
      const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(ctm.inverse());
      const current = viewRef.current;
      const factor = event.deltaY > 0 ? 1.12 : 1 / 1.12;
      const roomSpan = ((sizeRef.current.w + sizeRef.current.d) * TILE_W) / 2;
      const width = Math.min(
        Math.max(VIEW_MAX_W, roomSpan * 1.25),
        Math.max(VIEW_MIN_W, current.w * factor)
      );
      const scale = width / current.w;
      if (scale === 1) return;
      applyView({
        x: point.x - (point.x - current.x) * scale,
        y: point.y - (point.y - current.y) * scale,
        w: width,
        h: current.h * scale,
      });
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [applyView]);

  const toWorld = useCallback((event) => {
    const ctm = svgRef.current?.getScreenCTM();
    return ctm
      ? new DOMPoint(event.clientX, event.clientY).matrixTransform(ctm.inverse())
      : null;
  }, []);

  const beginPan = useCallback((event) => {
    panRef.current = {
      clientX: event.clientX,
      clientY: event.clientY,
      view: { ...viewRef.current },
      dx: 0,
      dy: 0,
    };
    svgRef.current?.setPointerCapture?.(event.pointerId);
  }, []);

  const movePan = useCallback((event) => {
    const pan = panRef.current;
    if (!pan) return;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect?.width || !rect.height) return;
    pan.dx = ((event.clientX - pan.clientX) * pan.view.w) / rect.width;
    pan.dy = ((event.clientY - pan.clientY) * pan.view.h) / rect.height;
    panLayerRef.current?.setAttribute("transform", `translate(${pan.dx} ${pan.dy})`);
  }, []);

  const cancelPan = useCallback(() => {
    panLayerRef.current?.removeAttribute("transform");
    panRef.current = null;
  }, []);

  const commitPan = useCallback(() => {
    const pan = panRef.current;
    if (!pan) return;
    const next = clampView({
      ...pan.view,
      x: pan.view.x - (pan.dx || 0),
      y: pan.view.y - (pan.dy || 0),
    });
    svgRef.current?.setAttribute("viewBox", `${next.x} ${next.y} ${next.w} ${next.h}`);
    applyView(next);
    cancelPan();
  }, [applyView, cancelPan]);

  const resetView = useCallback(() => applyView(DEFAULT_ISO_VIEW), [applyView]);

  return {
    svgRef,
    panLayerRef,
    view,
    toWorld,
    beginPan,
    movePan,
    cancelPan,
    commitPan,
    resetView,
  };
}
