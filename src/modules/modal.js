/**
 * Minimal drop-in replacement for Bootstrap 5's Modal — covers exactly the API this
 * app uses: `new Modal(element)`, `.show()`, `.hide()`. Reads the same attributes
 * Bootstrap does (`data-bs-backdrop="static"` = don't dismiss on backdrop click,
 * `data-bs-keyboard="false"` = don't dismiss on Esc) and wires
 * `[data-bs-dismiss="modal"]` buttons. It toggles the same `.show` / `.fade` classes
 * and `.modal-backdrop` / body `.modal-open` structure Bootstrap uses, so the existing
 * modal CSS animates it identically.
 *
 * ponytail: only the used surface. No events, getInstance, options object, or focus-trap
 * — none of which this codebase calls. Add them if a caller ever needs them.
 */

// Modals share one body-scroll-lock; only the last close restores the body.
let openCount = 0;

/**
 * Width of the OS scrollbar, so locking body scroll doesn't shift content.
 * @returns {number} scrollbar width in px
 */
function scrollbarWidth() {
    return window.innerWidth - document.documentElement.clientWidth;
}

export class Modal {
    /**
     * @param {HTMLElement} element the `.modal` root element
     */
    constructor(element) {
        this.el = element;
        this.backdropEl = null;
        this.isShown = false;
        this.isStatic = element.getAttribute("data-bs-backdrop") === "static";
        this.keyboard = element.getAttribute("data-bs-keyboard") !== "false";
        this.mouseDownTarget = null;

        // Close on [data-bs-dismiss="modal"] clicks anywhere inside the modal.
        this.el.addEventListener("click", (e) => {
            if (e.target.closest("[data-bs-dismiss='modal']")) {
                this.hide();
            }
        });

        // Backdrop click = click that both starts AND ends on the .modal element itself
        // (the scroll area outside .modal-dialog). Tracking mousedown avoids closing when
        // a drag-select starts inside the dialog and releases outside.
        this.el.addEventListener("mousedown", (e) => {
            this.mouseDownTarget = e.target;
        });
        this.el.addEventListener("click", (e) => {
            if (e.target === this.el && this.mouseDownTarget === this.el && !this.isStatic) {
                this.hide();
            }
        });

        this.onKeydown = (e) => {
            if (e.key === "Escape" && this.keyboard && this.isShown) {
                this.hide();
            }
        };
    }

    /**
     * Show the modal.
     * @returns {void}
     */
    show() {
        if (this.isShown) {
            return;
        }
        this.isShown = true;
        openCount++;

        document.body.classList.add("modal-open");
        const sbw = scrollbarWidth();
        if (sbw > 0) {
            document.body.style.paddingRight = `${sbw}px`;
        }

        // Backdrop
        this.backdropEl = document.createElement("div");
        this.backdropEl.className = "modal-backdrop fade";
        document.body.appendChild(this.backdropEl);

        this.el.style.display = "block";
        this.el.removeAttribute("aria-hidden");
        this.el.setAttribute("aria-modal", "true");
        this.el.setAttribute("role", "dialog");
        this.el.scrollTop = 0;

        // Force reflow so the class change animates instead of jumping.
        // eslint-disable-next-line no-unused-expressions
        this.el.offsetHeight;

        this.backdropEl.classList.add("show");
        this.el.classList.add("show");

        document.addEventListener("keydown", this.onKeydown);

        const focusTarget = this.el.querySelector("[autofocus]") || this.el;
        focusTarget.focus?.();
    }

    /**
     * Hide the modal.
     * @returns {void}
     */
    hide() {
        if (!this.isShown) {
            return;
        }
        this.isShown = false;
        document.removeEventListener("keydown", this.onKeydown);

        this.el.classList.remove("show");
        if (this.backdropEl) {
            this.backdropEl.classList.remove("show");
        }

        const finish = () => {
            this.el.style.display = "none";
            this.el.setAttribute("aria-hidden", "true");
            this.el.removeAttribute("aria-modal");
            this.el.removeAttribute("role");
            if (this.backdropEl) {
                this.backdropEl.remove();
                this.backdropEl = null;
            }
            openCount = Math.max(0, openCount - 1);
            if (openCount === 0) {
                document.body.classList.remove("modal-open");
                document.body.style.paddingRight = "";
            }
        };

        // Wait for the fade-out transition; fall back to a timeout if none fires.
        let done = false;
        const once = () => {
            if (done) {
                return;
            }
            done = true;
            this.el.removeEventListener("transitionend", once);
            finish();
        };
        this.el.addEventListener("transitionend", once);
        setTimeout(once, 200);
    }
}
