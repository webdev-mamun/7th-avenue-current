function getFocusableElements(container) {
  return Array.from(
    container.querySelectorAll(
      "summary, a[href], button:enabled, [tabindex]:not([tabindex^='-']), [draggable], area, input:not([type=hidden]):enabled, select:enabled, textarea:enabled, object, iframe"
    )
  );
}

class SectionId {
  static #separator = "__";

  // for a qualified section id (e.g. 'template--22224696705326__main'), return just the section id (e.g. 'template--22224696705326')
  static parseId(qualifiedSectionId) {
    return qualifiedSectionId.split(SectionId.#separator)[0];
  }

  // for a qualified section id (e.g. 'template--22224696705326__main'), return just the section name (e.g. 'main')
  static parseSectionName(qualifiedSectionId) {
    return qualifiedSectionId.split(SectionId.#separator)[1];
  }

  // for a section id (e.g. 'template--22224696705326') and a section name (e.g. 'recommended-products'), return a qualified section id (e.g. 'template--22224696705326__recommended-products')
  static getIdForSection(sectionId, sectionName) {
    return `${sectionId}${SectionId.#separator}${sectionName}`;
  }
}

class HTMLUpdateUtility {
  /**
   * Used to swap an HTML node with a new node.
   * The new node is inserted as a previous sibling to the old node, the old node is hidden, and then the old node is removed.
   *
   * The function currently uses a double buffer approach, but this should be replaced by a view transition once it is more widely supported https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API
   */
  static viewTransition(
    oldNode,
    newContent,
    preProcessCallbacks = [],
    postProcessCallbacks = []
  ) {
    preProcessCallbacks?.forEach((callback) => callback(newContent));

    const newNodeWrapper = document.createElement("div");
    HTMLUpdateUtility.setInnerHTML(newNodeWrapper, newContent.outerHTML);
    const newNode = newNodeWrapper.firstChild;

    // dedupe IDs
    const uniqueKey = Date.now();
    oldNode.querySelectorAll("[id], [form]").forEach((element) => {
      element.id && (element.id = `${element.id}-${uniqueKey}`);
      element.form &&
        element.setAttribute(
          "form",
          `${element.form.getAttribute("id")}-${uniqueKey}`
        );
    });

    oldNode.parentNode.insertBefore(newNode, oldNode);
    oldNode.style.display = "none";

    postProcessCallbacks?.forEach((callback) => callback(newNode));

    setTimeout(() => oldNode.remove(), 500);
  }

  // Sets inner HTML and reinjects the script tags to allow execution. By default, scripts are disabled when using element.innerHTML.
  static setInnerHTML(element, html) {
    element.innerHTML = html;
    element.querySelectorAll("script").forEach((oldScriptTag) => {
      const newScriptTag = document.createElement("script");
      Array.from(oldScriptTag.attributes).forEach((attribute) => {
        newScriptTag.setAttribute(attribute.name, attribute.value);
      });
      newScriptTag.appendChild(document.createTextNode(oldScriptTag.innerHTML));
      oldScriptTag.parentNode.replaceChild(newScriptTag, oldScriptTag);
    });
  }
}

document.querySelectorAll('[id^="Details-"] summary').forEach((summary) => {
  summary.setAttribute("role", "button");
  summary.setAttribute(
    "aria-expanded",
    summary.parentNode.hasAttribute("open")
  );

  if (summary.nextElementSibling.getAttribute("id")) {
    summary.setAttribute("aria-controls", summary.nextElementSibling.id);
  }

  summary.addEventListener("click", (event) => {
    event.currentTarget.setAttribute(
      "aria-expanded",
      !event.currentTarget.closest("details").hasAttribute("open")
    );
  });

  if (summary.closest("header-drawer, menu-drawer")) return;
  summary.parentElement.addEventListener("keyup", onKeyUpEscape);
});

const trapFocusHandlers = {};

function trapFocus(container, elementToFocus = container) {
  var elements = getFocusableElements(container);
  var first = elements[0];
  var last = elements[elements.length - 1];

  removeTrapFocus();

  trapFocusHandlers.focusin = (event) => {
    if (
      event.target !== container &&
      event.target !== last &&
      event.target !== first
    )
      return;

    document.addEventListener("keydown", trapFocusHandlers.keydown);
  };

  trapFocusHandlers.focusout = function () {
    document.removeEventListener("keydown", trapFocusHandlers.keydown);
  };

  trapFocusHandlers.keydown = function (event) {
    if (event.code.toUpperCase() !== "TAB") return; // If not TAB key
    // On the last focusable element and tab forward, focus the first element.
    if (event.target === last && !event.shiftKey) {
      event.preventDefault();
      first.focus();
    }

    //  On the first focusable element and tab backward, focus the last element.
    if (
      (event.target === container || event.target === first) &&
      event.shiftKey
    ) {
      event.preventDefault();
      last.focus();
    }
  };

  document.addEventListener("focusout", trapFocusHandlers.focusout);
  document.addEventListener("focusin", trapFocusHandlers.focusin);

  elementToFocus.focus();

  if (
    elementToFocus.tagName === "INPUT" &&
    ["search", "text", "email", "url"].includes(elementToFocus.type) &&
    elementToFocus.value
  ) {
    elementToFocus.setSelectionRange(0, elementToFocus.value.length);
  }
}

// Here run the querySelector to figure out if the browser supports :focus-visible or not and run code based on it.
try {
  document.querySelector(":focus-visible");
} catch (e) {
  focusVisiblePolyfill();
}

function focusVisiblePolyfill() {
  const navKeys = [
    "ARROWUP",
    "ARROWDOWN",
    "ARROWLEFT",
    "ARROWRIGHT",
    "TAB",
    "ENTER",
    "SPACE",
    "ESCAPE",
    "HOME",
    "END",
    "PAGEUP",
    "PAGEDOWN",
  ];
  let currentFocusedElement = null;
  let mouseClick = null;

  window.addEventListener("keydown", (event) => {
    if (navKeys.includes(event.code.toUpperCase())) {
      mouseClick = false;
    }
  });

  window.addEventListener("mousedown", (event) => {
    mouseClick = true;
  });

  window.addEventListener(
    "focus",
    () => {
      if (currentFocusedElement)
        currentFocusedElement.classList.remove("focused");

      if (mouseClick) return;

      currentFocusedElement = document.activeElement;
      currentFocusedElement.classList.add("focused");
    },
    true
  );
}

function pauseAllMedia() {
  document.querySelectorAll(".js-youtube").forEach((video) => {
    video.contentWindow.postMessage(
      '{"event":"command","func":"' + "pauseVideo" + '","args":""}',
      "*"
    );
  });
  document.querySelectorAll(".js-vimeo").forEach((video) => {
    video.contentWindow.postMessage('{"method":"pause"}', "*");
  });
  document.querySelectorAll("video").forEach((video) => video.pause());
  document.querySelectorAll("product-model").forEach((model) => {
    if (model.modelViewerUI) model.modelViewerUI.pause();
  });
}

function removeTrapFocus(elementToFocus = null) {
  document.removeEventListener("focusin", trapFocusHandlers.focusin);
  document.removeEventListener("focusout", trapFocusHandlers.focusout);
  document.removeEventListener("keydown", trapFocusHandlers.keydown);

  if (elementToFocus) elementToFocus.focus();
}

function onKeyUpEscape(event) {
  if (event.code.toUpperCase() !== "ESCAPE") return;

  const openDetailsElement = event.target.closest("details[open]");
  if (!openDetailsElement) return;

  const summaryElement = openDetailsElement.querySelector("summary");
  openDetailsElement.removeAttribute("open");
  summaryElement.setAttribute("aria-expanded", false);
  summaryElement.focus();
}

function debounce(fn, wait) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

function throttle(fn, delay) {
  let lastCall = 0;
  return function (...args) {
    const now = new Date().getTime();
    if (now - lastCall < delay) {
      return;
    }
    lastCall = now;
    return fn(...args);
  };
}

function fetchConfig(type = "json") {
  return {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: `application/${type}`,
    },
  };
}

function AjaxremoveFromCart(items, qtys) {
  const itemIds = Array.isArray(items) ? items : [items];
  const itemQtys = Array.isArray(qtys) ? qtys : [qtys];

  if (!itemIds.length || !itemQtys.length) {
    console.warn("No items to remove from cart.");
    return;
  }

  fetch(window.Shopify.routes.root + "cart.js")
    .then((response) => response.json())
    .then((cart) => {
      const updates = {};

      cart.items.forEach((item) => {
        const index = itemIds.indexOf(item.id);
        if (index !== -1) {
          updates[item.id] = Math.max(0, item.quantity - itemQtys[index]);
        } else {
          updates[item.id] = item.quantity;
        }
      });

      return fetch(window.Shopify.routes.root + "cart/update.js", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ updates }),
      });
    })
    .then((response) => response.json())
    .then((data) => {
      if (typeof CartDrawer !== "undefined") {
        CartDrawer.renderCart();
        CartDrawer.updateCartCount();
        CartDrawer.checkAndClearCart();
      } else {
        console.warn("CartDrawer is not defined.");
      }
    })
    .catch((error) => {
      console.error("Error updating cart:", error);
    });
}

