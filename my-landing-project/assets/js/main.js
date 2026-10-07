/**
 * Aurelia Dental — site behaviours.
 *
 * Vanilla ES6+ only. No jQuery, no build step, no third-party libraries.
 * User-facing copy stays in the markup (data-* attributes) so it can be
 * translated without touching this file (see .cursorrules rule 21).
 *
 * Lifecycle: every module has init() and destroy(). init() first aborts the
 * module's previous AbortController, so calling it again (after an Elementor
 * re-render or an AJAX page swap) never stacks listeners or keeps detached
 * nodes alive. Modules look their elements up on each init() and keep them in
 * closures only, never on the long-lived App object.
 */
(function () {
  "use strict";

  /* ------------------------------------------------------------------ */
  /*  Safe DOM helpers                                                    */
  /* ------------------------------------------------------------------ */

  /**
   * querySelector wrapper that returns null instead of throwing, whether the node is
   * missing or the selector is invalid. Use byId() for ids: they are not CSS.
   * @param {string} selector
   * @param {ParentNode|null} [parent=document]
   * @returns {Element|null}
   */
  const select = (selector, parent = document) => {
    try {
      return (parent || document).querySelector(selector);
    } catch {
      return null;
    }
  };

  /**
   * querySelectorAll wrapper that always returns a real array (empty when none or invalid).
   * @param {string} selector
   * @param {ParentNode|null} [parent=document]
   * @returns {Element[]}
   */
  const selectAll = (selector, parent = document) => {
    try {
      return [...(parent || document).querySelectorAll(selector)];
    } catch {
      return [];
    }
  };

  /**
   * Element by id. Ids such as "1-step" or "a.b" are valid HTML but not valid (or not
   * literal) CSS selectors, so never pass "#" + id to querySelector.
   * @param {string|null} id
   * @returns {HTMLElement|null}
   */
  const byId = (id) => (id ? document.getElementById(id) : null);

  /**
   * Element named by an in-page link such as "#pricing", or null.
   * @param {string|null} hash
   * @returns {HTMLElement|null}
   */
  const targetFromHash = (hash) => {
    if (!hash || hash.length < 2 || hash.charAt(0) !== "#") {
      return null;
    }

    try {
      return byId(decodeURIComponent(hash.slice(1)));
    } catch {
      return null; // malformed %-escape
    }
  };

  /**
   * Today's local calendar date as YYYY-MM-DD (not UTC, which can be a day off).
   * @returns {string}
   */
  const localToday = () => {
    const today = new Date();
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
    return today.toISOString().slice(0, 10);
  };

  /* ------------------------------------------------------------------ */
  /*  Lifecycle helpers                                                   */
  /* ------------------------------------------------------------------ */

  /**
   * Abort a module's previous listeners and hand out a fresh signal for this init().
   * @param {{controller: AbortController|null}} module
   * @returns {AbortSignal}
   */
  const renewSignal = (module) => {
    if (module.controller) {
      module.controller.abort();
    }

    module.controller = new AbortController();
    return module.controller.signal;
  };

  /**
   * Remove every listener a module added, via its AbortController.
   * @param {{controller: AbortController|null}} module
   * @returns {void}
   */
  const release = (module) => {
    if (module.controller) {
      module.controller.abort();
      module.controller = null;
    }
  };

  /* ------------------------------------------------------------------ */
  /*  Application controller                                              */
  /* ------------------------------------------------------------------ */

  /** Boot order. Each entry names an App module with init() and destroy(). */
  const MODULES = ["events", "navigation", "stickyHeader", "smoothScroll", "accordion", "forms"];

  /**
   * Central application controller.
   * @namespace App
   */
  const App = {
    /** Shared media queries; read .matches at the moment of use. */
    config: {
      /** Keep in sync with the 992px breakpoint in assets/css/style.css. */
      desktopQuery: window.matchMedia("(min-width: 992px)"),
      reduceMotion: window.matchMedia("(prefers-reduced-motion: reduce)"),
    },

    /**
     * Start (or restart) every module. Safe to call more than once.
     * One module failing is logged and never stops the others.
     * @returns {void}
     */
    init: () => {
      MODULES.forEach((name) => {
        try {
          App[name].init();
        } catch (error) {
          console.error(`[Aurelia Dental] ${name} did not start.`, error);
        }
      });
    },

    /**
     * Remove every listener added by every module.
     * @returns {void}
     */
    destroy: () => {
      MODULES.forEach((name) => App[name].destroy());
    },

    /**
     * Document-level click delegation for [data-action] triggers.
     * Modules register handlers with App.events.on(action, handler, signal)
     * instead of attaching a listener to every button.
     * @namespace App.events
     */
    events: {
      /** @type {AbortController|null} */
      controller: null,

      /** @type {Map<string, Set<function(MouseEvent, Element): void>>} */
      handlers: new Map(),

      /**
       * Attach the single delegated click listener.
       * @returns {void}
       */
      init: () => {
        const signal = renewSignal(App.events);
        document.addEventListener("click", App.events.handleClick, { signal });
      },

      /** @returns {void} */
      destroy: () => {
        release(App.events);
      },

      /**
       * Register a handler for a data-action value. Several handlers may share an action.
       * Passing the module's signal removes the handler when that module is destroyed.
       * @param {string} action
       * @param {function(MouseEvent, Element): void} handler
       * @param {AbortSignal} [signal]
       * @returns {function(): void} Removes this handler.
       */
      on: (action, handler, signal) => {
        if (!action || typeof handler !== "function") {
          return () => {};
        }

        if (!App.events.handlers.has(action)) {
          App.events.handlers.set(action, new Set());
        }

        const handlers = App.events.handlers.get(action);
        const off = () => handlers.delete(handler);

        handlers.add(handler);

        if (signal) {
          signal.addEventListener("abort", off, { once: true });
        }

        return off;
      },

      /**
       * Route a click to its data-action handlers, then to in-page link handling.
       * Modified and non-primary clicks (new tab, new window, download) are left to
       * the browser untouched.
       * @param {MouseEvent} event
       * @returns {void}
       */
      handleClick: (event) => {
        const isPlainClick =
          event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;

        if (event.defaultPrevented || !isPlainClick || !(event.target instanceof Element)) {
          return;
        }

        const trigger = event.target.closest("[data-action]");

        if (trigger) {
          const handlers = App.events.handlers.get(trigger.getAttribute("data-action"));

          if (handlers) {
            handlers.forEach((handler) => handler(event, trigger));
          }
        }

        App.smoothScroll.handleClick(event);
      },
    },

    /**
     * Mobile off-canvas drawer: toggle, backdrop, Escape, focus handling and desktop reset.
     * While open it behaves as a modal: everything outside the toggle and the drawer is
     * made inert, so Tab and screen readers stay in the menu.
     * Markup hooks: .site-nav__toggle[aria-controls], .site-header__backdrop, and
     * data-action="toggle-nav" / "close-nav" (close-nav sits on the backdrop and the link list).
     * @namespace App.navigation
     */
    navigation: {
      /** @type {AbortController|null} */
      controller: null,

      /** @returns {void} */
      init: () => {
        const signal = renewSignal(App.navigation);
        const toggle = select(".site-nav__toggle");
        const drawer = toggle ? byId(toggle.getAttribute("aria-controls")) : null;

        if (!toggle || !drawer) {
          return;
        }

        const header = toggle.closest(".site-header");
        const backdrop = header ? select(".site-header__backdrop", header) : null;
        const brand = header ? select(".site-header__brand", header) : null;

        /** Elements this module made inert, so closing restores exactly those. */
        let inerted = [];

        const isOpen = () => toggle.getAttribute("aria-expanded") === "true";

        /**
         * Make the rest of the page inert while the drawer is open, or undo that.
         * Elements that were already inert are left alone.
         * @param {boolean} on
         * @returns {void}
         */
        const setPageInert = (on) => {
          if (on && !inerted.length) {
            const outside = [...document.body.children].filter(
              (el) => el !== header && el.tagName !== "SCRIPT"
            );

            inerted = [...outside, brand].filter((el) => el && !el.inert);
            inerted.forEach((el) => {
              el.inert = true;
            });
          } else if (!on) {
            inerted.forEach((el) => {
              el.inert = false;
            });
            inerted = [];
          }
        };

        /**
         * Single source of truth for the menu state. The drawer only opens below the
         * desktop breakpoint; on desktop the bar is always visible and never inert.
         * @param {boolean} open
         * @param {{returnFocus?: boolean}} [options]
         * @returns {void}
         */
        const setOpen = (open, { returnFocus = false } = {}) => {
          const isDesktop = App.config.desktopQuery.matches;
          const show = open && !isDesktop;

          toggle.setAttribute("aria-expanded", String(show));
          drawer.classList.toggle("is-open", show);
          drawer.inert = !show && !isDesktop;
          document.documentElement.classList.toggle("no-scroll", show);

          if (backdrop) {
            backdrop.classList.toggle("is-open", show);
          }

          setPageInert(show);

          if (!show && returnFocus) {
            toggle.focus();
          }
        };

        App.events.on("toggle-nav", () => setOpen(!isOpen()), signal);

        App.events.on(
          "close-nav",
          (event, trigger) => {
            if (!isOpen()) {
              return;
            }

            // The backdrop closes on any click and hands focus back to the toggle.
            // The link list closes only when a link was used; App.smoothScroll then
            // moves focus to the section, so it is not returned here.
            if (trigger === backdrop) {
              setOpen(false, { returnFocus: true });
            } else if (event.target.closest("a")) {
              setOpen(false);
            }
          },
          signal
        );

        document.addEventListener(
          "keydown",
          (event) => {
            if (event.key === "Escape" && isOpen()) {
              setOpen(false, { returnFocus: true });
            }
          },
          { signal }
        );

        App.config.desktopQuery.addEventListener(
          "change",
          (event) => {
            const toggleHadFocus = document.activeElement === toggle;

            if (event.matches) {
              setOpen(false);

              // The toggle is hidden on desktop; keep keyboard focus in the navigation.
              const firstLink = toggleHadFocus ? select("a", drawer) : null;

              if (firstLink) {
                firstLink.focus();
              }
            } else {
              // Back on mobile: snap the drawer off-canvas instead of sliding it across.
              drawer.classList.add("site-nav--instant");
              setOpen(false);
              void drawer.offsetWidth; // commit the jump before transitions return
              window.requestAnimationFrame(() => drawer.classList.remove("site-nav--instant"));
            }
          },
          { signal }
        );

        // The backdrop ships hidden for no-JS visitors; from here CSS fades it in and out.
        if (backdrop) {
          backdrop.hidden = false;
        }

        // destroy() and re-init both abort this signal: close the menu first, so the page
        // is never left scroll-locked, inert, or with a drawer nothing can close.
        signal.addEventListener(
          "abort",
          () => {
            setOpen(false);

            if (backdrop) {
              backdrop.hidden = true;
            }
          },
          { once: true }
        );

        // Cold start: closed, and inert off-canvas on mobile so its links are not tabbable.
        setOpen(false);
      },

      /** @returns {void} */
      destroy: () => {
        release(App.navigation);
      },
    },

    /**
     * Adds .is-sticky to the header once the hero has scrolled fully above the viewport,
     * so CSS can fade in its shadow. IntersectionObserver only, no scroll listener.
     * The header stays position: sticky and never changes size, so this class cannot
     * cause a layout shift and needs no measuring or placeholder.
     * @namespace App.stickyHeader
     */
    stickyHeader: {
      /** @type {AbortController|null} */
      controller: null,

      /** @returns {void} */
      init: () => {
        const signal = renewSignal(App.stickyHeader);
        const header = select(".site-header");
        const hero = byId("hero") || select(".hero");

        if (!header || !hero) {
          return;
        }

        const observer = new IntersectionObserver(([entry]) => {
          // Not intersecting covers both "above" and "below"; only above counts.
          header.classList.toggle(
            "is-sticky",
            !entry.isIntersecting && entry.boundingClientRect.top < 0
          );
        });

        observer.observe(hero);

        // destroy() and re-init both abort: stop observing and drop the state class.
        signal.addEventListener(
          "abort",
          () => {
            observer.disconnect();
            header.classList.remove("is-sticky");
          },
          { once: true }
        );
      },

      /** @returns {void} */
      destroy: () => {
        release(App.stickyHeader);
      },
    },

    /**
     * In-page links: smooth scroll when motion is allowed, then move focus to the
     * target so keyboard and screen-reader users continue from there. The sticky-header
     * offset comes from scroll-padding-top on <html> in style.css.
     * Called from App.events.handleClick, so there is one click path for the page.
     * @namespace App.smoothScroll
     */
    smoothScroll: {
      /** @type {AbortController|null} */
      controller: null,

      /**
       * Only creates the signal that scopes the temporary blur listeners below.
       * @returns {void}
       */
      init: () => {
        renewSignal(App.smoothScroll);
      },

      /** @returns {void} */
      destroy: () => {
        release(App.smoothScroll);
      },

      /**
       * @param {MouseEvent} event
       * @returns {void}
       */
      handleClick: (event) => {
        const { controller } = App.smoothScroll;
        const link = event.target.closest('a[href^="#"]');
        const hash = link ? link.getAttribute("href") : null;
        const destination = targetFromHash(hash);

        if (!controller || !destination) {
          return;
        }

        // Same-page hash only; leave real URLs and download/modified clicks alone.
        if (link.origin && link.origin !== window.location.origin) {
          return;
        }

        if (link.pathname !== window.location.pathname) {
          return;
        }

        event.preventDefault();

        destination.scrollIntoView({
          behavior: App.config.reduceMotion.matches ? "auto" : "smooth",
          block: "start",
        });

        // Sections are not focusable. Make this one focusable for the jump only, and
        // remove that again on blur so it never becomes a stray tab or click target.
        if (!destination.hasAttribute("tabindex")) {
          destination.setAttribute("tabindex", "-1");
          destination.addEventListener("blur", () => destination.removeAttribute("tabindex"), {
            once: true,
            signal: controller.signal,
          });
        }

        destination.focus({ preventScroll: true });

        if (window.history && typeof window.history.pushState === "function") {
          window.history.pushState(null, "", hash);
        }
      },
    },

    /**
     * FAQ accordions. Works for any number of accordions and items per page, so each
     * one can come from an Elementor widget or an ACF repeater.
     * Markup options: data-single-open on .faq-accordion closes the other items when one
     * opens; aria-expanded="true" on a trigger in the markup starts that item open.
     * @namespace App.accordion
     */
    accordion: {
      /** @type {AbortController|null} */
      controller: null,

      /** @returns {void} */
      init: () => {
        const signal = renewSignal(App.accordion);

        /**
         * Sync one item's class, aria-expanded and panel inert state.
         * Closed panels stay in the layout for the height animation; inert keeps their
         * contents out of the tab order and the accessibility tree.
         * @param {HTMLElement} trigger
         * @param {boolean} open
         * @returns {void}
         */
        const setOpen = (trigger, open) => {
          const item = trigger.closest(".faq-item");
          const panel = byId(trigger.getAttribute("aria-controls"));

          trigger.setAttribute("aria-expanded", String(open));

          if (item) {
            item.classList.toggle("is-open", open);
          }

          if (panel) {
            panel.inert = !open;
          }
        };

        // Start from the markup: items authored with aria-expanded="true" open, the rest
        // closed. Re-running init() after a page-builder re-render keeps that contract.
        selectAll(".faq-accordion .faq-trigger").forEach((trigger) => {
          setOpen(trigger, trigger.getAttribute("aria-expanded") === "true");
        });

        App.events.on(
          "toggle-faq",
          (event, trigger) => {
            const accordion = trigger.closest(".faq-accordion");
            const willOpen = trigger.getAttribute("aria-expanded") !== "true";

            if (willOpen && accordion && accordion.hasAttribute("data-single-open")) {
              selectAll(".faq-trigger[aria-expanded='true']", accordion).forEach((other) => {
                setOpen(other, false);
              });
            }

            setOpen(trigger, willOpen);
          },
          signal
        );
      },

      /** @returns {void} */
      destroy: () => {
        release(App.accordion);
      },
    },

    /**
     * Contact forms: client-side checks, then an optional same-origin POST. Every
     * form[data-validate] on the page is handled, so a builder can repeat the form.
     * Client checks are for the visitor only; the server re-validates everything (rule 22).
     *
     * Markup contract (all copy stays in the markup, rule 21):
     * - form[data-validate]: data-msg-invalid, data-msg-sending, data-msg-error and
     *   data-msg-success; data-status and data-success hold the ids of the form's
     *   role="status" line and its success banner.
     * - form[data-endpoint]: POST the form as FormData to this same-origin URL, e.g.
     *   admin-ajax.php or a REST route. Hidden fields such as action and _wpnonce travel
     *   with it. Without data-endpoint nothing is sent (demo mode).
     * - Controls: required, data-validate="name|email|phone|future-date",
     *   data-error-required and data-error-format. The error element's id is "<id>-error".
     * - [data-honeypot]: spam trap. When it is filled, nothing is sent.
     *
     * The JSON reply uses the shape wp_send_json_success() / wp_send_json_error() produce:
     * { success: boolean, data?: { message?: string, errors?: { [fieldName]: string } } }
     * Each outcome is also dispatched on the form as "aureliadental:form-success" or
     * "aureliadental:form-error" (detail = data) for analytics or custom handlers.
     * @namespace App.forms
     */
    forms: {
      /** @type {AbortController|null} */
      controller: null,

      /** Give up on a request that has not answered after this many milliseconds. */
      TIMEOUT: 15000,

      /**
       * Format checks, keyed by data-validate. Each pattern is a single character class,
       * or labels split by a literal the class cannot match, so matching time is linear
       * (no ReDoS). Lengths are capped before any pattern runs.
       */
      rules: {
        // Letters and combining marks in any script (Thai vowel and tone marks are \p{M}),
        // plus spaces, ' and the ’ that iOS types, full stops and hyphens.
        name: (value) => value.length <= 100 && /^\p{L}[\p{L}\p{M}\s'’.-]*$/u.test(value),

        // The HTML Standard's "valid e-mail address" pattern, with a dot required in the
        // domain. 254 / 64 are the SMTP limits for the address and the local part.
        email: (value) =>
          value.length <= 254 &&
          value.indexOf("@") <= 64 &&
          /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/.test(
            value
          ),

        // Optional leading +, then digits and common separators; 9 to 15 digits (E.164).
        phone: (value) => {
          if (value.length > 20 || !/^\+?[0-9 ().-]+$/.test(value)) {
            return false;
          }

          const digits = value.replace(/[^0-9]/g, "").length;
          return digits >= 9 && digits <= 15;
        },

        // YYYY-MM-DD compares correctly as text. The shape check covers browsers that
        // show a plain text box instead of a date picker.
        "future-date": (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && value >= localToday(),
      },

      /** @returns {void} */
      init: () => {
        const signal = renewSignal(App.forms);

        selectAll("form[data-validate]").forEach((form) => App.forms.setup(form, signal));
      },

      /**
       * Wire one form. Everything it needs is looked up here and kept in this closure.
       * @param {HTMLFormElement} form
       * @param {AbortSignal} signal
       * @returns {void}
       */
      setup: (form, signal) => {
        const status = byId(form.getAttribute("data-status"));
        const banner = byId(form.getAttribute("data-success"));
        const trap = select("[data-honeypot]", form);
        const message = (name) => form.getAttribute(`data-msg-${name}`) || "";

        /** Set while a request is in flight, so a second submit cannot send twice. */
        let busy = false;

        /**
         * @param {EventTarget|null} el
         * @returns {boolean} True for this form's own fields, minus the honeypot.
         */
        const isField = (el) =>
          el instanceof HTMLElement &&
          el.matches("input, select, textarea") &&
          el.willValidate &&
          el.form === form &&
          !el.hasAttribute("data-honeypot");

        // Read on each submit, so fields a builder adds later are included.
        const fields = () => [...form.elements].filter(isField);

        const setMinDates = () => {
          selectAll('[data-validate="future-date"]', form).forEach((field) => {
            field.min = localToday();
          });
        };

        /**
         * @param {string} text
         * @param {string} state "error" | "pending" | "success"
         * @returns {void}
         */
        const setStatus = (text, state) => {
          if (status) {
            status.textContent = text;
            status.setAttribute("data-state", state);
          }
        };

        /**
         * @param {HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement} field
         * @returns {string} The message to show, or "" when the field is valid.
         */
        const getError = (field) => {
          const required = field.getAttribute("data-error-required") || "";
          const format = field.getAttribute("data-error-format") || required;

          if (field.type === "checkbox") {
            return field.required && !field.checked ? required : "";
          }

          const value = field.value.trim();

          if (!value) {
            return field.required ? required : "";
          }

          const key = field.getAttribute("data-validate");
          const rule = Object.prototype.hasOwnProperty.call(App.forms.rules, key)
            ? App.forms.rules[key]
            : null;

          return rule && !rule(value) ? format : "";
        };

        /**
         * Write (or clear) a field's error. aria-invalid is the single state hook: CSS
         * styles it and screen readers announce it; the message is read through the
         * aria-describedby link, so the error element is not a live region.
         * @param {HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement} field
         * @param {string} text
         * @returns {boolean} True when the field is valid.
         */
        const setFieldError = (field, text) => {
          const error = field.id ? byId(`${field.id}-error`) : null;

          if (error) {
            error.textContent = text;
          }

          if (text) {
            field.setAttribute("aria-invalid", "true");
            field.classList.remove("is-valid");
            return false;
          }

          field.removeAttribute("aria-invalid");
          // Only filled text-like fields turn green; empty optional ones stay neutral.
          field.classList.toggle("is-valid", field.type !== "checkbox" && field.value.trim() !== "");
          return true;
        };

        const validate = (field) => setFieldError(field, getError(field));

        const clearAll = () => {
          fields().forEach((field) => setFieldError(field, ""));
          setStatus("", "");
        };

        /**
         * Focus the banner so it is announced and in view. It is not also a live region,
         * which would make screen readers read it twice.
         * @returns {void}
         */
        const showSuccess = () => {
          if (banner) {
            setStatus("", "success");
            banner.hidden = false;
            banner.focus({ preventScroll: true });
            banner.scrollIntoView({
              behavior: App.config.reduceMotion.matches ? "auto" : "smooth",
              block: "nearest",
            });
          } else {
            setStatus(message("success"), "success");
          }
        };

        const emit = (outcome, detail) => {
          form.dispatchEvent(new CustomEvent(`aureliadental:form-${outcome}`, { bubbles: true, detail }));
        };

        /**
         * POST the form to data-endpoint, or resolve at once in demo mode.
         * The request is aborted on timeout and when this module is destroyed.
         * @returns {Promise<{success: boolean, data: Object}>}
         */
        const send = () => {
          const endpoint = form.getAttribute("data-endpoint");

          if (!endpoint) {
            return Promise.resolve({ success: true, data: {} });
          }

          // send() runs a microtask after submit; destroy() may have run in between.
          if (signal.aborted) {
            return Promise.reject(new DOMException("Form module destroyed.", "AbortError"));
          }

          // The form carries health details: never post them to another origin, even if
          // a page builder or a compromised setting changes the attribute.
          const url = new URL(endpoint, window.location.href);

          if (url.origin !== window.location.origin) {
            return Promise.reject(new Error(`[Aurelia Dental] Refused cross-origin endpoint ${url.origin}.`));
          }

          const request = new AbortController();
          const stop = () => request.abort();
          const timer = window.setTimeout(stop, App.forms.TIMEOUT);

          // Removed again when the request settles (its own signal aborts in finally).
          signal.addEventListener("abort", stop, { once: true, signal: request.signal });

          return fetch(url, {
            method: "POST",
            body: new FormData(form),
            credentials: "same-origin",
            headers: { Accept: "application/json" },
            signal: request.signal,
          })
            .then((response) =>
              response
                .json()
                .catch(() => null) // admin-ajax answers "0" or "-1" as plain text
                .then((reply) => {
                  const body = reply && typeof reply === "object" ? reply : {};
                  const data = body.data && typeof body.data === "object" ? body.data : {};

                  return { success: response.ok && body.success === true, data };
                })
            )
            .finally(() => {
              window.clearTimeout(timer);
              stop();
            });
        };

        /**
         * Show the server's verdict. Field errors only apply to fields in this form, and
         * every string is written with textContent.
         * @param {{message?: string, errors?: Object<string, string>}} data
         * @returns {void}
         */
        const showServerErrors = (data) => {
          const errors = data.errors && typeof data.errors === "object" ? data.errors : {};
          const flagged = fields().filter((field) => {
            const text = Object.prototype.hasOwnProperty.call(errors, field.name) ? errors[field.name] : null;
            return typeof text === "string" && text !== "" && !setFieldError(field, text);
          });
          const summary = typeof data.message === "string" && data.message ? data.message : "";

          setStatus(summary || message(flagged.length ? "invalid" : "error"), "error");

          if (flagged.length) {
            flagged[0].focus();
          }
        };

        setMinDates();

        // Validate once a value is committed (change fires on blur after an edit, and at
        // once for selects, dates and checkboxes), so tabbing through an empty form never
        // raises errors. A field already marked invalid re-checks on every keystroke so
        // the message clears as soon as it is fixed.
        form.addEventListener(
          "change",
          (event) => {
            if (isField(event.target)) {
              validate(event.target);
            }
          },
          { signal }
        );

        form.addEventListener(
          "input",
          (event) => {
            if (isField(event.target) && event.target.getAttribute("aria-invalid") === "true") {
              validate(event.target);
            }
          },
          { signal }
        );

        form.addEventListener(
          "submit",
          (event) => {
            event.preventDefault();

            if (busy) {
              return;
            }

            if (banner) {
              banner.hidden = true;
            }

            // Bots fill every field; people never see this one. Fake success, send nothing.
            if (trap && trap.value) {
              form.reset();
              clearAll();
              showSuccess();
              return;
            }

            // filter() runs validate() on every field, so all errors show at once.
            const invalid = fields().filter((field) => !validate(field));

            if (invalid.length) {
              setStatus(message("invalid"), "error");
              invalid[0].focus();
              return;
            }

            busy = true;
            form.setAttribute("aria-busy", "true");
            setStatus(message("sending"), "pending");

            Promise.resolve()
              .then(send)
              .then(({ success, data }) => {
                if (success) {
                  form.reset();
                  clearAll();
                  setMinDates();
                  showSuccess();
                  emit("success", data);
                } else {
                  showServerErrors(data);
                  emit("error", data);
                }
              })
              .catch((error) => {
                // Destroyed mid-request: the page is being rebuilt, so stay quiet.
                if (signal.aborted) {
                  return;
                }

                console.error("[Aurelia Dental] Form request failed.", error);
                setStatus(message("error"), "error");
                emit("error", {});
              })
              .finally(() => {
                busy = false;
                form.removeAttribute("aria-busy");
              });
          },
          { signal }
        );
      },

      /** @returns {void} */
      destroy: () => {
        release(App.forms);
      },
    },
  };

  /**
   * The one deliberate global: lets page builders restart the scripts after they
   * re-render markup, e.g. elementorFrontend.hooks.addAction("frontend/element_ready/global",
   * () => AureliaDental.init()). Frozen so other scripts cannot replace its methods.
   */
  window.AureliaDental = Object.freeze({ init: App.init, destroy: App.destroy });

  // With defer this runs after parsing but before DOMContentLoaded (readyState
  // "interactive"), so App.init() runs straight away. The check keeps the file
  // working if it is ever loaded without defer.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", App.init, { once: true });
  } else {
    App.init();
  }
})();
