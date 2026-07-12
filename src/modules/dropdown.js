/**
 * Minimal replacement for Bootstrap 5's Dropdown JS, for the `[data-bs-toggle="dropdown"]`
 * menus this app uses (`.dropdown > toggle + .dropdown-menu`). One global delegated
 * listener toggles the `.show` class Bootstrap's CSS keys off, positions the menu with
 * Popper (kept for auto-flip — the sidebar user menu sits at the bottom and must open
 * upward), and closes on outside-click, item-click, or Esc.
 *
 * ponytail: only one dropdown open at a time (matches Bootstrap) and only the
 * bottom-start placement these menus need. No hover/keyboard-arrow nav — unused here.
 */
import { createPopper } from "@popperjs/core";

let open = null; // { toggle, menu, popper }

/**
 * Close the currently-open dropdown, if any.
 * @returns {void}
 */
function closeOpen() {
    if (!open) {
        return;
    }
    open.menu.classList.remove("show");
    open.toggle.classList.remove("show");
    open.toggle.setAttribute("aria-expanded", "false");
    open.popper?.destroy();
    open = null;
}

/**
 * Toggle the dropdown owned by a given toggle element.
 * @param {HTMLElement} toggle the `[data-bs-toggle="dropdown"]` element
 * @returns {void}
 */
function toggleFor(toggle) {
    const parent = toggle.closest(".dropdown, .dropup, .btn-group");
    const menu = parent?.querySelector(".dropdown-menu");
    if (!menu) {
        return;
    }
    const wasOpen = open && open.toggle === toggle;
    closeOpen();
    if (wasOpen) {
        return;
    }
    menu.classList.add("show");
    toggle.classList.add("show");
    toggle.setAttribute("aria-expanded", "true");
    const popper = createPopper(toggle, menu, {
        placement: "bottom-start",
        modifiers: [ { name: "offset", options: { offset: [ 0, 2 ] } } ],
    });
    open = { toggle, menu, popper };
}

/**
 * Install the global dropdown listeners. Call once at app start.
 * @returns {void}
 */
export function initDropdowns() {
    document.addEventListener("click", (e) => {
        const toggle = e.target.closest("[data-bs-toggle='dropdown']");
        if (toggle) {
            e.preventDefault();
            toggleFor(toggle);
            return;
        }
        // Click inside the open menu: let the item's own handler run (it already has,
        // since element listeners fire before this document-level one), then close.
        // Any click elsewhere also closes.
        closeOpen();
    });
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            closeOpen();
        }
    });
}