/*
 * Shopify Common JS
 *
 */
if (typeof window.Shopify == "undefined") {
  window.Shopify = {};
}

Shopify.bind = function (fn, scope) {
  return function () {
    return fn.apply(scope, arguments);
  };
};

Shopify.setSelectorByValue = function (selector, value) {
  for (var i = 0, count = selector.options.length; i < count; i++) {
    var option = selector.options[i];
    if (value == option.value || value == option.innerHTML) {
      selector.selectedIndex = i;
      return i;
    }
  }
};

Shopify.addListener = function (target, eventName, callback) {
  target.addEventListener
    ? target.addEventListener(eventName, callback, false)
    : target.attachEvent("on" + eventName, callback);
};

Shopify.postLink = function (path, options) {
  options = options || {};
  var method = options["method"] || "post";
  var params = options["parameters"] || {};

  var form = document.createElement("form");
  form.setAttribute("method", method);
  form.setAttribute("action", path);

  for (var key in params) {
    var hiddenField = document.createElement("input");
    hiddenField.setAttribute("type", "hidden");
    hiddenField.setAttribute("name", key);
    hiddenField.setAttribute("value", params[key]);
    form.appendChild(hiddenField);
  }
  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);
};

class QuantityInput extends HTMLElement {
  constructor() {
    super();
    this.input = this.querySelector("input");
    this.changeEvent = new Event("change", { bubbles: true });
    this.input.addEventListener("change", this.onInputChange.bind(this));
    this.querySelectorAll("button").forEach((button) =>
      button.addEventListener("click", this.onButtonClick.bind(this))
    );
  }

