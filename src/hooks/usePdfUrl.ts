import { useState, useEffect, useRef, createElement } from "react";
import { pdf } from "@react-pdf/renderer";
import MenuDocument from "../components/Preview/MenuDocument";
import type {
  MenuData,
  Orientation,
  LayoutDirection,
} from "../types/menu";

interface UsePdfUrlOptions {
  menuData: MenuData;
  columnCount: number;
  layoutDirection: LayoutDirection;
  orientation: Orientation;
  debounceMs?: number;
}

interface UsePdfUrlResult {
  url: string | null;
  isLoading: boolean;
  error: Error | null;
}

export function usePdfUrl({
  menuData,
  columnCount,
  layoutDirection,
  orientation,
  debounceMs = 300,
}: UsePdfUrlOptions): UsePdfUrlResult {
  const [url, setUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const prevUrlRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef(false);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    abortRef.current = false;
    setIsLoading(true);

    timerRef.current = setTimeout(async () => {
      try {
        const doc = createElement(MenuDocument, {
          menuData,
          columnCount,
          layoutDirection,
          orientation,
        });
        const blob = await pdf(doc).toBlob();

        if (abortRef.current) return;

        // Revoke previous object URL to avoid memory leaks
        if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current);

        const nextUrl = URL.createObjectURL(blob);
        prevUrlRef.current = nextUrl;
        setUrl(nextUrl);
        setError(null);
      } catch (err) {
        if (!abortRef.current) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (!abortRef.current) setIsLoading(false);
      }
    }, debounceMs);

    return () => {
      abortRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuData, columnCount, layoutDirection, orientation, debounceMs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current);
    };
  }, []);

  return { url, isLoading, error };
}
