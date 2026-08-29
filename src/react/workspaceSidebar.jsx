import React from "react";

/**
 * The previous left context rail was removed from the Editor. Its two useful
 * responsibilities now live with their intent: canvas views sit below the
 * Editor title and loop reading lives in the Mapa e descrição dock panel.
 * Keep the portal owner as a harmless null surface while the legacy shell
 * retains this mount point for compatibility.
 */
export function WorkspaceSidebar() { return null; }
