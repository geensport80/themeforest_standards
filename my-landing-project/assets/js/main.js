/**
 * Aurelia Dental — site behaviours.
 *
 * Vanilla ES6+ only. No jQuery, no build step, no third-party libraries.
 * User-facing copy stays in the markup (data-* attributes) so it can be
 * translated without touching this file (see .cursorrules rule 21).
 *
 * Lifecycle: every module is built with createModule(), which gives it init() and
 * destroy(). init() aborts the module's previous AbortController before starting, so
 * calling it again (after an Elementor re-render or an AJAX page swap) never stacks
 * listeners or keeps detached nodes alive. Modules look their elements up on each
 * init() and keep them in closures only, never on the long-lived App object.
 */
(function () {
  "use strict";

  /* ------------------------------------------------------------------ */
  /*  Configuration                                                       */
  /* ------------------------------------------------------------------ */

  /**
   * Freeze an object and every plain object inside it.
   * @template T
   * @param {T} object
   * @returns {Readonly<T>}
   */
  const deepFreeze = (object) => {
    Object.values(object).forEach((value) => {
      if (value && typeof value === "object") {
        deepFreeze(value);
      }
    });

    return Object.freeze(object);
  };

  /**
   * Every hook this file shares with the markup and style.css, in one place.
   * Rename a class or attribute here, not in the modules.
   *
   * There is deliberately no header offset: in-page offsets come from
   * scroll-padding-top on <html> in style.css alone (rule 17), so JS never measures
   * the sticky header.
   */
  const CONFIG = deepFreeze({
    media: {
      /** Mirrors the 992px breakpoint in style.css (rule 8); change both together. */
      desktop: "(min-width: 992px)",
      reduceMotion: "(prefers-reduced-motion: reduce)",
    },

    selectors: {
      action: "[data-action]",
      link: "a",
      inPageLink: 'a[href^="#"]',
      header: ".site-header",
      headerBrand: ".site-header__brand",
      backdrop: ".site-header__backdrop",
      navToggle: ".site-nav__toggle",
      hero: ".hero",
      accordion: ".faq-accordion",
      accordionItem: ".faq-item",
      accordionTrigger: ".faq-trigger",
      form: "form[data-validate]",
      formField: "input, select, textarea",
      honeypot: "[data-honeypot]",
      futureDate: '[data-validate="future-date"]',
    },

    ids: {
      /** Preferred over selectors.hero when present. */
      hero: "hero",
    },

    classes: {
      open: "is-open",
      sticky: "is-sticky",
      valid: "is-valid",
      scrollLock: "no-scroll",
      navInstant: "site-nav--instant",
    },

    /** data-action values handled through App.events. */
    actions: {
      toggleNav: "toggle-nav",
      closeNav: "close-nav",
      toggleFaq: "toggle-faq",
    },

    attributes: {
      action: "data-action",
      singleOpen: "data-single-open",
      endpoint: "data-endpoint",
      status: "data-status",
      success: "data-success",
      validate: "data-validate",
      honeypot: "data-honeypot",
      errorRequired: "data-error-required",
      errorFormat: "data-error-format",
      /** Followed by invalid | sending | error | success. */
      messagePrefix: "data-msg-",
    },

    forms: {
      /** Give up on a request that has not answered after this many milliseconds. */
      timeout: 15000,
      /** A field's error element has the field's id plus this suffix. */
      errorIdSuffix: "-error",
      /** Followed by success | error. */
      eventPrefix: "aureliadental:form-",
    },
  });

  const { selectors: SELECTORS, ids: IDS, classes: CLASSES, actions: ACTIONS, attributes: ATTR } = CONFIG;

  /**
   * Live media queries. Read .matches at the moment of use, never cache the result.
   * @type {Readonly<{desktop: MediaQueryList, reduceMotion: MediaQueryList}>}
   */
  const MEDIA = Object.freeze({
    desktop: window.matchMedia(CONFIG.media.desktop),
    reduceMotion: window.matchMedia(CONFIG.media.reduceMotion),
  });

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

  /* ------------------------------------------------------------------ */
  /*  Shared state and utility helpers                                    */
  /* ------------------------------------------------------------------ */

  /**
   * @param {Element} trigger
   * @returns {boolean} True when the trigger's aria-expanded is "true".
   */
  const isExpanded = (trigger) => trigger.getAttribute("aria-expanded") === "true";

  /**
   * One place that keeps a disclosure's ARIA state and its CSS state class in step:
   * sets aria-expanded on the trigger and toggles .is-open on every target given.
   * @param {Element} trigger
   * @param {boolean} open
   * @param {...(Element|null)} targets Missing (null) targets are skipped.
   * @returns {void}
   */
  const setExpanded = (trigger, open, ...targets) => {
    trigger.setAttribute("aria-expanded", String(open));
    targets.forEach((target) => {
      if (target) {
        target.classList.toggle(CLASSES.open, open);
      }
    });
  };

  /**
   * Scroll behaviour that respects prefers-reduced-motion.
   * @returns {ScrollBehavior}
   */
  const scrollBehavior = () => (MEDIA.reduceMotion.matches ? "auto" : "smooth");

  /**
   * @param {{origin: string}} target A link, or a URL object.
   * @returns {boolean} True when it points at this page's origin.
   */
  const isSameOrigin = (target) => target.origin === window.location.origin;

  /**
   * Run cleanup once when a module's signal aborts (destroy() or the next init()).
   * @param {AbortSignal} signal
   * @param {function(): void} callback
   * @returns {void}
   */
  const onAbort = (signal, callback) => {
    signal.addEventListener("abort", callback, { once: true });
  };

  /**
   * hasOwnProperty that is safe for keys such as "__proto__" or "constructor".
   * @param {Object} object
   * @param {string|null} key
   * @returns {boolean}
   */
  const hasOwn = (object, key) => key !== null && Object.prototype.hasOwnProperty.call(object, key);

  /**
   * Untrusted value (e.g. parsed JSON) as an object, or {} when it is not one.
   * @param {*} value
   * @returns {Object}
   */
  const asObject = (value) => (value && typeof value === "object" ? value : {});

  /**
   * Today's local calendar date as YYYY-MM-DD (not UTC, which can be a day off).
   * @returns {string}
   */
  const localToday = () => {
    const today = new Date();
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
    return today.toISOString().slice(0, 10);
  };

  /**
   * The only console output in this file: real failures, never debug logging.
   * @param {string} message
   * @param {*} error
   * @returns {void}
   */
  const reportError = (message, error) => {
    console.error(`[Aurelia Dental] ${message}`, error);
  };

  /* ------------------------------------------------------------------ */
  /*  Module factory                                                      */
  /* ------------------------------------------------------------------ */

  /**
   * @typedef {Object} Module
   * @property {AbortController|null} controller Scopes everything the current run added.
   * @property {function(): void} init Start, or restart, the module.
   * @property {function(): void} destroy Remove everything the module added.
   */

  /**
   * Build an App module. init() aborts the previous run, then calls start() with a fresh
   * AbortSignal; start() passes that signal to every listener it adds and uses onAbort()
   * for any other cleanup. destroy() aborts the current run.
   * @template T
   * @param {function(AbortSignal): void} start
   * @param {T} [members] Public members other modules call (handlers, constants).
   * @returns {Module & T}
   */
  const createModule = (start, members) => {
    const module = {
      ...members,
      controller: null,

      init: () => {
        if (module.controller) {
          module.controller.abort();
        }

        module.controller = new AbortController();
        start(module.controller.signal);
      },

      destroy: () => {
        if (module.controller) {
          module.controller.abort();
          module.controller = null;
        }
      },
    };

    return module;
  };

  /* ------------------------------------------------------------------ */
  /*  Application controller                                              */
  /* ------------------------------------------------------------------ */

  /** Boot order. Each entry names an App module; destroy runs in reverse. */
  const MODULES = Object.freeze(["events", "navigation", "stickyHeader", "smoothScroll", "accordion", "formValidation"]);

  /**
   * Call one lifecycle method on each named module. A failure is reported and never
   * stops the others.
   * @param {"init"|"destroy"} method
   * @param {readonly string[]} names
   * @returns {void}
   */
  const runAll = (method, names) => {
    names.forEach((name) => {
      try {
        App[name][method]();
      } catch (error) {
        reportError(`${name}.${method}() failed.`, error);
      }
    });
  };

  /**
   * Central application controller.
   * @namespace App
   */
  const App = {
    /**
     * Start (or restart) every module. Safe to call more than once.
     * @returns {void}
     */
    init: () => runAll("init", MODULES),

    /**
     * Remove every listener added by every module, last-started first.
     * @returns {void}
     */
    destroy: () => runAll("destroy", [...MODULES].reverse()),

    /**
     * Document-level click delegation for [data-action] triggers.
     * Modules register handlers with App.events.on(action, handler, signal)
     * instead of attaching a listener to every button.
     * @namespace App.events
     */
    events: createModule(
      (signal) => {
        document.addEventListener("click", App.events.handleClick, { signal });
      },
      {
        /** @type {Map<string, Set<function(MouseEvent, Element): void>>} */
        handlers: new Map(),

        /**
         * Register a handler for a data-action value. Several handlers may share an
         * action. Passing the module's signal removes the handler when that module is
         * destroyed or restarted.
         * @param {string} action
         * @param {function(MouseEvent, Element): void} handler
         * @param {AbortSignal} [signal]
         * @returns {function(): void} Removes this handler.
         */
        on: (action, handler, signal) => {
          const { handlers } = App.events;

          if (!action || typeof handler !== "function") {
            return () => {};
          }

          if (!handlers.has(action)) {
            handlers.set(action, new Set());
          }

          const set = handlers.get(action);

          /** @returns {void} */
          const off = () => {
            set.delete(handler);

            // Drop the empty bucket, unless a newer one replaced it in the meantime.
            if (!set.size && handlers.get(action) === set) {
              handlers.delete(action);
            }
          };

          set.add(handler);

          if (signal) {
            onAbort(signal, off);
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

          const trigger = event.target.closest(SELECTORS.action);
          const handlers = trigger ? App.events.handlers.get(trigger.getAttribute(ATTR.action)) : null;

          if (handlers) {
            // Copy first: a handler may register or remove handlers while this runs.
            [...handlers].forEach((handler) => handler(event, trigger));
          }

          App.smoothScroll.handleClick(event);
        },
      }
    ),

    /**
     * Mobile off-canvas drawer: toggle, backdrop, Escape, focus handling and desktop reset.
     * While open it behaves as a modal: everything outside the toggle and the drawer is
     * made inert, so Tab and screen readers stay in the menu.
     * Markup hooks: selectors.navToggle[aria-controls], selectors.backdrop, and
     * actions.toggleNav / actions.closeNav (close-nav sits on the backdrop and the link list).
     * @namespace App.navigation
     */
    navigation: createModule((signal) => {
      const toggle = select(SELECTORS.navToggle);
      const drawer = toggle ? byId(toggle.getAttribute("aria-controls")) : null;

      if (!toggle || !drawer) {
        return;
      }

      const header = toggle.closest(SELECTORS.header);
      const backdrop = header ? select(SELECTORS.backdrop, header) : null;
      const brand = header ? select(SELECTORS.headerBrand, header) : null;

      /** @type {HTMLElement[]} Elements this module made inert, so closing restores exactly those. */
      let inerted = [];

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
        const isDesktop = MEDIA.desktop.matches;
        const show = open && !isDesktop;

        setExpanded(toggle, show, drawer, backdrop);
        drawer.inert = !show && !isDesktop;
        document.documentElement.classList.toggle(CLASSES.scrollLock, show);
        setPageInert(show);

        if (!show && returnFocus) {
          toggle.focus();
        }
      };

      App.events.on(ACTIONS.toggleNav, () => setOpen(!isExpanded(toggle)), signal);

      App.events.on(
        ACTIONS.closeNav,
        (event, trigger) => {
          if (!isExpanded(toggle)) {
            return;
          }

          // The backdrop closes on any click and hands focus back to the toggle.
          // The link list closes only when a link was used; App.smoothScroll then
          // moves focus to the section, so it is not returned here.
          if (trigger === backdrop) {
            setOpen(false, { returnFocus: true });
          } else if (event.target.closest(SELECTORS.link)) {
            setOpen(false);
          }
        },
        signal
      );

      document.addEventListener(
        "keydown",
        (event) => {
          if (event.key === "Escape" && isExpanded(toggle)) {
            setOpen(false, { returnFocus: true });
          }
        },
        { signal }
      );

      MEDIA.desktop.addEventListener(
        "change",
        (event) => {
          const toggleHadFocus = document.activeElement === toggle;

          if (event.matches) {
            setOpen(false);

            // The toggle is hidden on desktop; keep keyboard focus in the navigation.
            const firstLink = toggleHadFocus ? select(SELECTORS.link, drawer) : null;

            if (firstLink) {
              firstLink.focus();
            }
          } else {
            // Back on mobile: snap the drawer off-canvas instead of sliding it across.
            drawer.classList.add(CLASSES.navInstant);
            setOpen(false);
            void drawer.offsetWidth; // commit the jump before transitions return
            window.requestAnimationFrame(() => drawer.classList.remove(CLASSES.navInstant));
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
      onAbort(signal, () => {
        setOpen(false);

        if (backdrop) {
          backdrop.hidden = true;
        }
      });

      // Cold start: closed, and inert off-canvas on mobile so its links are not tabbable.
      setOpen(false);
    }),

    /**
     * Adds .is-sticky to the header once the hero has scrolled fully above the viewport,
     * so CSS can fade in its shadow. IntersectionObserver only, no scroll listener.
     * The header stays position: sticky and never changes size, so this class cannot
     * cause a layout shift and needs no measuring or placeholder.
     * @namespace App.stickyHeader
     */
    stickyHeader: createModule((signal) => {
      const header = select(SELECTORS.header);
      const hero = byId(IDS.hero) || select(SELECTORS.hero);

      if (!header || !hero) {
        return;
      }

      const observer = new IntersectionObserver(([entry]) => {
        // Not intersecting covers both "above" and "below"; only above counts.
        header.classList.toggle(CLASSES.sticky, !entry.isIntersecting && entry.boundingClientRect.top < 0);
      });

      observer.observe(hero);

      // destroy() and re-init both abort: stop observing and drop the state class.
      onAbort(signal, () => {
        observer.disconnect();
        header.classList.remove(CLASSES.sticky);
      });
    }),

    /**
     * In-page links: smooth scroll when motion is allowed, then move focus to the
     * target so keyboard and screen-reader users continue from there. The sticky-header
     * offset comes from scroll-padding-top on <html> in style.css.
     * Called from App.events.handleClick, so there is one click path for the page.
     * start() has no listeners of its own; its signal scopes the temporary blur
     * listeners handleClick adds.
     * @namespace App.smoothScroll
     */
    smoothScroll: createModule(() => {}, {
      /**
       * @param {MouseEvent} event A plain primary click (filtered by App.events).
       * @returns {void}
       */
      handleClick: (event) => {
        const { controller } = App.smoothScroll;
        const link = event.target.closest(SELECTORS.inPageLink);
        const hash = link ? link.getAttribute("href") : null;
        const destination = targetFromHash(hash);

        // Same page only: leave links to another page's #hash to the browser.
        if (!controller || !destination || !isSameOrigin(link) || link.pathname !== window.location.pathname) {
          return;
        }

        event.preventDefault();
        destination.scrollIntoView({ behavior: scrollBehavior(), block: "start" });

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

        // Re-clicking the current section's link must not stack history entries.
        if (window.location.hash !== hash) {
          window.history.pushState(null, "", hash);
        }
      },
    }),

    /**
     * FAQ accordions. Works for any number of accordions and items per page, so each
     * one can come from an Elementor widget or an ACF repeater.
     * Markup options: data-single-open on the accordion closes the other items when one
     * opens; aria-expanded="true" on a trigger in the markup starts that item open.
     * @namespace App.accordion
     */
    accordion: createModule((signal) => {
      /**
       * Sync one item's aria-expanded, .is-open and panel inert state.
       * Closed panels stay in the layout for the height animation; inert keeps their
       * contents out of the tab order and the accessibility tree.
       * @param {Element} trigger
       * @param {boolean} open
       * @returns {void}
       */
      const setOpen = (trigger, open) => {
        const panel = byId(trigger.getAttribute("aria-controls"));

        setExpanded(trigger, open, trigger.closest(SELECTORS.accordionItem));

        if (panel) {
          panel.inert = !open;
        }
      };

      // Start from the markup: items authored with aria-expanded="true" open, the rest
      // closed. Re-running init() after a page-builder re-render keeps that contract.
      selectAll(`${SELECTORS.accordion} ${SELECTORS.accordionTrigger}`).forEach((trigger) => {
        setOpen(trigger, isExpanded(trigger));
      });

      App.events.on(
        ACTIONS.toggleFaq,
        (event, trigger) => {
          const accordion = trigger.closest(SELECTORS.accordion);
          const willOpen = !isExpanded(trigger);

          if (willOpen && accordion && accordion.hasAttribute(ATTR.singleOpen)) {
            selectAll(SELECTORS.accordionTrigger, accordion)
              .filter((other) => other !== trigger && isExpanded(other))
              .forEach((other) => setOpen(other, false));
          }

          setOpen(trigger, willOpen);
        },
        signal
      );
    }),

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
     * @namespace App.formValidation
     */
    formValidation: createModule(
      (signal) => {
        selectAll(SELECTORS.form).forEach((form) => App.formValidation.setup(form, signal));
      },
      {
        /**
         * Format checks, keyed by data-validate. Each pattern is a single character
         * class, or labels split by a literal the class cannot match, so matching time
         * is linear (no ReDoS). Lengths are capped before any pattern runs.
         * @type {Readonly<Object<string, function(string): boolean>>}
         */
        rules: Object.freeze({
          // Letters and combining marks in any script (Thai vowel and tone marks are
          // \p{M}), plus spaces, ' and the ’ that iOS types, full stops and hyphens.
          name: (value) => value.length <= 100 && /^\p{L}[\p{L}\p{M}\s'’.-]*$/u.test(value),

          // The HTML Standard's "valid e-mail address" pattern, with a dot required in
          // the domain. 254 / 64 are the SMTP limits for the address and the local part.
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
        }),

        /**
         * Wire one form. Everything it needs is looked up here and kept in this closure.
         * @param {HTMLFormElement} form
         * @param {AbortSignal} signal The formValidation module's signal for this run.
         * @returns {void}
         */
        setup: (form, signal) => {
          const status = byId(form.getAttribute(ATTR.status));
          const banner = byId(form.getAttribute(ATTR.success));
          const trap = select(SELECTORS.honeypot, form);

          /** Set while a request is in flight, so a second submit cannot send twice. */
          let busy = false;

          /**
           * @param {"invalid"|"sending"|"error"|"success"} name
           * @returns {string} The form's translated copy for that state, or "".
           */
          const message = (name) => form.getAttribute(ATTR.messagePrefix + name) || "";

          /**
           * @param {EventTarget|null} el
           * @returns {boolean} True for this form's own fields, minus the honeypot.
           */
          const isField = (el) =>
            el instanceof HTMLElement &&
            el.matches(SELECTORS.formField) &&
            el.willValidate &&
            el.form === form &&
            !el.hasAttribute(ATTR.honeypot);

          /**
           * Read on each call, so fields a builder adds later are included.
           * @returns {Array<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>}
           */
          const fields = () => [...form.elements].filter(isField);

          /**
           * Keep date pickers from offering past days. Re-run after a reset, since the
           * page may have stayed open past midnight.
           * @returns {void}
           */
          const setMinDates = () => {
            selectAll(SELECTORS.futureDate, form).forEach((field) => {
              field.min = localToday();
            });
          };

          /**
           * @param {string} text
           * @param {""|"error"|"pending"|"success"} state Read by CSS as data-state.
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
            const required = field.getAttribute(ATTR.errorRequired) || "";
            const format = field.getAttribute(ATTR.errorFormat) || required;

            if (field.type === "checkbox") {
              return field.required && !field.checked ? required : "";
            }

            const value = field.value.trim();

            if (!value) {
              return field.required ? required : "";
            }

            const key = field.getAttribute(ATTR.validate);
            const rule = hasOwn(App.formValidation.rules, key) ? App.formValidation.rules[key] : null;

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
            const error = field.id ? byId(field.id + CONFIG.forms.errorIdSuffix) : null;

            if (error) {
              error.textContent = text;
            }

            if (text) {
              field.setAttribute("aria-invalid", "true");
              field.classList.remove(CLASSES.valid);
              return false;
            }

            field.removeAttribute("aria-invalid");
            // Only filled text-like fields turn green; empty optional ones stay neutral.
            field.classList.toggle(CLASSES.valid, field.type !== "checkbox" && field.value.trim() !== "");
            return true;
          };

          /**
           * @param {HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement} field
           * @returns {boolean} True when the field is valid.
           */
          const validate = (field) => setFieldError(field, getError(field));

          /**
           * Clear every field's error and valid state, and the status line.
           * @returns {void}
           */
          const clearAll = () => {
            fields().forEach((field) => setFieldError(field, ""));
            setStatus("", "");
          };

          /**
           * Focus the banner so it is announced and in view. It is not also a live
           * region, which would make screen readers read it twice.
           * @returns {void}
           */
          const showSuccess = () => {
            if (banner) {
              setStatus("", "success");
              banner.hidden = false;
              banner.focus({ preventScroll: true });
              banner.scrollIntoView({ behavior: scrollBehavior(), block: "nearest" });
            } else {
              setStatus(message("success"), "success");
            }
          };

          /**
           * Reset the form after a real or faked (honeypot) success.
           * @returns {void}
           */
          const finishSuccess = () => {
            form.reset();
            clearAll();
            setMinDates();
            showSuccess();
          };

          /**
           * Dispatch "aureliadental:form-success" or "aureliadental:form-error" on the form.
           * @param {"success"|"error"} outcome
           * @param {Object} detail The reply's data object.
           * @returns {void}
           */
          const emit = (outcome, detail) => {
            form.dispatchEvent(new CustomEvent(CONFIG.forms.eventPrefix + outcome, { bubbles: true, detail }));
          };

          /**
           * POST the form to data-endpoint, or resolve at once in demo mode.
           * The request is aborted on timeout and when this module is destroyed.
           * @returns {Promise<{success: boolean, data: Object}>}
           */
          const send = () => {
            const endpoint = form.getAttribute(ATTR.endpoint);

            if (!endpoint) {
              return Promise.resolve({ success: true, data: {} });
            }

            // send() runs a microtask after submit; destroy() may have run in between.
            if (signal.aborted) {
              return Promise.reject(new DOMException("Form module destroyed.", "AbortError"));
            }

            // The form carries health details: never post them to another origin, even
            // if a page builder or a compromised setting changes the attribute.
            const url = new URL(endpoint, window.location.href);

            if (!isSameOrigin(url)) {
              return Promise.reject(new Error(`Refused cross-origin endpoint ${url.origin}.`));
            }

            const request = new AbortController();

            /** @returns {void} */
            const stop = () => request.abort();
            const timer = window.setTimeout(stop, CONFIG.forms.timeout);

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
                    const body = asObject(reply);
                    return { success: response.ok && body.success === true, data: asObject(body.data) };
                  })
              )
              .finally(() => {
                window.clearTimeout(timer);
                stop();
              });
          };

          /**
           * Show the server's verdict. Field errors only apply to fields in this form,
           * and every string is written with textContent.
           * @param {{message?: string, errors?: Object<string, string>}} data
           * @returns {void}
           */
          const showServerErrors = (data) => {
            const errors = asObject(data.errors);
            const flagged = fields().filter((field) => {
              const text = hasOwn(errors, field.name) ? errors[field.name] : null;
              return typeof text === "string" && text !== "" && !setFieldError(field, text);
            });
            const summary = typeof data.message === "string" ? data.message : "";

            setStatus(summary || message(flagged.length ? "invalid" : "error"), "error");

            if (flagged.length) {
              flagged[0].focus();
            }
          };

          setMinDates();

          // Validate once a value is committed (change fires on blur after an edit, and
          // at once for selects, dates and checkboxes), so tabbing through an empty form
          // never raises errors.
          form.addEventListener(
            "change",
            (event) => {
              if (isField(event.target)) {
                validate(event.target);
              }
            },
            { signal }
          );

          // A field already marked invalid re-checks on every keystroke, so the message
          // clears as soon as it is fixed.
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
                finishSuccess();
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
                    finishSuccess();
                  } else {
                    showServerErrors(data);
                  }

                  emit(success ? "success" : "error", data);
                })
                .catch((error) => {
                  // Destroyed mid-request: the page is being rebuilt, so stay quiet.
                  if (signal.aborted) {
                    return;
                  }

                  reportError("Form request failed.", error);
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
      }
    ),
  };

  // Nothing is attached to window: App stays inside this IIFE. With defer this runs
  // after parsing but before DOMContentLoaded (readyState "interactive"), so App.init()
  // runs straight away. The check keeps the file working if it is ever loaded without defer.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", App.init, { once: true });
  } else {
    App.init();
  }
})();
