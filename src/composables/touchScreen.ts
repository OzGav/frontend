import { useMediaQuery } from "@vueuse/core";

/**
 * Whether the screen has no hover, as on phones and tablets, shared by every
 * caller instead of one listener each.
 */
export const isTouch = useMediaQuery("(hover: none)");