  quantityUpdateUnsubscriber = undefined;

  connectedCallback() {
    this.validateQtyRules();
    this.quantityUpdateUnsubscriber = subscribe(
      "quantity-update",
      this.validateQtyRules.bind(this)
    );
  }

  disconnectedCallback() {
    if (this.quantityUpdateUnsubscriber) {
      this.quantityUpdateUnsubscriber();
    }
  }

  onInputChange(event) {
    this.validateQtyRules();
  }

  onButtonClick(event) {
    event.preventDefault();
    const previousValue = this.input.value;

    let value = parseInt(this.input.value);

    if (event.target.name === "plus") {
      if (isNaN(value) || value < parseInt(this.input.dataset.min)) {
        value = parseInt(this.input.dataset.min);
      } else {
        value += parseInt(this.input.step);
      }
    } else if (event.target.name === "minus") {
      if (isNaN(value) || value <= parseInt(this.input.dataset.min)) {
        value = 1;
      } else {
        value -= parseInt(this.input.step);
      }
    }

    value = Math.max(value, 1);
    if (this.input.max) {
      value = Math.min(value, parseInt(this.input.max));
    }

    this.input.value = value;
    if (previousValue !== this.input.value)
      this.input.dispatchEvent(this.changeEvent);
  }

  validateQtyRules() {
    const value = parseInt(this.input.value);
    if (this.input.min) {
      const buttonMinus = this.querySelector(".quantity__button[name='minus']");
      buttonMinus.classList.toggle("disabled", value <= 1);
    }
    if (this.input.max) {
      const max = parseInt(this.input.max);
      const buttonPlus = this.querySelector(".quantity__button[name='plus']");
      buttonPlus.classList.toggle("disabled", value >= max);
    }
  }
}

