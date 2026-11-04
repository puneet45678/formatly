"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_FORMAT, isFormatId } from "@/formats/registry";
import type { FormatId } from "@/formats/types";
import { STORAGE_KEYS, readStored } from "@/lib/storage";

/** The format "/" should open: the last one used, if it's still valid. */
export function pickStartFormat(stored: string | null): FormatId {
  return isFormatId(stored) ? stored : DEFAULT_FORMAT;
}

// A static export can't redirect on the server, so "/" redirects in the browser.
export function RootRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace(`/${pickStartFormat(readStored(STORAGE_KEYS.lastFormat))}`);
  }, [router]);

  return null;
}
