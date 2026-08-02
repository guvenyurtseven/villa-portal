"use client";

import { useLayoutEffect, useState, type RefObject } from "react";

export type AnchoredPosition = {
  top: number;
  left: number;
  width: number;
};

type AnchoredPositionOptions = {
  margin?: number;
  minWidth?: number;
  maxWidth?: number;
  placement?: "bottom-start" | "right-start";
  viewportPadding?: number;
};

export function useAnchoredPosition(
  open: boolean,
  anchorRef: RefObject<HTMLElement | null>,
  options: AnchoredPositionOptions = {},
) {
  const margin = options.margin ?? 8;
  const minWidth = options.minWidth ?? 320;
  const maxWidth = options.maxWidth ?? 720;
  const placement = options.placement ?? "bottom-start";
  const viewportPadding = options.viewportPadding ?? 16;
  const [position, setPosition] = useState<AnchoredPosition>({
    top: 0,
    left: viewportPadding,
    width: minWidth,
  });

  useLayoutEffect(() => {
    if (!open) return undefined;

    let frame: number | null = null;

    function calculate() {
      if (frame !== null) cancelAnimationFrame(frame);

      frame = requestAnimationFrame(() => {
        const rect = anchorRef.current?.getBoundingClientRect();
        if (!rect) return;

        const maxAllowedWidth = Math.max(minWidth, window.innerWidth - viewportPadding * 2);
        const width = Math.min(Math.max(minWidth, rect.width), maxWidth, maxAllowedWidth);
        const maxLeft = window.innerWidth - width - viewportPadding;
        const canPlaceRight = rect.right + margin + width <= window.innerWidth - viewportPadding;
        const useRightPlacement = placement === "right-start" && canPlaceRight;
        const left = useRightPlacement
          ? rect.right + margin
          : Math.max(viewportPadding, Math.min(rect.left, maxLeft));
        const top = useRightPlacement ? rect.top : rect.bottom + margin;

        setPosition({
          top,
          left,
          width,
        });
      });
    }

    calculate();
    window.addEventListener("resize", calculate);
    window.addEventListener("scroll", calculate, true);

    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      window.removeEventListener("resize", calculate);
      window.removeEventListener("scroll", calculate, true);
    };
  }, [anchorRef, margin, maxWidth, minWidth, open, placement, viewportPadding]);

  return position;
}