customElements.define("quantity-input", QuantityInput);

class CartRemoveButton extends HTMLElement {
  constructor() {
    super();

    this.addEventListener("click", (event) => {
      event.preventDefault();
      const cartItems = this.closest("cart-drawer");
      const button = this.querySelector("button");

      const {
        variantId,
        variantQuantity,
        addonCartVariantId,
        addonCartVariantQty,
      } = button.dataset;

      let variantIds = [variantId],
        addonCartVariantIds = [addonCartVariantId],
        variantQuantitys = [variantQuantity],
        addonCartVariantQtys = [addonCartVariantQty];

      try {
        variantIds = JSON.parse(variantIds);
        addonCartVariantIds = JSON.parse(addonCartVariantIds);
        variantQuantitys = JSON.parse(variantQuantitys);
        addonCartVariantQtys = JSON.parse(addonCartVariantQtys);
      } catch (e) {
        variantIds = [variantId];
        addonCartVariantIds = [addonCartVariantId];
        variantQuantitys = [variantQuantity];
        addonCartVariantQtys = [addonCartVariantQty];
      }

      const allVariantIds = [...variantIds, ...addonCartVariantIds];
      const allVariantQtys = [...variantQuantitys, ...addonCartVariantQtys];

      if (allVariantIds.length > 1) {
        AjaxremoveFromCart(allVariantIds, allVariantQtys);
      } else {
        cartItems.updateQuantity(this.dataset.index, 0);
      }
    });
  }
}

customElements.define("cart-remove-button", CartRemoveButton);

class CartUpsellProduct extends HTMLElement {
  constructor() {
    super();
    this.addEventListener("change", this.onCheckboxChange.bind(this));
    this.addEventListener("click", this.onCheckboxChange.bind(this));
  }

  onCheckboxChange(event) {
    if (event.target.matches(".cart_upsell_product")) {
      const variantId = event.target.dataset.variantId;
      const quantity = event.target.checked ? 1 : 0;
      const cartItems = this.closest("cart-drawer");
      cartItems.addToCart(variantId, quantity);
    }
  }
}

customElements.define("cart-upsell-product", CartUpsellProduct);

if (!customElements.get("cart-note")) {
  customElements.define(
    "cart-note",
    class CartNote extends HTMLElement {
      constructor() {
        super();

        this.addEventListener(
          "input",
          debounce((event) => {
            const body = JSON.stringify({ note: event.target.value });
            fetch(window.Shopify.routes.root + "cart/update.js", {
              ...fetchConfig(),
              ...{ body },
            });
          }, 300)
        );
      }
      connectedCallback() {
        this.onCartChangeUnsubscriber = subscribe(
          PUB_SUB_EVENTS.cartNoteChange,
          this.handleCartNoteChange.bind(this)
        );
      }

      disconnectedCallback() {
        this.onCartChangeUnsubscriber();
      }

      handleCartNoteChange({ data: { note } }) {
        fetch(window.Shopify.routes.root + "cart/update.js", {
          ...fetchConfig(),
          body: JSON.stringify({ note }),
        });

        const textarea = this.querySelector(`textarea[name="note"]`);
        if (textarea && textarea.value !== note) {
          textarea.value = note;
          textarea.dispatchEvent(new Event("input", { bubbles: true }));
        }
      }
    }
  );
}

