(function () {
  var toggle = document.querySelector(".site-nav__toggle");
  var nav = document.getElementById("primary-nav");
  // Keep in sync with the 992px breakpoint in assets/css/style.css.
  var desktopQuery = window.matchMedia("(min-width: 992px)");

  function setMenuOpen(isOpen) {
    if (!toggle || !nav) {
      return;
    }

    toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    toggle.textContent = isOpen ? "Close" : "Menu";
    nav.classList.toggle("is-open", isOpen);
  }

  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var isOpen = toggle.getAttribute("aria-expanded") === "true";
      setMenuOpen(!isOpen);
    });

    nav.addEventListener("click", function (event) {
      if (event.target.closest("a")) {
        setMenuOpen(false);
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        setMenuOpen(false);
        toggle.focus();
      }
    });

    function closeOnDesktop(event) {
      if (event.matches) {
        setMenuOpen(false);
      }
    }

    if (desktopQuery.addEventListener) {
      desktopQuery.addEventListener("change", closeOnDesktop);
    } else if (desktopQuery.addListener) {
      desktopQuery.addListener(closeOnDesktop);
    }
  }

  var form = document.querySelector(".contact-form");
  var status = document.getElementById("contact-status");

  if (form && status) {
    // Messages live in the markup (data-error-*, data-msg-*) so they can be translated with the page.
    var fields = form.querySelectorAll("[data-error-required], [data-error-format]");
    var trap = form.querySelector('[name="website"]');
    var dateField = form.querySelector('input[type="date"]');

    // Past dates cannot be booked. Use the local date, not UTC, so evening visitors still see today.
    if (dateField) {
      var today = new Date();
      today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
      dateField.min = today.toISOString().slice(0, 10);
    }

    function setStatus(message, state) {
      status.textContent = message;
      status.setAttribute("data-state", state);
    }

    // Writes the field's own message into its linked error element and flags the field.
    function validateField(field) {
      var error = document.getElementById(field.id + "-error");
      var message = "";

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
    }

    // Re-check only fields already flagged: errors clear as they are fixed, but never appear mid-typing.
    function recheck(event) {
      if (event.target.getAttribute("aria-invalid") === "true") {
        validateField(event.target);
      }
    }

    form.addEventListener("input", recheck);
    form.addEventListener("change", recheck);

    form.addEventListener("submit", function (event) {
      var firstInvalid = null;

      // Bots fill every field; people never see this one. Report success and send nothing.
      if (trap && trap.value) {
        event.preventDefault();
        setStatus(form.getAttribute("data-msg-success"), "success");
        form.reset();
        return;
      }

      Array.prototype.forEach.call(fields, function (field) {
        if (!validateField(field) && !firstInvalid) {
          firstInvalid = field;
        }
      });

      if (firstInvalid) {
        event.preventDefault();
        setStatus(form.getAttribute("data-msg-invalid"), "error");
        // Focus announces the field's label, invalid state and error message together.
        firstInvalid.focus();
        return;
      }

      // Demo page only: once action points to a real handler, the form submits normally.
      if (form.getAttribute("action") === "#") {
        event.preventDefault();
        setStatus(form.getAttribute("data-msg-success"), "success");
        form.reset();
      }
    });
  }
}());
