/**
 * Aurelia Dental — site behaviours.
 *
 * Vanilla ES6+ only. No jQuery, no build step, no third-party libraries.
 * User-facing copy stays in the markup (data-* attributes) so it can be
 * translated without touching this file (see .cursorrules rule 21).
 */
(function () {
  "use strict";

  /**
   * Central application controller. Boots feature modules once the DOM is ready.
   * @namespace App
   */
  const App = {
    /**
     * Initialise every feature module in a single, ordered pass.
     * @returns {void}
     */
    init: () => {
      App.navigation.init();
      App.smoothScroll.init();
      App.forms.init();
    },

    /**
     * Mobile menu toggle, Escape / desktop close, and sticky header scrolled state.
     * Keep DESKTOP_MQ in sync with the 992px breakpoint in assets/css/style.css.
     * @namespace App.navigation
     */
    navigation: {
      /** @type {string} */
      DESKTOP_MQ: "(min-width: 992px)",

      /**
       * Bind the header toggle, media-query cleanup, and scroll stuck state.
       * @returns {void}
       */
      init: () => {
        App.navigation.bindMenu();
        App.navigation.bindStickyHeader();
      },

      /**
       * Open / close the primary nav; close on link click, Escape, or desktop width.
       * @returns {void}
       */
      bindMenu: () => {
        const toggle = document.querySelector(".site-nav__toggle");
        const nav = document.getElementById("primary-nav");
        const desktopQuery = window.matchMedia(App.navigation.DESKTOP_MQ);

        if (!toggle || !nav) {
          return;
        }

        /**
         * Sync the toggle label, aria-expanded, and open class.
         * @param {boolean} isOpen
         * @returns {void}
         */
        const setMenuOpen = (isOpen) => {
          toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
          toggle.textContent = isOpen ? "Close" : "Menu";
          nav.classList.toggle("is-open", isOpen);
        };

        toggle.addEventListener("click", () => {
          const isOpen = toggle.getAttribute("aria-expanded") === "true";
          setMenuOpen(!isOpen);
        });

        nav.addEventListener("click", (event) => {
          if (event.target.closest("a")) {
            setMenuOpen(false);
          }
        });

        document.addEventListener("keydown", (event) => {
          if (event.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
            setMenuOpen(false);
            toggle.focus();
          }
        });

        /**
         * Collapse the drawer when the layout switches to the horizontal bar.
         * @param {MediaQueryListEvent|MediaQueryList} event
         * @returns {void}
         */
        const closeOnDesktop = (event) => {
          if (event.matches) {
            setMenuOpen(false);
          }
        };

        if (desktopQuery.addEventListener) {
          desktopQuery.addEventListener("change", closeOnDesktop);
        } else if (desktopQuery.addListener) {
          // Safari < 14
          desktopQuery.addListener(closeOnDesktop);
        }
      },

      /**
       * Toggle site-header--stuck after a small scroll so CSS can elevate the bar.
       * @returns {void}
       */
      bindStickyHeader: () => {
        const header = document.querySelector(".site-header");

        if (!header) {
          return;
        }

        const STUCK_AFTER = 8;
        let ticking = false;

        /**
         * Apply or remove the stuck modifier from the current scroll position.
         * @returns {void}
         */
        const updateStuckState = () => {
          header.classList.toggle("site-header--stuck", window.scrollY > STUCK_AFTER);
          ticking = false;
        };

        window.addEventListener(
          "scroll",
          () => {
            if (!ticking) {
              window.requestAnimationFrame(updateStuckState);
              ticking = true;
            }
          },
          { passive: true }
        );

        updateStuckState();
      },
    },

    /**
     * In-page hash links: smooth scroll when motion is allowed, with focus moved
     * to the target so keyboard and screen-reader users land in the right place.
     * @namespace App.smoothScroll
     */
    smoothScroll: {
      /**
       * Intercept same-page #anchors (skip bare "#" and non-existent targets).
       * @returns {void}
       */
      init: () => {
        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

        document.addEventListener("click", (event) => {
          const link = event.target.closest('a[href^="#"]');

          if (!link) {
            return;
          }

          const hash = link.getAttribute("href");

          if (!hash || hash === "#") {
            return;
          }

          const target = document.getElementById(hash.slice(1));

          if (!target) {
            return;
          }

          event.preventDefault();

          target.scrollIntoView({
            behavior: reduceMotion.matches ? "auto" : "smooth",
            block: "start",
          });

          // Make non-interactive landmarks focusable for this jump, then restore.
          if (!target.hasAttribute("tabindex")) {
            target.setAttribute("tabindex", "-1");
          }

          target.focus({ preventScroll: true });

          if (history.pushState) {
            history.pushState(null, "", hash);
          } else {
            window.location.hash = hash;
          }
        });
      },
    },

    /**
     * Contact form client-side checks. Messages live on data-error-* / data-msg-*
     * attributes; this module only writes them with textContent.
     * @namespace App.forms
     */
    forms: {
      /**
       * Attach validation, honeypot handling, and demo submit for .contact-form.
       * @returns {void}
       */
      init: () => {
        const form = document.querySelector(".contact-form");
        const status = document.getElementById("contact-status");

        if (!form || !status) {
          return;
        }

        const fields = form.querySelectorAll("[data-error-required], [data-error-format]");
        const trap = form.querySelector('[name="website"]');
        const dateField = form.querySelector('input[type="date"]');

        // Past dates cannot be booked. Use the local calendar day, not UTC.
        if (dateField) {
          const today = new Date();
          today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
          dateField.min = today.toISOString().slice(0, 10);
        }

        /**
         * Publish a form-level status message for assistive tech (role="status").
         * @param {string|null} message
         * @param {string} state
         * @returns {void}
         */
        const setStatus = (message, state) => {
          status.textContent = message;
          status.setAttribute("data-state", state);
        };

        /**
         * Validate one control and sync its linked *-error element + aria-invalid.
         * @param {HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement} field
         * @returns {boolean} True when the field is valid.
         */
        const validateField = (field) => {
          const error = document.getElementById(field.id + "-error");
          let message = "";

          if (!field.validity.valid) {
            message = field.validity.valueMissing
              ? field.getAttribute("data-error-required")
              : field.getAttribute("data-error-format") || field.getAttribute("data-error-required");
          }

          if (error) {
            error.textContent = message;
          }

          if (message) {
            field.setAttribute("aria-invalid", "true");
          } else {
            field.removeAttribute("aria-invalid");
          }

          return !message;
        };

        /**
         * Re-check only fields already flagged so errors clear as they are fixed,
         * but never appear mid-typing on a pristine field.
         * @param {Event} event
         * @returns {void}
         */
        const recheck = (event) => {
          const field = event.target;

          if (field.getAttribute && field.getAttribute("aria-invalid") === "true") {
            validateField(field);
          }
        };

        form.addEventListener("input", recheck);
        form.addEventListener("change", recheck);

        form.addEventListener("submit", (event) => {
          let firstInvalid = null;

          // Bots fill every field; people never see this one. Fake success, send nothing.
          if (trap && trap.value) {
            event.preventDefault();
            setStatus(form.getAttribute("data-msg-success"), "success");
            form.reset();
            return;
          }

          fields.forEach((field) => {
            if (!validateField(field) && !firstInvalid) {
              firstInvalid = field;
            }
          });

          if (firstInvalid) {
            event.preventDefault();
            setStatus(form.getAttribute("data-msg-invalid"), "error");
            firstInvalid.focus();
            return;
          }

          // Demo page only: once action points to a real handler, submit normally.
          if (form.getAttribute("action") === "#") {
            event.preventDefault();
            setStatus(form.getAttribute("data-msg-success"), "success");
            form.reset();
          }
        });
      },
    },
  };

  // defer scripts often run after DOMContentLoaded; still boot either way.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", App.init);
  } else {
    App.init();
  }
})();