class CartDrawer extends HTMLElement {
  constructor() {
    super();

    this.addEventListener(
      "keyup",
      (evt) => evt.code === "Escape" && this.close()
    );
    document.addEventListener("click", this.handleDocumentClick.bind(this));

    this.setHeaderCartIconAccessibility();

    this.addEventListener("click", (event) => {
      if (event.target.closest(".quantity__button")) {
        this.handleQuantityChange(event);
      }
    });
  }

  setHeaderCartIconAccessibility() {
    const cartLinks = document.querySelectorAll("#cart-icon-bubble");
    if (!cartLinks.length) return;

    cartLinks.forEach((cartLink) => {
      cartLink.setAttribute("role", "button");
      cartLink.setAttribute("aria-haspopup", "dialog");

      cartLink.addEventListener("click", (event) => {
        event.preventDefault();
        if (this.classList.contains("active")) {
          this.close();
        } else {
          this.open(cartLink);
          CartDrawer.renderCart();
        }
      });

      cartLink.addEventListener("keydown", (event) => {
        if (event.code.toUpperCase() === "SPACE") {
          event.preventDefault();
          if (this.classList.contains("active")) {
            this.close();
          } else {
            this.open(cartLink);
          }
        }
      });
    });
  }

  handleDocumentClick(event) {
    const cartDrawer = document.querySelector(".drawer__inner");
    const cartButtons = document.querySelectorAll("#cart-icon-bubble");

    if (this.classList.contains("active") && cartDrawer) {
      const isClickOutsideCart = !cartDrawer.contains(event.target);
      const isClickOutsideButtons = !Array.from(cartButtons).some(
        (cartButton) => cartButton.contains(event.target)
      );

      if (isClickOutsideCart && isClickOutsideButtons) {
        this.close();
      }
    }
  }

  open(triggeredBy) {
    if (triggeredBy) this.setActiveElement(triggeredBy);

    const cartDrawerNote = this.querySelector('[id^="Details-"] summary');
    if (cartDrawerNote && !cartDrawerNote.hasAttribute("role"))
      this.setSummaryAccessibility(cartDrawerNote);

    setTimeout(() => {
      this.classList.add("animate", "active");
      document.getElementById("PageContainer").classList.add("active");
    });

    this.addEventListener(
      "transitionend",
      () => {
        const containerToTrapFocusOn = this.classList.contains("is-empty")
          ? this.querySelector(".drawer__inner-empty")
          : document.getElementById("CartDrawer");
        const focusElement =
          this.querySelector(".drawer__inner") ||
          this.querySelector(".drawer__close");
        trapFocus(containerToTrapFocusOn, focusElement);
      },
      { once: true }
    );

    document.body.classList.add("overflow-hidden");
  }

  close() {
    this.classList.remove("active");
    document.getElementById("PageContainer").classList.remove("active");
    removeTrapFocus(this.activeElement);
    document.body.classList.remove("overflow-hidden");
  }

  setSummaryAccessibility(cartDrawerNote) {
    cartDrawerNote.setAttribute("role", "button");
    cartDrawerNote.setAttribute("aria-expanded", "false");

    if (cartDrawerNote.nextElementSibling.getAttribute("id")) {
      cartDrawerNote.setAttribute(
        "aria-controls",
        cartDrawerNote.nextElementSibling.id
      );
    }

    cartDrawerNote.addEventListener("click", (event) => {
      event.currentTarget.setAttribute(
        "aria-expanded",
        !event.currentTarget.closest("details").hasAttribute("open")
      );
    });

    cartDrawerNote.parentElement.addEventListener("keyup", onKeyUpEscape);
  }

