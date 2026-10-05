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

  var form = document.querySelector(".booking");
  var status = document.getElementById("booking-status");

  if (form && status) {
    var invalidMessage = "Please complete the required fields, including consent to use your health details.";

    form.addEventListener("invalid", function () {
      status.textContent = invalidMessage;
    }, true);

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      if (!form.checkValidity()) {
        status.textContent = invalidMessage;
        form.reportValidity();
        return;
      }

      status.textContent = "Thank you. Your consultation request is noted on this page. The studio will confirm a time by email once this form is connected to a handler.";
      form.reset();
    });
  }
}());