  setActiveElement(element) {
    this.activeElement = element;
  }

  handleQuantityChange(event) {
    const button = event.target.closest(".quantity__button");
    const input = button
      .closest(".quantity-popover-wrapper")
      .querySelector(".quantity__input");
    let quantity = parseInt(input.value);

    if (button.name === "plus") {
      quantity += 1;
    } else if (button.name === "minus") {
      quantity = Math.max(0, quantity - 1);
    }

    input.value = quantity;
    this.updateQuantity(input.dataset.index, quantity);
  }

  updateQuantity(lineIndex, quantity) {
    const xhr = new XMLHttpRequest();
    const data = JSON.stringify({
      line: parseInt(lineIndex),
      quantity: parseInt(quantity),
    });

    xhr.open("POST", "/cart/change.js", true);
    xhr.setRequestHeader("Content-Type", "application/json");

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const cart = JSON.parse(xhr.responseText);
        CartDrawer.renderCart();
        CartDrawer.updateCartCount();
      } else {
        console.error("Failed to update cart item:", xhr.responseText);
      }
    };

    xhr.onerror = () => {
      console.error("Error making AJAX request");
    };

    xhr.send(data);
  }

  addToCart(variantId, quantity = 1) {
    const xhr = new XMLHttpRequest();
    const data = JSON.stringify({
      id: variantId,
      quantity: parseInt(quantity),
    });

    xhr.open("POST", "/cart/add.js", true);
    xhr.setRequestHeader("Content-Type", "application/json");

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const cart = JSON.parse(xhr.responseText);
        CartDrawer.renderCart();
        CartDrawer.updateCartCount();
      } else {
        console.error("Failed to add item to cart:", xhr.responseText);
      }
    };

    xhr.onerror = () => {
      console.error("Error making AJAX request");
    };

    xhr.send(data);
  }

  static updateCartCount() {
    fetch("/cart.js")
      .then((response) => response.json())
      .then((cart) => {
        const cartCountElements = document.querySelectorAll(".cart_count");
        const itemCount = cart.item_count;

        cartCountElements.forEach((el) => (el.textContent = itemCount));
      })
      .catch((error) => console.error("Error fetching cart:", error));
  }

  static renderCart() {
    const loaderArea = document.querySelector(".loader-area");
    fetch("/cart?section_id=cart-items")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch updated cart section");
        }
        return response.text();
      })
      .then((html) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");
        const newCartContent = doc.getElementById("CartDrawer");
        const note =
          newCartContent
            ?.querySelector(`[name="note"]`)
            ?.value?.split("###")
            .join("\n") ?? "";

        loaderArea.classList.remove("hidden");

        if (newCartContent) {
          const cartDrawer = document.getElementById("CartDrawer");
          cartDrawer.innerHTML = newCartContent.innerHTML;
          publish(PUB_SUB_EVENTS.cartNoteChange, {
            data: {
              note: note ? note : "",
            },
          });
        }

        setTimeout(() => {
          loaderArea.classList.add("hidden");
        }, 600);
      })
      .catch((error) => {
        console.error("Error updating cart content:", error);
      });
  }

  static checkAndClearCart() {
    fetch("/cart.js")
      .then((response) => response.json())
      .then((cart) => {
        if (cart.total_price === 0) {
          fetch("/cart/clear.js", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          })
            .then((response) => response.json())
            .catch((error) => console.error("Error clearing cart:", error));

          CartDrawer.updateCartCount();
        }
      })
      .catch((error) => console.error("Error fetching cart:", error));
  }
}

customElements.define("cart-drawer", CartDrawer);
