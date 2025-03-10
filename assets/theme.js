window.theme = window.theme || {};
window.Shopify = window.Shopify || {};

const PUB_SUB_EVENTS = {
  cartNoteChange: "cart-note-change",
};

let subscribers = {};

function subscribe(eventName, callback) {
  if (subscribers[eventName] === undefined) {
    subscribers[eventName] = [];
  }

  subscribers[eventName] = [...subscribers[eventName], callback];

  return function unsubscribe() {
    subscribers[eventName] = subscribers[eventName].filter((cb) => {
      return cb !== callback;
    });
  };
}

function publish(eventName, data) {
  if (subscribers[eventName]) {
    subscribers[eventName].forEach((callback) => {
      callback(data);
    });
  }
}

window.theme = window.theme || {};
window.Shopify = window.Shopify || {};

(function polyfillNodeList() {
  /* For IE 11+ Nodelist forEach Function */
  if (window.NodeList && !NodeList.prototype.forEach) {
    NodeList.prototype.forEach = function (callback, thisArg) {
      thisArg = thisArg || window;
      for (var i = 0; i < this.length; i++) {
        callback.call(thisArg, this[i], i, this);
      }
    };
  }
})();

/*============================================================================
Section Loading
==============================================================================*/
theme.Sections = function Sections() {
  this.constructors = {};
  this.instances = [];

  $(document)
    .on("shopify:section:load", this._onSectionLoad.bind(this))
    .on("shopify:section:unload", this._onSectionUnload.bind(this))
    .on("shopify:section:select", this._onSelect.bind(this))
    .on("shopify:section:deselect", this._onDeselect.bind(this))
    .on("shopify:block:select", this._onBlockSelect.bind(this))
    .on("shopify:block:deselect", this._onBlockDeselect.bind(this));
};
theme.Sections.prototype = _.assignIn({}, theme.Sections.prototype, {
  _createInstance: function (container, constructor) {
    var $container = $(container);
    var id = $container.attr("data-section-id");
    var type = $container.attr("data-section-type");

    constructor = constructor || this.constructors[type];

    if (_.isUndefined(constructor)) {
      return;
    }

    var instance = _.assignIn(new constructor(container), {
      id: id,
      type: type,
      container: container,
    });

    this.instances.push(instance);
  },

  _onSectionLoad: function (evt) {
    var container = $("[data-section-id]", evt.target)[0];
    if (container) {
      this._createInstance(container);
    }
  },

  _onSectionUnload: function (evt) {
    this.instances = _.filter(this.instances, function (instance) {
      var isEventInstance = instance.id === evt.originalEvent.detail.sectionId;

      if (isEventInstance) {
        if (_.isFunction(instance.onUnload)) {
          instance.onUnload(evt);
        }
      }

      return !isEventInstance;
    });
  },

  _onSelect: function (evt) {
    // eslint-disable-next-line no-shadow
    var instance = _.find(this.instances, function (instance) {
      return instance.id === evt.originalEvent.detail.sectionId;
    });

    if (!_.isUndefined(instance) && _.isFunction(instance.onSelect)) {
      instance.onSelect(evt);
    }
  },

  _onDeselect: function (evt) {
    // eslint-disable-next-line no-shadow
    var instance = _.find(this.instances, function (instance) {
      return instance.id === evt.originalEvent.detail.sectionId;
    });

    if (!_.isUndefined(instance) && _.isFunction(instance.onDeselect)) {
      instance.onDeselect(evt);
    }
  },

  _onBlockSelect: function (evt) {
    // eslint-disable-next-line no-shadow
    var instance = _.find(this.instances, function (instance) {
      return instance.id === evt.originalEvent.detail.sectionId;
    });

    if (!_.isUndefined(instance) && _.isFunction(instance.onBlockSelect)) {
      instance.onBlockSelect(evt);
    }
  },

  _onBlockDeselect: function (evt) {
    // eslint-disable-next-line no-shadow
    var instance = _.find(this.instances, function (instance) {
      return instance.id === evt.originalEvent.detail.sectionId;
    });

    if (!_.isUndefined(instance) && _.isFunction(instance.onBlockDeselect)) {
      instance.onBlockDeselect(evt);
    }
  },

  register: function (type, constructor) {
    this.constructors[type] = constructor;

    $("[data-section-type=" + type + "]").each(
      function (index, container) {
        this._createInstance(container, constructor);
      }.bind(this)
    );
  },
});

/*============================================================================
Other
==============================================================================*/
var mobile = window.matchMedia("(max-width: 740px)");
var tablet = window.matchMedia("(max-width: 979px) and (min-width: 741px)");
var desktop = window.matchMedia("(min-width: 980px)");

$(document).ready(function () {
  (function animationAOS() {
    /* Initiate AOS Scrolling after Lazysizes loads */
    document.addEventListener("lazybeforeunveil", function (e) {
      AOS.init({ disable: "mobile" });
    });

    Events.on("editor:section:select", function () {
      AOS.init();
    });
  })();

  (function helperPlaceholder() {
    // Help old browsers with placeholders for inputs
    $("input, textarea").placeholder();
  })();

  (function helperResponsiveTables() {
    $(".rte table").wrap('<div class="rte__table-wrapper"></div>');
  })();

  (function productQuickView() {
    $('[data-fancybox^="quick-view"]').fancybox({
      type: "ajax",
      toolbar: false,
      infobar: false,
      arrows: false,
      baseClass: "quickview-popup",
      afterShow: function () {
        var context = document.querySelector(".product-quick-view");
        Events.trigger("quickview:load", context);
      },
    });
  })();

  // Sidebar Toggle for screens below 980px wide
  var $Sidebar = $("#sidebar");
  $(document).on("click.toggleNav touch.toggleNav", ".show", function () {
    $Sidebar.toggleClass("open");
  });

  (function productSocialShare() {
    $(window).on("load resize orientationchange", function () {
      if ($(window).width() > 980) {
        var HHeight = $("header").height();
        var OffSet = Number(HHeight) + Number(20);

        $(".share-icons").stick_in_parent({
          parent: ".product-page",
          offset_top: OffSet,
        });
      }
    });
  })();
});

/*============================================================================
Product Modules
==============================================================================*/
var Events = new EventEmitter3();
Events.trigger = Events.emit; // trigger alias

theme.ProductForm = function (context, events, Product) {
  var $context = $(context);
  let isCarted = false,
    addonPreviousValues = {};

  var config = JSON.parse(context.dataset.productForm || "{}"),
    Offered_product = Offered_product || [],
    Offered_product_qty = Offered_product_qty || [],
    Offered_product_note = Offered_product_note || [],
    BaseVariantId = 0;

  const addonItems = document.querySelectorAll(".addons-products__item")
    ? document.querySelectorAll(".addons-products__item")
    : null;
  const addonPriceElement = document.querySelector(
    "[data-addon-variant-per-unit-price]"
  )
    ? document.querySelector("[data-addon-variant-per-unit-price]")
    : null;
  const addonTotalPriceElement = document.querySelector(
    "[data-addon-variant-all-unit-price]"
  )
    ? document.querySelector("[data-addon-variant-all-unit-price]")
    : null;
  const addonAllAddedOnceCheckbox = document.querySelector(
    "input[data-addon-variant-all-added-once]"
  )
    ? document.querySelector("input[data-addon-variant-all-added-once]")
    : null;

  const productselectID = document.querySelector(
    "#product-select-" + Product.id
  );

  function OfferedProduct(Vid) {
    BaseVariantId = Vid;
    for (let option of productselectID.options) {
      if (Vid == option.value) {
        const offeredProductId = option.getAttribute("data-offered-product-id");
        const offeredQuantity = option.getAttribute("data-offered-quantity");
        if (offeredProductId) {
          Offered_product = JSON.parse(offeredProductId);
          Offered_product_qty = JSON.parse(offeredQuantity);
        }
        break;
      }
    }
    return Offered_product, Offered_product_qty;
  }

  function updateCartCount() {
    fetch("/cart.js")
      .then((response) => response.json())
      .then((cart) => {
        const cartCountElements = document.querySelectorAll(".cart_count");
        const itemCount = cart.item_count;

        cartCountElements.forEach((el) => {
          el.textContent = itemCount;
          if (itemCount > 0) {
            el.classList.remove("hidden");
          }
        });
      })
      .catch((error) => console.error("Error fetching cart:", error));
  }

  function renderCart() {
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

        const cartDrawerElement = document.querySelector("cart-drawer");
        const pageContainer = document.getElementById("PageContainer");

        cartDrawerElement.classList.add("animate");

        setTimeout(() => {
          if (cartDrawerElement.classList.contains("is-empty")) {
            cartDrawerElement.classList.remove("is-empty");
          }
          if (!cartDrawerElement.classList.contains("active")) {
            cartDrawerElement.classList.add("active");
          }

          if (pageContainer && !pageContainer.classList.contains("active")) {
            pageContainer.classList.add("active");
          }
          setTimeout(() => {
            loaderArea.classList.add("hidden");
          }, 600);
        }, 200);
      })
      .catch((error) => {
        console.error("Error updating cart content:", error);
      });
  }

  function addToCart(items, note) {
    const payload = note ? { items, note } : { items };

    const xhr = new XMLHttpRequest();
    const data = JSON.stringify(payload);

    xhr.open("POST", "/cart/add.js", true);
    xhr.setRequestHeader("Content-Type", "application/json");

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        updateCartCount();
        renderCart();
      } else {
        console.error("Failed to add items to cart:", xhr.responseText);
      }
    };

    xhr.onerror = () => {
      console.error("Error making AJAX request");
    };

    xhr.send(data);
  }

  function OfferedProductCarted(vid, qty, note) {
    if (typeof isCarted === "undefined" || !isCarted) {
      const ids = Array.isArray(vid) ? vid : [vid];
      const quantities = Array.isArray(qty) ? qty : [qty];

      if (ids.length !== quantities.length) {
        return false;
      }

      const items = ids.map((id, index) => ({
        id,
        quantity: quantities[index]
      }));

      addToCart(items, note || undefined);
      return true;
    }
    return false;
  }


  function updateAddonData(newlyAddonVariantId, newlyAddonQty) {
    newlyAddonVariantId = Number(newlyAddonVariantId);
    newlyAddonQty = Number(newlyAddonQty);
    const productIndex = Offered_product.indexOf(newlyAddonVariantId);

    if (newlyAddonQty > 0) {
      if (productIndex === -1) {
        Offered_product.push(newlyAddonVariantId);
        Offered_product_qty.push(newlyAddonQty);
      } else {
        Offered_product_qty[productIndex] = newlyAddonQty;
      }
    } else if (newlyAddonQty === 0 && productIndex !== -1) {
      Offered_product.splice(productIndex, 1);
      Offered_product_qty.splice(productIndex, 1);
    }
  }

  function updateActiveClass(
    selectedOption,
    addonItems,
    priceElement,
    totalPriceElement,
    allAddedOnceCheckbox,
    previousValues
  ) {
    if (!selectedOption) return;

    const selectedValue = selectedOption.trim().toLowerCase();
    let firstMatchingPrice = null;
    let totalPrice = 0;

    addonItems.forEach((item) => {
      const groupName =
        item
          .getAttribute("data-addon-variant-group-name")
          ?.trim()
          .toLowerCase() || "";

      if (groupName.includes(selectedValue)) {
        item.classList.remove("hidden");

        if (!firstMatchingPrice) {
          firstMatchingPrice =
            Number(item.getAttribute("data-addon-variant-price")) || 0;
        }

        let qtyLimit =
          Number(item.getAttribute("data-addon-variant-qty-limit")) || 1;
        totalPrice +=
          Number(item.getAttribute("data-addon-variant-price") * qtyLimit) || 0;

        const minusButton = item.querySelector('button[name="minus"]');
        const plusButton = item.querySelector('button[name="plus"]');
        const inputField = item.querySelector(
          ".addons-products__item-quantity-input"
        );

        if (minusButton && !minusButton.hasEventListener) {
          minusButton.addEventListener("click", (event) =>
            handleMinusClick(event, previousValues)
          );
          minusButton.hasEventListener = true;
        }

        if (plusButton && !plusButton.hasEventListener) {
          plusButton.addEventListener("click", (event) =>
            handlePlusClick(event, previousValues)
          );
          plusButton.hasEventListener = true;
        }

        inputField.addEventListener("change", () => {
          validateInput(inputField);
          previousValues[item.dataset.addonVariantId] = inputField.value;
          updateAddonData(item.dataset.addonVariantId, inputField.value);
        });

        if (!previousValues[item.dataset.addonVariantId]) {
          previousValues[item.dataset.addonVariantId] = inputField.value;
        }

        if (allAddedOnceCheckbox && allAddedOnceCheckbox.checked) {
          inputField.value = qtyLimit;
          updateAddonData(item.dataset.addonVariantId, qtyLimit);
        } else {
          inputField.value = previousValues[item.dataset.addonVariantId] || 0;
          updateAddonData(item.dataset.addonVariantId, inputField.value);
        }
      } else {
        item.classList.add("hidden");
        updateAddonData(item.dataset.addonVariantId, 0);
      }
    });

    if (priceElement && firstMatchingPrice) {
      priceElement.textContent = firstMatchingPrice / 100;
    }

    if (totalPriceElement) {
      totalPriceElement.textContent = `$${totalPrice / 100}`;
    }
  }

  function handleMinusClick(event, previousValues) {
    const inputField = event.target
      .closest(".addons-products__item")
      .querySelector(".addons-products__item-quantity-input");
    let newlyAddonVariantId = inputField.closest(".addons-products__item")
      .dataset.addonVariantId;
    let currentValue = parseInt(inputField.value) || 0;
    let newlyAddonQty = currentValue > 0 ? currentValue - 1 : 0;

    if (newlyAddonQty >= 0) {
      inputField.value = newlyAddonQty;
      validateInput(inputField);
      previousValues[newlyAddonVariantId] = inputField.value;
    }

    updateAddonData(newlyAddonVariantId, newlyAddonQty);
  }

  function handlePlusClick(event, previousValues) {
    const inputField = event.target
      .closest(".addons-products__item")
      .querySelector(".addons-products__item-quantity-input");
    let newlyAddonVariantId = inputField.closest(".addons-products__item")
      .dataset.addonVariantId;
    let currentValue = parseInt(inputField.value) || 0;
    let newlyAddonQty = currentValue + 1;

    const maxValue = parseInt(inputField.max) || 0;
    if (newlyAddonQty <= maxValue) {
      inputField.value = newlyAddonQty;
      validateInput(inputField);
      previousValues[newlyAddonVariantId] = inputField.value;
    }

    updateAddonData(newlyAddonVariantId, newlyAddonQty);
  }

  function validateInput(inputField) {
    let value = parseInt(inputField.value) || 0;
    const maxValue = parseInt(inputField.max) || 0;
    const minValue = parseInt(inputField.min) || 0;

    if (value < minValue) {
      inputField.value = minValue;
    } else if (value > maxValue) {
      inputField.value = maxValue;
    }

    if (isNaN(value)) {
      inputField.value = 0;
    }
  }

  (function quantity_controls() {
    var element = context.querySelector(".product-quantity");

    if (!element) {
      return false;
    }

    events.on("quantitycontrol:plus", function () {
      var quantity = element.value;
      var max = element.max;

      if (parseInt(quantity) >= parseInt(max)) {
        var $addButtoncontainer = $(".product-add");
        var msg =
          theme.strings.qtyErrorFirst +
          "\xa0" +
          max +
          "\xa0" +
          theme.strings.qtyErrorLast;
        var soldOutMsg = theme.strings.qtySoldOut;

        if (max > 0) {
          $addButtoncontainer.before(
            '<div class="errors qty-error">' + msg + "</div>"
          );
        } else {
          $addButtoncontainer.before(
            '<div class="errors qty-error">' + soldOutMsg + "</div>"
          );
        }

        setTimeout(function () {
          $(".qty-error").fadeOut();
          $(".qty-error").remove();
        }, 2000);
      } else {
        var quantity = parseInt(element.value) + 1;

        if (quantity < 1) {
          return false;
        }

        element.value = quantity;
      }
    });
    events.on("quantitycontrol:minus", function () {
      var quantity = parseInt(element.value) - 1;

      if (quantity < 1) {
        return false;
      }

      element.value = quantity;
    });

    ControlPlus();
    ControlMinus();

    function ControlPlus() {
      var element = context.querySelector(".quantity-control-up");

      if (!element) {
        return false;
      }

      element.addEventListener("click", function (event) {
        event.preventDefault();
        events.trigger("quantitycontrol:plus");
      });
    }
    function ControlMinus() {
      var element = context.querySelector(".quantity-control-down");

      if (!element) {
        return false;
      }

      element.addEventListener("click", function (event) {
        event.preventDefault();
        events.trigger("quantitycontrol:minus");
      });
    }
  })();

  if (Product.variants.length == 1) {
    return false;
  }

  new Shopify.OptionSelectors("product-select-" + Product.id, {
    product: Product,
    onVariantSelected: function (variant, selector) {
      if (!variant) {
        events.trigger("variantunavailable");
        return;
      }

      if (Product.variants.length == 1) {
        return;
      }

      const tabChange = new CustomEvent("tabChange", { detail: variant });
      window.dispatchEvent(tabChange);

      const reviewChange = new CustomEvent("reviewChange", { detail: variant });
      window.dispatchEvent(reviewChange);

      events.trigger("variantchange", variant);
      events.trigger("variantchange:option1:" + variant.option1);
      events.trigger("variantchange:option2:" + variant.option2);
      events.trigger("variantchange:option3:" + variant.option3);

      OfferedProduct(variant.id);

      updateActiveClass(
        variant.option2,
        addonItems,
        addonPriceElement,
        addonTotalPriceElement,
        addonAllAddedOnceCheckbox,
        addonPreviousValues
      );

      if (addonAllAddedOnceCheckbox) {
        addonAllAddedOnceCheckbox.addEventListener("change", () => {
          updateActiveClass(
            variant.option2,
            addonItems,
            addonPriceElement,
            addonTotalPriceElement,
            addonAllAddedOnceCheckbox,
            addonPreviousValues
          );
        });
      }

      var priceContainers = context.querySelectorAll(".price-container");
      priceContainers.forEach(function (priceContainer) {
        var comparePriceTag = priceContainer.querySelector(".was"),
          currentPriceTag = priceContainer.querySelector(
            ".product-price.current"
          ),
          saveMoneyTag = priceContainer.querySelector(".money_save");
        if (comparePriceTag && saveMoneyTag) {
          if (
            !variant.compare_at_price ||
            variant.compare_at_price <= variant.price ||
            !variant.available
          ) {
            comparePriceTag.style.display = "none";
            saveMoneyTag.style.display = "none";
            currentPriceTag.classList.remove("sale");
          } else {
            comparePriceTag.removeAttribute("style");
            saveMoneyTag.removeAttribute("style");
            currentPriceTag.classList.add("sale");
          }
        }
      });

      if (variant.featured_image) {
        events.trigger("variantchange:image", variant.featured_image.id);
        setTimeout(function () {
          $(".product-image-container").slick(
            "slickGoTo",
            +variant.featured_image.position - 1
          );

          $("#thumbnail-gallery .thumbnail-slider").slick(
            "slickGoTo",
            +variant.featured_image.position - 1
          );
        }, 200);
      }

      const customCheckoutButton = document.querySelectorAll(
        ".custom-checkout-button"
      );
      customCheckoutButton.forEach((button) => {
        button.href = `/cart/${variant.id}:1`;
        button.setAttribute("data-variant-id", variant.id);
      });

      var messageContainer = document.querySelector(".inventory__message");

      if (messageContainer) {
        const variantTitle = variant.title.trim();

        let messageFound = false;

        Object.keys(window.leadTime).forEach((name) => {
          const [nameFirst, nameLast] = name
            .split("&")
            .map((part) => part.trim());
          const isNameMatch = name.includes("&")
            ? variantTitle.includes(nameFirst) &&
            variantTitle.includes(nameLast)
            : variantTitle.includes(name.trim());

          if (isNameMatch && window.leadTime[name].message) {
            messageContainer.parentNode.style.display = "block";
            messageContainer.innerHTML = `
                        <span class="inventory__signal" style="background-color: ${window.leadTime[name].color};"></span>
                        ${window.leadTime[name].message}
                    `;
            messageFound = true;
          }
        });

        if (!messageFound) {
          messageContainer.parentNode.style.display = "none";
        }
      }

      const specification = document.querySelector(
        ".product_specification_pdp"
      );
      if (specification) {
        let variantTitle = variant.title;
        if (variantTitle && variantTitle.includes("Extra-Deep")) {
          specification.textContent = `${window.productSpecification.dimensions_extra_deep}`;
        } else {
          specification.textContent = `${window.productSpecification.dimensions}`;
        }
      }

      const productTitle = document.querySelector(".product_title");
      if (productTitle) {
        let variantTitle = variant.title;
        if (variantTitle && variantTitle.includes("Extra-Deep")) {
          productTitle.textContent = `${window.productSpecification.title_extra_deep}`;
        } else if (variantTitle && variantTitle.includes("Classic")) {
          productTitle.textContent = `${window.productSpecification.title}`;
        }
      }

      const productDesc = document.querySelectorAll(
        ".product__description .expandable_text"
      );
      if (productDesc.length > 0) {
        productDesc.forEach((el) => {
          let variantTitle = variant.title;
          if (variantTitle && variantTitle.includes("Extra-Deep")) {
            el.innerHTML = `${window.productDescription.description_extra_deep}`;
          } else if (variantTitle && variantTitle.includes("Classic")) {
            el.innerHTML = `${window.productDescription.description}`;
          }
        });
      }

      const productDescriptionPanel = document.querySelectorAll(
        "tab-container .tab-product-description"
      );
      if (productDescriptionPanel.length > 0) {
        productDescriptionPanel.forEach((el) => {
          let variantTitle = variant.title;
          if (variantTitle && variantTitle.includes("Extra-Deep")) {
            el.innerHTML = `${window.productDescription.description_extra_deep}`;
          } else if (variantTitle && variantTitle.includes("Classic")) {
            el.innerHTML = `${window.productDescription.description}`;
          }
        });
      }

      const specialFeatureForExtraDeep = document.querySelector(
        ".product-special-feature__container.only-extra-deep"
      );
      if (specialFeatureForExtraDeep) {
        let variantTitle = variant.title;
        if (variantTitle && variantTitle.includes("Extra-Deep")) {
          specialFeatureForExtraDeep.classList.add("active");
        } else {
          specialFeatureForExtraDeep.classList.remove("active");
        }
      }
    },

    enableHistoryState: config.enable_history,
  });

  (function quantity_limit() {
    events.on("variantchange", function (variant, element) {
      var element = context.querySelector(".product-quantity");
      if (!element) {
        return false;
      }

      element.max = variant.inventory_quantity;

      if (element.max < 1) {
        element.value = "0";
      } else {
        element.value = "1";
      }
    });
  })();

  (function single_option_selectors() {
    var elements = context.querySelectorAll(".single-option-selector");

    elements.forEach(Selector);

    function Selector(element, index) {
      var option_position = index + 1;

      events.on("swatch:change:" + option_position, change);
      function change(value) {
        $(element).val(value).trigger("change");
      }
    }
  })();

  (function swatches() {
    var elements = context.querySelectorAll("[type=radio]");

    var states = {
      sold_out: function (element) {
        element.parentElement.classList.add("soldout");
      },
      available: function (element) {
        element.parentElement.classList.remove("soldout");
      },
    };

    events.on("variantunavailable", set_unavailable);

    elements.forEach(Swatch);

    function set_unavailable() {
      var selected = {};

      var selected_elements = $(elements).filter(":checked").toArray();

      selected_elements.forEach(function (element) {
        var option = "option" + element.getAttribute("data-position");
        var value = element.value;

        selected[option] = value;
      });

      elements.forEach(function (element) {
        var available = false;

        var current_option = "option" + element.getAttribute("data-position");

        var current_value = element.value;

        var other_options = ["option1", "option2", "option3"].filter(function (
          option
        ) {
          return selected[option] && option != current_option;
        });

        Product.variants.forEach(function (variant) {
          if (!variant.available) {
            return;
          }

          if (variant[current_option] != current_value) {
            return;
          }

          if (
            variant[other_options[0]] == selected[other_options[0]] &&
            variant[other_options[1]] == selected[other_options[1]]
          ) {
            available = true;
            return;
          }
        });

        if (available) {
          states.available(element);
        } else {
          states.sold_out(element);
        }
      });
    }

    function Swatch(element) {
      var option_position = element.getAttribute("data-position");
      var current_option = "option" + option_position;

      var other_options = ["option1", "option2", "option3"].filter(function (
        option
      ) {
        return option != current_option;
      });

      element.addEventListener("change", function (event) {
        events.trigger("swatch:change:" + option_position, element.value);

        if (Product.deselect) {
          event.target.classList.add("active");
          elements.forEach((buttons) => {
            if (
              buttons.dataset.position == option_position &&
              buttons.value != element.value &&
              buttons.classList.contains("active")
            ) {
              buttons.classList.remove("active");
            }
          });
        }
      });

      if (Product.deselect) {
        element.addEventListener("click", function (event) {
          if (
            event.target.classList.contains("active") &&
            option_position === "2"
          ) {
            events.trigger("swatch:change:" + option_position, "No Selection");
            event.target.classList.remove("active");
          }
        });
      }

      events.on(
        "variantchange:option" + option_position + ":" + element.value,
        select
      );

      events.on("variantchange", set_availability);

      function select() {
        element.checked = true;
      }

      function set_availability(current_variant) {
        var available = false;

        Product.variants.forEach(function (variant) {
          if (!variant.available) {
            return;
          }

          if (variant[current_option] != element.value) {
            return;
          }

          if (variant[other_options[0]] != current_variant[other_options[0]]) {
            return;
          }

          if (variant[other_options[1]] != current_variant[other_options[1]]) {
            return;
          }

          available = true;
        });

        if (available) {
          states.available(element);
        } else {
          states.sold_out(element);
        }
      }
    }
  })();

  (function price() {
    let priceContainers = context.querySelectorAll(".price-container");
    priceContainers.forEach(function (priceContainer) {
      var element =
        priceContainer.querySelector(".product-price.current .money") ||
        priceContainer.querySelector(".product-price");

      events.on("variantchange", function (variant) {
        var price = money(variant.price);

        if (!variant.available) {
          price = config.sold_out;
        }
        element.innerHTML = price;
      });

      events.on("variantunavailable", function (variant) {
        element.innerHTML = config.unavailable;
        const productPrice = priceContainer.querySelector(
          ".product-price.current"
        );
        if (productPrice.classList.contains("sale")) {
          productPrice.classList.remove("sale");
        }
      });
    });
  })();

  (function compare_price() {
    let priceContainers = context.querySelectorAll(".price-container");
    priceContainers.forEach(function (priceContainer) {
      var element = priceContainer.querySelector(".was");

      events.on("variantchange", function (variant) {
        if (!element) {
          var priceElement = priceContainer.querySelector(
            ".product-price.current"
          );
          priceElement.insertAdjacentHTML(
            "beforebegin",
            '<span class="product-price was"></span>'
          );
          element = priceContainer.querySelector(".was");
        }
        var price = "";

        if (
          variant.compare_at_price > variant.price &&
          element !== "undefined"
        ) {
          var price = money(variant.compare_at_price);
          element.removeAttribute("style");
        } else {
          element.style.display = "none";
        }

        if (!variant.available && element !== "undefined") {
          price = "";
          element.style.display = "none";
        }
        element.innerHTML = '<span class="money">' + price + "</span>";
      });

      events.on("variantunavailable", function (variant) {
        if (!element) {
          var priceElement = priceContainer.querySelector(
            ".product-price.current"
          );
          priceElement.insertAdjacentHTML(
            "beforebegin",
            '<span class="product-price was"></span>'
          );
          element = priceContainer.querySelector(".was");
        }
        element.style.display = "none";
      });
    });
  })();

  (function save_price() {
    let priceContainers = context.querySelectorAll(".price-container");
    priceContainers.forEach(function (priceContainer) {
      var element = priceContainer.querySelector(".money_save");
      events.on("variantchange", function (variant) {
        if (!element) {
          var priceElement = priceContainer.querySelector(
            ".product-price.current"
          );
          priceElement.insertAdjacentHTML(
            "afterend",
            '<span class="money_save money_save_col"></span>'
          );
          element = priceContainer.querySelector(".money_save");
        }

        var price_save = "";
        function removeTrailingZeros(num) {
          return num % 1 === 0 ? num : parseFloat(num.toFixed(2));
        }

        if (variant.compare_at_price > variant.price) {
          var compare_price = (variant.compare_at_price / 100.0).toFixed(2),
            price = (variant.price / 100).toFixed(2);
          var price_save = ((compare_price - price) * 100.0) / compare_price; //money(variant.compare_at_price);
          element.removeAttribute("style");
        }

        if (!variant.available && element !== undefined) {
          price_save = "";
          element.style.display = "none";
        }
        element.innerHTML = `(${removeTrailingZeros(price_save)}% OFF)`;
      });
      events.on("variantunavailable", function (variant) {
        if (!element) {
          var priceElement = priceContainer.querySelector(
            ".product-price.current"
          );
          priceElement.insertAdjacentHTML(
            "afterend",
            '<span class="money_save money_save_col"></span>'
          );
          element = priceContainer.querySelector(".money_save");
        }
        element.style.display = "none";
      });
    });
  })();

  (function sku() {
    var element = context.querySelector(".variant_sku");

    if (!element) {
      return false;
    }

    events.on("variantchange", function (variant) {
      var variant_sku = variant.sku;
      element.innerHTML = variant_sku;
    });
    events.on("variantunavailable", function (variant) {
      var variant_sku = config.unavailable;
      element.innerHTML = variant_sku;
    });
  })();

  (function customBuyNowScript() {
    function executeBuyNowWithCartNote() {
      const buyNowBtns = document.querySelectorAll(".checkout-buy-now-btn");
      if (!buyNowBtns.length) return;

      buyNowBtns.forEach((buyNowBtn) => {
        buyNowBtn.addEventListener("click", async function (event) {
          try {
            event.preventDefault();
            const handle = this.dataset.handle;
            const variantId = this.dataset.variantId;
            const variantIdNumber = Number(variantId);

            const productMetaInfo = await fetch(
              `/products/${handle}?variant=${variantId}&view=meta_info`
            )
              .then((res) => res.json())
              .catch((e) => console.log("productMetaInfo", e.message));

            const note = [productMetaInfo?.product_title, productMetaInfo?.depth, productMetaInfo?.availability].filter(Boolean).join(' | ');

            Offered_product.push(variantIdNumber);
            Offered_product_qty.push(1);
 
            const success = OfferedProductCarted(
              Offered_product,
              Offered_product_qty,
              note
            );
            if (success) {
              window.location.href = "/checkout";
            }
          } catch (e) {
            console.error(e);
            alert(`Failed to Add Cart Notes`);
          }
        });
      });
    }

    executeBuyNowWithCartNote();
  })();

  (function add_to_cart() {
    var elements = document.querySelectorAll(".add");

    elements.forEach(function (element) {
      if (theme.settings.ajaxCartMethod == "drawer") {
        element.addEventListener("click", function (event) {
          event.preventDefault();
          const variantIdNumber = Number(BaseVariantId);

          if (Offered_product.length > 0) {
            Offered_product.push(variantIdNumber);
            Offered_product_qty.push(1);
          } else {
            Offered_product.push(variantIdNumber);
            Offered_product_qty.push(1);
          }

          OfferedProductCarted(Offered_product, Offered_product_qty);
          Offered_product.pop();
          Offered_product_qty.pop();
        });
      } else {
        element.addEventListener("click", function (event) {
          event.preventDefault();
          const variantIdNumber = Number(BaseVariantId);

          if (Offered_product.length > 0) {
            Offered_product.push(variantIdNumber);
            Offered_product_qty.push(1);
          } else {
            Offered_product.push(variantIdNumber);
            Offered_product_qty.push(1);
          }
          OfferedProductCarted(Offered_product, Offered_product_qty).then(
            (success) => {
              if (success) {
                window.location.href = "/cart";
              }
            }
          );
        });
      }

      events.on("variantchange", function (variant) {
        var text = config.button;
        var disabled = false;

        if (!variant.available) {
          text = config.sold_out;
          disabled = true;
        }

        element.value = text;
        element.disabled = disabled;
      });

      events.on("variantunavailable", function () {
        element.value = config.unavailable;
        element.disabled = true;
      });
    });
  })();

  (function buy_button() {
    var element = $(".checkout-buy-now-btn");
    if (!element) {
      return false;
    }

    events.on("variantchange", function (variant) {
      if (!variant.available) {
        element.attr("style", "display: none !important;");
      } else {
        element.attr("style", "display: block !important;");
      }
    });

    events.on("variantunavailable", function () {
      element.attr("style", "display: none !important;");
    });
  })();

  (function smart_payment_buttons() {
    var element = context.querySelector(".shopify-payment-button");

    if (!element) {
      return false;
    }

    events.on("", function (variant) {
      if (!variant.available) {
        element.style.display = "none";
      } else {
        element.style.display = "block";
      }
    });
  })();

  function money(cents) {
    if (config.currency_switcher_enabled) {
      var converted = Currency.convert(
        cents,
        defaultCurrency,
        Currency.currentCurrency
      );
      var format =
        Currency.moneyFormats[Currency.currentCurrency][Currency.format];
      return Currency.formatMoney(converted, format);
    } else {
      return Shopify.formatMoney(cents, config.money_format);
    }
  }

  (function back_in_stock() {
    var element = context.querySelector(".back_in_stock");
    if (!element) {
      return false;
    }
    events.on("variantchange", function (variant) {
      if (!variant.available) {
        element.style.display = "block";
        document.getElementById("hidden_variant").value = "SKU: " + variant.sku;
        document.getElementById("hidden_title").value =
          "Variant: " + variant.title;
      } else {
        element.style.display = "none";
      }
    });

    $(".back_in_stock").click(function () {
      event.stopPropagation();
      $(".back-in-stock-snippet").show();
    });
    $(".back-in-stock-snippet").click(function () {
      event.stopPropagation();
    });
    $(document).on("click", function () {
      $(".back-in-stock-snippet").hide();
    });
  })();
};

theme.StaticGallery = function (context, events, Product) {
  events.trigger = events.emit;
  var $context = $(context);

  var config = JSON.parse(context.dataset.galleryConfig || "{}");
  var mainCarousel = $(".product-image-container", context);
  var thumbnailCarousel = $(".thumbnail-slider", context);

  (function enlargePhoto() {
    // Create template for Facebook Button
    $.fancybox.defaults.btnTpl.fb =
      '<button data-fancybox-fb class="fancybox-button fancybox-button--fb" title="Facebook">' +
      '<svg viewBox="0 0 24 24">' +
      '<path d="M22.676 0H1.324C.594 0 0 .593 0 1.324v21.352C0 23.408.593 24 1.324 24h11.494v-9.294h-3.13v-3.62h3.13V8.41c0-3.1 1.894-4.785 4.66-4.785 1.324 0 2.463.097 2.795.14v3.24h-1.92c-1.5 0-1.793.722-1.793 1.772v2.31h3.584l-.465 3.63h-3.12V24h6.115c.733 0 1.325-.592 1.325-1.324V1.324C24 .594 23.408 0 22.676 0"/>' +
      "</svg>" +
      "</button>";

    // Create template for Twitter Button
    $.fancybox.defaults.btnTpl.tw =
      '<button data-fancybox-tw class="fancybox-button fancybox-button--tw" title="Twitter">' +
      '<svg viewBox="0 0 24 24">' +
      '<path d="M23.954 4.57c-.885.388-1.83.653-2.825.774 1.013-.61 1.793-1.574 2.162-2.723-.95.556-2.005.96-3.127 1.185-.896-.96-2.173-1.56-3.59-1.56-2.718 0-4.92 2.204-4.92 4.918 0 .39.044.765.126 1.124C7.69 8.094 4.067 6.13 1.64 3.16c-.427.723-.666 1.562-.666 2.476 0 1.71.87 3.213 2.188 4.096-.807-.026-1.566-.248-2.228-.616v.06c0 2.386 1.693 4.375 3.946 4.828-.413.11-.85.17-1.296.17-.314 0-.615-.03-.916-.085.63 1.952 2.445 3.376 4.604 3.416-1.68 1.32-3.81 2.105-6.102 2.105-.39 0-.78-.022-1.17-.066 2.19 1.394 4.768 2.21 7.557 2.21 9.054 0 14-7.497 14-13.987 0-.21 0-.42-.016-.63.962-.69 1.8-1.56 2.46-2.548l-.046-.02z"/>' +
      "</svg>" +
      "</button>";

    // Make buttons clickable using event delegation
    $("body").on("click", "[data-fancybox-fb]", function () {
      window.open(
        "https://www.facebook.com/sharer/sharer.php?u=" +
        encodeURIComponent(window.location.href) +
        "&t=" +
        encodeURIComponent(document.title),
        "",
        "left=0,top=0,width=600,height=300,menubar=no,toolbar=no,resizable=yes,scrollbars=yes"
      );
    });

    $("body").on("click", "[data-fancybox-tw]", function () {
      window.open(
        "http://twitter.com/share?url=" +
        encodeURIComponent(window.location.href) +
        "&text=" +
        encodeURIComponent(document.title),
        "",
        "left=0,top=0,width=600,height=300,menubar=no,toolbar=no,resizable=yes,scrollbars=yes"
      );
    });

    $('[data-fancybox="images"]').fancybox({
      loop: true,
      transitionDuration: 100,
      animationDuration: 500,
      animationEffect: "fade",
      buttons: ["close"],
      caption: function (instance, item) {
        // Get the alt text of the current image
        var altText = $(this).find("img").attr("alt");
        return altText || ""; // Return the alt text as caption
      },
    });
  })();

  (function zoom() {
    var elements = context.querySelectorAll(".product-main-image");

    Events.on("mediaquery:desktop", enableZoom);
    Events.on("mediaquery:tablet", disableZoom);
    Events.on("mediaquery:mobile", disableZoom);
    Events.on("editor:section:select", function () {
      if (desktop.matches) {
        enableZoom();
      }
    });

    function enableZoom() { }

    function disableZoom() {
      elements.forEach(function (element) {
        $(element).trigger("zoom.destroy");
      });
    }
  })();

  (function thumbnailSlider() {
    var $sliderParent = thumbnailCarousel.closest(".product-thumbnails");

    var arrows = config.sliderControls === "arrows";
    var dots = config.sliderControls === "dots";

    Events.on("mediaquery:desktop", enableThumbnailSlider);
    Events.on("mediaquery:tablet", enableThumbnailSlider);
    Events.on("mediaquery:mobile", enableThumbnailSlider);
    Events.on("editor:section:select", function () {
      if (desktop.matches && config.thumbnailLimit > 1) {
        disableThumbnailSlider();
      }
    });

    function enableThumbnailSlider() {
      if ($sliderParent.hasClass("thumbnail-gallery-horizontal")) {
        initThumbnailSlider(
          false,
          ".thumbnail-gallery-horizontal .thumbnail-slider",
          getResponsiveSettings(false)
        );
      }
      if ($sliderParent.hasClass("thumbnail-gallery-vertiacal")) {
        initThumbnailSlider(
          true,
          ".thumbnail-gallery-vertiacal .thumbnail-slider",
          getResponsiveSettings(true)
        );
      }
    }

    function initThumbnailSlider(vertical, selector, responsive) {
      var nextArrow = vertical
        ? '<a class="slick-next slick-arrow"><i class="la la-angle-down" aria-hidden="true"></i></a>'
        : '<a class="slick-next slick-arrow"></a>';
      var prevArrow = vertical
        ? '<a class="slick-prev slick-arrow"><i class="la la-angle-up" aria-hidden="true"></i></a>'
        : '<a class="slick-prev slick-arrow"></a>';

      var thumbnailCarousel = $(selector, context);

      $(thumbnailCarousel).not(".slick-initialized").slick({
        infinite: true,
        vertical: vertical,
        verticalSwiping: vertical,
        speed: 600,
        arrows: arrows,
        nextArrow: nextArrow,
        prevArrow: prevArrow,
        dots: dots,
        slidesToShow: 5,
        slidesToScroll: 1,
        rows: 1,
        swipeToSlide: true,
        useTransform: false,
        cssEase: "linear",
        rtl: false,
        touchThreshold: 99,
        mobileFirst: true,
        responsive: responsive,
      });

      if (
        $(thumbnailCarousel).slick("getSlick").slideCount >
        config.thumbnailLimitMobile
      ) {
        thumbnailCarousel.addClass("show__more");
      }
    }

    function getResponsiveSettings(vertical) {
      if (vertical) {
        return [
          {
            breakpoint: 540,
            settings: { slidesToShow: 6, arrows: false, slidesToScroll: 1 },
          },
          {
            breakpoint: 740,
            settings: { slidesToShow: 10, arrows: false, slidesToScroll: 1 },
          },
          {
            breakpoint: 980,
            settings: { slidesToShow: 10, arrows: false, slidesToScroll: 1 },
          },
          {
            breakpoint: 1200,
            settings: { slidesToShow: 12, arrows: false, slidesToScroll: 1 },
          },
        ];
      } else {
        return [
          {
            breakpoint: 540,
            settings: { slidesToShow: 6, arrows: false, slidesToScroll: 1 },
          },
          {
            breakpoint: 740,
            settings: { slidesToShow: 10, arrows: false, slidesToScroll: 1 },
          },
          {
            breakpoint: 980,
            settings: { slidesToShow: 8, arrows: false, slidesToScroll: 1 },
          },
          {
            breakpoint: 1200,
            settings: { slidesToShow: 10, arrows: false, slidesToScroll: 1 },
          },
        ];
      }
    }

    function disableThumbnailSlider() {
      if (thumbnailCarousel.hasClass("slick-initialized")) {
        $(thumbnailCarousel).slick("unslick");
      }
    }

    function select(id) {
      var thumSlide = $(
        "#thumbnail-gallery .slick-slide:not(.slick-cloned) [data-image-id=" +
        id +
        "]",
        context
      );
      if (!thumSlide.length) return;
      var index = thumSlide.closest(".slick-slide").data("slickIndex");
      $(thumbnailCarousel).slick("slickGoTo", index);
    }

    $(document).ready(function () {
      $(".product-main-images .slick-arrow").on("click", function () {
        var id = $(".slick-current .product-main-image").data("image-id");
        var thumSlide = $(
          "#thumbnail-gallery .slick-slide:not(.slick-cloned) [data-image-id=" +
          id +
          "]",
          context
        );
        if (!thumSlide.length) return;
        var index = thumSlide.closest(".slick-slide").data("slickIndex");
        $(thumbnailCarousel).slick("slickGoTo", index);
      });
    });

    $(".product-image-container").on(
      "swipe",
      function (event, slick, direction) {
        var id = $(".slick-current .product-main-image").data("image-id");
        var thumSlide = $(
          "#thumbnail-gallery .slick-slide:not(.slick-cloned) [data-image-id=" +
          id +
          "]",
          context
        );
        if (!thumSlide.length) return;
        var index = thumSlide.closest(".slick-slide").data("slickIndex");
        $(thumbnailCarousel).slick("slickGoTo", index);
      }
    );

    events.on("variantchange:image", select);
  })();

  (function thumbnails() {
    var $elements = $(".product-thumbnail", context);

    $(document).on("click", ".product-thumbnail", function (event) {
      event.preventDefault();
      const productGallery = document.querySelector(".product-photos");
      if (productGallery) {
        const galleryBottom = productGallery.getBoundingClientRect().bottom;
        const viewportHeight = window.innerHeight;

        if (galleryBottom > viewportHeight) {
          // Scroll the gallery into view
          productGallery.scrollIntoView({ block: "end", behavior: "smooth" });
        }
      }
      var id = this.dataset.imageId;
      select(id);

      events.trigger("thumbnail:click", id);
      var thumSlide = $(
        "#thumbnail-gallery .slick-slide:not(.slick-cloned) [data-image-id=" +
        id +
        "]",
        context
      );
      if (!thumSlide.length) return;
      var index = thumSlide.closest(".slick-slide").data("slickIndex");
      $("#thumbnail-gallery .thumbnail-slider").slick("slickGoTo", index);
    });

    events.on("variantchange:image", select);

    function select(id) {
      var image = $elements.filter("[data-image-id=" + id + "]");
      if (!image.length) {
        return false;
      }

      $elements.removeClass("selected").filter(image).addClass("selected");
      $(".product-main-image").removeClass("selected");
      $('.product-main-image[data-image-id="' + id + '"').addClass("selected");
    }
  })();

  (function mainImages() {
    var mainCarousel = $(".product-image-container", context);

    function enableCarousel() {
      $(mainCarousel).not(".slick-initialized").slick({
        fade: true,
        infinite: true,
        mobileFirst: true,
        slidesToShow: 1,
        slidesToScroll: 1,
        fade: true,
        arrows: true,
        nextArrow:
          '<a class="slick-next slick-arrow"><i class="la la-angle-right" aria-hidden="true"></i></a>',
        prevArrow:
          '<a class="slick-prev slick-arrow"><i class="la la-angle-left" aria-hidden="true"></i></a>',
        dots: false,
        rows: 1,
      });

      setTimeout(function () {
        var trackHeight = $(".product-main-image .product__image").height();
        $(mainCarousel).height(trackHeight);
        $(".product-main-images .slick-track").height(trackHeight);
        $(".product-main-images .slick-list").height(trackHeight);
      }, 500);

      var $elements = $(".product-main-images .slick-slide", context);

      events.on("thumbnail:click", select).on("variantchange:image", select);

      function select(id) {
        var slide = $elements.find("[data-image-id=" + id + "]");
        var slideOriginal = slide.filter(".product-main-image.selected");
        var index = slideOriginal.closest(".slick-slide").data("slickIndex");
        $(mainCarousel).slick("slickGoTo", index);
      }
    }
    enableCarousel();
  })();

  (function mobileSlider() {
    Events.on("mediaquery:desktop", function () {
      enableCarousel();
    });
    Events.on("mediaquery:tablet", function () {
      enableCarousel();
    });
    Events.on("mediaquery:mobile", function () {
      enableCarousel();
    });
    Events.on("editor:section:select", function () {
      if (mobile.matches) {
        disableCarousel();
      }
    });

    function enableCarousel() {
      $(mainCarousel).not(".slick-initialized").slick({
        fade: true,
        infinite: true,
        mobileFirst: true,
        slidesToShow: 1,
        slidesToScroll: 1,
        fade: false,
        arrows: true,
        nextArrow:
          '<a class="slick-next slick-arrow"><i class="la la-angle-right" aria-hidden="true"></i></a>',
        prevArrow:
          '<a class="slick-prev slick-arrow"><i class="la la-angle-left" aria-hidden="true"></i></a>',
        dots: false,
        rows: 1,
      });

      setTimeout(function () {
        var trackHeight = $(".product-main-image .product__image").height();
        $(mainCarousel).height(trackHeight);
        $(".product-main-images .slick-track").height(trackHeight);
        $(".product-main-images .slick-list").height(trackHeight);
      }, 500);

      var $elements = $(".product-main-images .slick-slide", context);

      events.on("thumbnail:click", select).on("variantchange:image", select);

      function select(id) {
        var slide = $elements.find("[data-image-id=" + id + "]");
        var slideOriginal = slide.filter(".product-main-image.selected");
        var index = slideOriginal.closest(".slick-slide").data("slickIndex");

        $(mainCarousel).slick("slickGoTo", index);
      }
    }

    function disableCarousel() {
      if (mainCarousel.hasClass("slick-initialized")) {
        $(mainCarousel).slick("unslick");
      }
    }
  })();
};

theme.ScrollGallery = function (context, events) {
  events.trigger = events.emit;
  var $context = $(context);

  var config = JSON.parse(context.dataset.galleryConfig || "{}");

  var mainCarousel = $(".product-image-container", context);

  (function mainImages() {
    Events.on("mediaquery:desktop", function () {
      enableScrollGallery();
      disableCarousel();
    });
    Events.on("mediaquery:mobile", enableCarousel);
    Events.on("mediaquery:tablet", enableCarousel);
    Events.on("editor:section:select", function () {
      if (desktop.matches) {
        enableScrollGallery();
        disableCarousel();
      } else {
        enableCarousel();
      }
    });

    function enableCarousel() {
      var arrows = false;
      var dots = false;

      if (config.sliderControls === "arrows") {
        var arrows = true;
      } else if (config.sliderControls === "dots") {
        var dots = true;
      }

      $(mainCarousel).not(".slick-initialized").slick({
        fade: true,
        infinite: true,
        mobileFirst: true,
        slidesToShow: 1,
        vertical: false,
        slidesToScroll: 1,
        fade: false,
        arrows: arrows,
        nextArrow:
          '<a class="slick-next slick-arrow"><i class="la la-angle-right" aria-hidden="true"></i></a>',
        prevArrow:
          '<a class="slick-prev slick-arrow"><i class="la la-angle-left" aria-hidden="true"></i></a>',
        dots: dots,
      });

      var $elements = $(".slick-slide", context);

      events.on("variantchange:image", select);

      function select(id) {
        var slides = $elements.find("[data-image-id]");
        var slide = slides.filter("[data-image-id=" + id + "]");
        var index = slides.index(slide);
        $(mainCarousel).slick("slickGoTo", index - 1);
      }
    }

    function disableCarousel() {
      if (mainCarousel.hasClass("slick-initialized")) {
        $(mainCarousel).slick("unslick");
      }
    }

    function enableScrollGallery() {
      var $elements = $(".product-main-image", context);

      events.on("variantchange:image", select);

      function select(id) {
        var image = $elements.filter("[data-image-id=" + id + "]");

        if (!image.length) {
          return false;
        }

        $elements.removeClass("selected").filter(image).addClass("selected");

        if (template === "index") {
          var selectedImage = context.querySelector(".selected");
          selectedImage.scrollIntoView();
        } else {
          var headerHeight = document.querySelector("header").offsetHeight;
          $("html, body").animate(
            {
              scrollTop: $(".selected").offset().top - headerHeight,
            },
            "slow"
          );
        }
      }
    }
  })();

  (function zoom() {
    var elements = context.querySelectorAll(".product-main-image");

    Events.on("mediaquery:desktop", enableZoom);
    Events.on("mediaquery:tablet", disableZoom);
    Events.on("mediaquery:mobile", disableZoom);
    Events.on("editor:section:select", function () {
      if (desktop.matches) {
        enableZoom();
      }
    });

    function enableZoom() {
      elements.forEach(function (element) {
        var src = element.querySelector("img"),
          src = src.getAttribute("data-zoom-src"),
          src = src.replace("{width}", "2000");

        $(element).zoom({ url: src });
      });
    }

    function disableZoom() {
      elements.forEach(function (element) {
        $(element).trigger("zoom.destroy");
      });
    }
  })();

  (function scrollForm() {
    $(window).on("load resize orientationchange", function () {
      if ($(window).width() > 980) {
        var HHeight = $("header").height();
        var OffSet = Number(HHeight) + Number(20);

        $("#sticky-item").stick_in_parent({
          parent: "#sticky-container",
          offset_top: OffSet,
        });
      }
    });
  })();

  (function enlargePhoto() {
    $.fancybox.defaults.btnTpl.fb =
      '<button data-fancybox-fb class="fancybox-button fancybox-button--fb" title="Facebook">' +
      '<svg viewBox="0 0 24 24">' +
      '<path d="M22.676 0H1.324C.594 0 0 .593 0 1.324v21.352C0 23.408.593 24 1.324 24h11.494v-9.294h-3.13v-3.62h3.13V8.41c0-3.1 1.894-4.785 4.66-4.785 1.324 0 2.463.097 2.795.14v3.24h-1.92c-1.5 0-1.793.722-1.793 1.772v2.31h3.584l-.465 3.63h-3.12V24h6.115c.733 0 1.325-.592 1.325-1.324V1.324C24 .594 23.408 0 22.676 0"/>' +
      "</svg>" +
      "</button>";
    $.fancybox.defaults.btnTpl.tw =
      '<button data-fancybox-tw class="fancybox-button fancybox-button--tw" title="Twitter">' +
      '<svg viewBox="0 0 24 24">' +
      '<path d="M23.954 4.57c-.885.388-1.83.653-2.825.774 1.013-.61 1.793-1.574 2.162-2.723-.95.556-2.005.96-3.127 1.185-.896-.96-2.173-1.56-3.59-1.56-2.718 0-4.92 2.204-4.92 4.918 0 .39.044.765.126 1.124C7.69 8.094 4.067 6.13 1.64 3.16c-.427.723-.666 1.562-.666 2.476 0 1.71.87 3.213 2.188 4.096-.807-.026-1.566-.248-2.228-.616v.06c0 2.386 1.693 4.375 3.946 4.828-.413.11-.85.17-1.296.17-.314 0-.615-.03-.916-.085.63 1.952 2.445 3.376 4.604 3.416-1.68 1.32-3.81 2.105-6.102 2.105-.39 0-.78-.022-1.17-.066 2.19 1.394 4.768 2.21 7.557 2.21 9.054 0 14-7.497 14-13.987 0-.21 0-.42-.016-.63.962-.69 1.8-1.56 2.46-2.548l-.046-.02z"/>' +
      "</svg>" +
      "</button>";

    $("body").on("click", "[data-fancybox-fb]", function () {
      window.open(
        "https://www.facebook.com/sharer/sharer.php?u=" +
        encodeURIComponent(window.location.href) +
        "&t=" +
        encodeURIComponent(document.title),
        "",
        "left=0,top=0,width=600,height=300,menubar=no,toolbar=no,resizable=yes,scrollbars=yes"
      );
    });

    $("body").on("click", "[data-fancybox-tw]", function () {
      window.open(
        "http://twitter.com/share?url=" +
        encodeURIComponent(window.location.href) +
        "&text=" +
        encodeURIComponent(document.title),
        "",
        "left=0,top=0,width=600,height=300,menubar=no,toolbar=no,resizable=yes,scrollbars=yes"
      );
    });

    $('[data-fancybox="images"]').fancybox({
      loop: true,
      transitionDuration: 100,
      animationDuration: 500,
      animationEffect: "fade",
      buttons: [
        "fb",
        "tw",
        "zoom",
        "fullScreen",
        "slideShow",
        "thumbs",
        "close",
      ],
    });
  })();
};

theme.Product = (function () {
  function Product(container) {
    var events = new EventEmitter3();
    events.trigger = events.emit; // alias

    var productJson = document.getElementById("product-json");

    if (!productJson) {
      return false;
    }

    var Product = productJson.innerHTML,
      Product = JSON.parse(Product || "{}");

    container
      .querySelectorAll("[data-product-form]")
      .forEach(function (context) {
        theme.ProductForm(context, events, Product);
      });

    container
      .querySelectorAll("[data-static-gallery]")
      .forEach(function (context) {
        theme.StaticGallery(context, events, Product);
      });

    container
      .querySelectorAll("[data-scroll-gallery]")
      .forEach(function (context) {
        theme.ScrollGallery(context, events);
      });
  }

  Product.prototype = _.assignIn({}, Product.prototype, {});

  return Product;
})();

if (theme.settings.showMultipleCurrencies) {
  Events.on("quickview:load", function (container) {
    Currency.convertAll(defaultCurrency, Currency.currentCurrency);
  });
}

/*============================================================================
Header
==============================================================================*/
theme.Header = (function () {
  function Header(container) {
    (function searchPopup() {
      $("a#search_trigger").click(function (event) {
        event.stopPropagation();
        $("#search_reveal").slideToggle("500");
        return false;
      });
      $("#search_reveal").on("click", function (event) {
        event.stopPropagation();
      });
      $(document).on("click", function () {
        if ($("body").hasClass("search")) {
          return;
        }
        $("#search_reveal").slideUp("500");
      });
    })();

    (function menuEdge() {
      /* Ensure that sub nav menus open to the left if any chance of offscreen overflow */
      $("ul.submenu li").on("mouseenter mouseleave", function (e) {
        if ($("ul", this).length) {
          var elm = $("ul:first", this);
          var off = elm.offset();
          var l = off.left;
          var w = elm.width();
          var docH = $("#PageContainer").height();
          var docW = $("#PageContainer").width();

          var isEntirelyVisible = l + w <= docW;

          if (!isEntirelyVisible) {
            $(this).addClass("edge");
          } else {
            $(this).removeClass("edge");
          }
        }
      });
    })();

    (function enableStickyHeader() {
      var Heightcalculate = $("header").height();
      var stickyHeader = document.querySelector("header").dataset.sticky;
      var scrollHeader = $("header");

      $(window).scroll(function () {
        var scroll = $(window).scrollTop();
        if (scroll >= 1 && stickyHeader == "true") {
          scrollHeader.removeClass("scrollheader").addClass("coverheader");
        } else {
          scrollHeader.removeClass("coverheader").addClass("scrollheader");
        }
      });
    })();

    $(".has_sub_menu").hover(function () {
      $(this).attr("aria-expanded", function (index, attr) {
        return attr == "false" ? true : "false";
      });
    });

    jQuery(window).trigger("resize").trigger("scroll");
  }
  Header.prototype = _.assignIn({}, Header.prototype, {});

  return Header;
})();

/*============================================================================
Featured collection section
==============================================================================*/
theme.FeaturedCollection = (function () {
  function Carousel(container) {
    var $container = (this.$container = $(container)),
      $slideWrapper = $(".collection-carousel", container),
      grid = $slideWrapper.data("grid"),
      lazyImages = $slideWrapper.find(".reveal"),
      lazyCounter = 0;

    var sliderControls = document.querySelector(".collection-carousel");

    if (!sliderControls) {
      return false;
    }

    var sliderControls = sliderControls.dataset.sliderControls;

    var arrows = false;
    var dots = false;

    if (sliderControls === "arrows") {
      var arrows = true;
    } else if (sliderControls === "dots") {
      var dots = true;
    }

    function initCarousel() {
      $slideWrapper.not(".slick-initialized").slick({
        infinite: true,
        autoplaySpeed: 4000,
        lazyLoad: "progressive",
        speed: 600,
        arrows: arrows,
        nextArrow:
          '<a class="slick-next slick-arrow"><i class="la la-angle-right" aria-hidden="true"></i></a>',
        prevArrow:
          '<a class="slick-prev slick-arrow"><i class="la la-angle-left" aria-hidden="true"></i></a>',
        dots: dots,
        slidesToShow: grid,
        slidesToScroll: 2,
        responsive: [
          {
            breakpoint: 740,
            settings: {
              slidesToShow: 2,
              slidesToScroll: 2,
            },
          },
        ],
      });
    }
    initCarousel();

    $(document).on("shopify:section:load", function (event) {
      initCarousel();
    });

    $(document).on("shopify:section:unload", function (event) {
      var target = $(event.target);
      target.find(".collection-carousel").slick("destroy");
      $(document).off(".collection-carousel");
    });
  }
  return Carousel;
})();

/*============================================================================
Flexslider
==============================================================================*/
theme.Slideshow = (function () {
  function Slideshow(container) {
    var $container = (this.$container = $(container));
    var sectionId = $container.attr("data-section-id");
    var speed = $(".flexslider").data("speed");

    $(".flexslider").flexslider({
      animation: "fade",
      slideshowSpeed: speed,
      animationSpeed: 600,
      directionNav: true,
      controlNav: true,
      pauseOnHover: true,
      pauseOnAction: true,
      prevText: "",
      nextText: "",
    });
  }
  return Slideshow;
})();

theme.Slideshow.prototype = _.assignIn({}, theme.Slideshow.prototype, {
  onBlockSelect: function (event) {
    // Ignore the cloned version
    var Slider = $(event.target).closest(".flexslider").data("flexslider");
    var $slide = $(event.target);
    var slideIndex = $slide.data("flexslider-index");
    // Go to selected slide, pause autoplay

    Slider.flexslider(slideIndex);
    Slider.flexslider("pause");
  },
  onBlockDeselect: function () {
    var Slider = $(event.target).closest(".flexslider").data("flexslider");
    // Resume autoplay
    Slider.flexslider("play");
  },
});

/*============================================================================
New Slideshow Section
==============================================================================*/
theme.newSlideshow = (function () {
  function Slideshow(container) {
    var slideWrapper = $(".main-slider"),
      iframes = slideWrapper.find(".embed-player"),
      lazyImages = slideWrapper.find(".slide-image"),
      lazyCounter = 0;

    var videoAudio = document.querySelector(".main-slider").dataset.videoAudio;
    var sliderControls =
      document.querySelector(".main-slider").dataset.sliderControls;

    // POST commands to YouTube or Vimeo API
    function postMessageToPlayer(player, command) {
      if (player == null || command == null) return;
      player.contentWindow.postMessage(JSON.stringify(command), "*");
    }

    // When the slide is changing
    function playPauseVideo(slick, control) {
      var currentSlide, slideType, startTime, player, video;

      currentSlide = slick.find(".slick-current");
      slideType = document.querySelector(".slick-current .item").dataset
        .slideType;
      player = currentSlide.find("iframe").get(0);
      startTime = currentSlide.data("video-start");

      if (videoAudio === "off") {
        var audio = "mute";
      }

      if (slideType === "vimeo") {
        switch (control) {
          case "play":
            if (
              startTime != null &&
              startTime > 0 &&
              !currentSlide.hasClass("started")
            ) {
              currentSlide.addClass("started");
              postMessageToPlayer(player, {
                method: "setCurrentTime",
                value: startTime,
              });
            }
            postMessageToPlayer(player, {
              method: "play",
              value: 1,
            });
            break;
          case "pause":
            postMessageToPlayer(player, {
              method: "pause",
              value: 1,
            });
            break;
        }
      } else if (slideType === "youtube") {
        switch (control) {
          case "play":
            postMessageToPlayer(player, {
              event: "command",
              func: audio,
            });
            postMessageToPlayer(player, {
              event: "command",
              func: "playVideo",
            });
            break;
          case "pause":
            postMessageToPlayer(player, {
              event: "command",
              func: "pauseVideo",
            });
            break;
        }
      } else if (slideType === "video") {
        currentItem = document.querySelector(".slick-current .item");
        video = currentItem.querySelector("video");

        if (video != null) {
          if (control === "play") {
            video.play();
          } else {
            video.pause();
          }
        }
      }
    }

    // Resize player
    function resizePlayer(iframes, ratio) {
      if (!iframes[0]) return;
      var win = $(".main-slider"),
        width = win.width(),
        playerWidth,
        height = win.height(),
        playerHeight,
        ratio = ratio || 16 / 9;

      iframes.each(function () {
        var current = $(this);
        if (width / ratio < height) {
          playerWidth = Math.ceil(height * ratio);
          current
            .width(playerWidth)
            .height(height)
            .css({
              left: (width - playerWidth) / 2,
              top: 0,
            });
        } else {
          playerHeight = Math.ceil(width / ratio);
          current
            .width(width)
            .height(playerHeight)
            .css({
              left: 0,
              top: (height - playerHeight) / 2,
            });
        }
      });
    }

    // DOM Ready
    $(function () {
      // Initialize
      slideWrapper.on("init", function (slick) {
        slick = $(slick.currentTarget);
        setTimeout(function () {
          playPauseVideo(slick, "play");
        }, 1000);
        resizePlayer(iframes, 16 / 9);
      });
      slideWrapper.on("beforeChange", function (event, slick) {
        slick = $(slick.$slider);
        playPauseVideo(slick, "pause");
      });
      slideWrapper.on("afterChange", function (event, slick) {
        slick = $(slick.$slider);
        playPauseVideo(slick, "play");
      });
      slideWrapper.on(
        "lazyLoaded",
        function (event, slick, image, imageSource) {
          lazyCounter++;
          if (lazyCounter === lazyImages.length) {
            lazyImages.addClass("show");
          }
        }
      );

      var arrows = false;
      var dots = false;

      if (sliderControls === "arrows") {
        var arrows = true;
      } else if (sliderControls === "dots") {
        var dots = true;
      }

      //start the slider
      slideWrapper.slick({
        // fade:true,
        autoplaySpeed: 4000,
        lazyLoad: "progressive",
        speed: 600,
        arrows: arrows,
        nextArrow:
          '<a class="slick-next slick-arrow"><i class="la la-angle-right" aria-hidden="true"></i></a>',
        prevArrow:
          '<a class="slick-prev slick-arrow"><i class="la la-angle-left" aria-hidden="true"></i></a>',
        dots: dots,
        cssEase: "cubic-bezier(0.87, 0.03, 0.41, 0.9)",
      });
    });

    // Resize event
    $(window).on("resize.slickVideoPlayer", function () {
      resizePlayer(iframes, 16 / 9);
    });
  }
  return Slideshow;
})();

theme.newSlideshow.prototype = _.assignIn({}, theme.newSlideshow.prototype, {
  onBlockSelect: function (event) {
    // Ignore the cloned version
    var Slider = $(event.target).closest(".main-slider");
    var $slide = $(event.target);
    var slideIndex = $slide.data("slider-index");

    // // Go to selected slide, pause autoplay
    Slider.slick("slickGoTo", slideIndex);
    Slider.slick("slickPause");
  },
  onBlockDeselect: function () {
    var Slider = $(event.target).closest(".main-slider");
    Slider.slick("slickPlay");
  },
});

/*============================================================================
Map Section
==============================================================================*/
theme.Maps = (function () {
  var errors = {
    address_no_results: "",
    address_query_limit: "",
    address_error: "",
    auth_error: "",
  };

  var google_api_loaded = false;

  function Map(container) {
    var events = new EventEmitter3();
    events.trigger = events.emit; // alias

    window.gm_authFailure = function () {
      google_api_loaded = false;

      if (Shopify.designMode) {
        events.trigger("gmauthfailure:themeeditor");
      } else {
        events.trigger("gmauthfailure");
      }
    };

    var config = container.querySelector("[data-map-config]").innerHTML,
      config = JSON.parse(config);

    if (!config.api_key) {
      return false;
    }

    (function section_container() {
      var element = container;

      events.on("gmauthfailure:themeeditor", error);
      events.on("map:error", error);

      function error() {
        element.classList.add("map-section-load-error");
      }
    })();

    (function background_image() {
      var element = container.querySelector("[data-bg-image]");

      events.on("gmauthfailure", show);

      function show() {
        element.classList.add("show-image");
      }
    })();

    (function overlay() {
      var element = container.querySelector("[data-map-overlay]");

      events.on("gmauthfailure:themeeditor", error);
      events.on("map:error", error);

      function error(message) {
        message = message || errors.auth_error;
        element.innerHTML =
          '<div class="map-section-error errors text-center">' +
          message +
          "</div>";
      }
    })();

    (function map() {
      var element = container.querySelector("[data-map]");

      events.on("ready", geolocate);

      function geolocate() {
        var geocoder = new google.maps.Geocoder();

        geocoder.geocode(
          { address: config.address },
          function (results, status) {
            if (status == google.maps.GeocoderStatus.OK) {
              render(results);
            } else {
              error(status);
            }
          }
        );
      }

      function render(results) {
        element.innerHTML = "";

        var map = new google.maps.Map(element, {
          zoom: config.zoom,
          center: results[0].geometry.location,
          draggable: false,
          clickableIcons: false,
          scrollwheel: false,
          disableDoubleClickZoom: true,
          styles: config.styles,
          disableDefaultUI: true,
        });

        var center = map.getCenter();

        new google.maps.Marker({
          map: map,
          position: center,
        });

        google.maps.event.addDomListener(
          window,
          "resize",
          $.debounce(250, function () {
            google.maps.event.trigger(map, "resize");
            map.setCenter(center);
          })
        );

        $(document).on("shopify:section:unload", function () {
          google.maps.event.clearListeners(map, "resize");
        });
      }

      function error(status) {
        var message = errors.address_error;
        switch (status) {
          case "ZERO_RESULTS":
            message = errors.address_no_results;
            break;
          case "OVER_QUERY_LIMIT":
            message = errors.address_query_limit;
            break;
          case "REQUEST_DENIED":
            message = errors.auth_error;
            break;
        }

        if (Shopify.designMode) {
          events.trigger("map:error", message);
        }
      }
    })();

    if (google_api_loaded) {
      events.trigger("ready");
    } else {
      $.getScript(
        "https://maps.googleapis.com/maps/api/js?key=" + config.api_key,
        function () {
          google_api_loaded = true;
          events.trigger("ready");
        }
      );
    }
  }

  Map.prototype = _.assignIn({}, Map.prototype, {});

  return Map;
})();

/*============================================================================
Instagram feed
==============================================================================*/
theme.Instagram = (function () {
  function Instagram(container) {
    var $container = (this.$container = $(container));
    var id = $container.attr("data-section-id");
    var instafeedEl = (this.instagram = $("#instafeed-" + id));
    var instafeedId = (this.instagram = "instafeed-" + id);
    var template = $("#instagram-template").html();
    var limit = instafeedEl.attr("data-item-limit");

    var userFeed = new Instafeed({
      get: "user",
      limit: limit,
      userId: "self",
      target: instafeedId,
      accessToken: instafeedEl.attr("data-access-token"),
      resolution: "standard_resolution",
      template: template,
    });

    if (!_.isUndefined(userFeed.options.accessToken)) {
      userFeed.run();
    }
  }

  Instagram.prototype = _.assignIn({}, Instagram.prototype, {
    onSelect: function () {
      Instagram();
    },
  });

  return Instagram;
})();

/*============================================================================
Parallax on index
==============================================================================*/
theme.Parallax = (function () {
  function Parallax(container) {
    var $container = (this.$container = $(container));
    var id = $container.attr("data-section-id");

    // Parallax scrolling backgrounds edit to work with new theme editor, building bgset url based on data-bgset.
    var initParallaximage = function (ParallaxImages) {
      ParallaxImages.each(function () {
        var bgset = this.getAttribute("data-bgset").trim().split(",");

        var bgset_srcs = bgset.map(function (src) {
          return src.trim().split(" ")[0];
        });

        var bgset_widths = bgset.map(function (src) {
          return src.trim().split(" ")[1].replace("w", "") + "px";
        });

        var src = null;

        bgset_widths.forEach(function (width, index) {
          if (!src && matchMedia("(max-width: " + width + ")").matches) {
            src = bgset_srcs[index];
          }
        });

        if (!src) {
          src = bgset_srcs[bgset_srcs.length - 1];
        }

        $(this).parallax({ imageSrc: src });
      });
    };

    // Intitate parallax, the reinitiate on resize of browser to update bgset url
    var parallax_images = $(".parallax-window");

    initParallaximage(parallax_images);

    window.addEventListener(
      "resize",
      debounce(function () {
        parallax_images.parallax("destroy");
        initParallaximage(parallax_images);
      }, 1000)
    );

    $(document).on("shopify:section:unload", function (event) {
      var target = $(event.target);
      target.find(".parallax-window").parallax("destroy");
      $(document).off(".parallax-window");
    });

    $(document).on("shopify:section:load", function (event) {
      initParallaximage($(event.target).find(".parallax-window"));
    });
  }
  Parallax.prototype = _.assignIn({}, Parallax.prototype, {});

  return Parallax;
})();

/*============================================================================
Info slider
==============================================================================*/
theme.InfoSlider = (function () {
  function InfoSlider(container) {
    var speed = $(".info-bar-content").data("speed"),
      arrows = $(".info-bar-content").data("arrows"),
      autoplay = $(".info-bar-content").data("autoplay"),
      slidesshown = $(".info-bar-content").data("shown");

    var $textSlide = $(".info-bar-content");
    var initInfoSlider = function (Slideshow) {
      $textSlide.not(".slick-initialized").slick({
        mobileFirst: true,
        slidesToShow: 1,
        vertical: false,
        slidesToScroll: 1,
        autoplay: autoplay,
        autoplaySpeed: speed,
        arrows: arrows,
        fade: false,
        nextArrow:
          '<a class="slick-next slick-arrow"><i class="la la-angle-right" aria-hidden="true"></i></a>',
        prevArrow:
          '<a class="slick-prev slick-arrow"><i class="la la-angle-left" aria-hidden="true"></i></a>',
        dots: false,
        responsive: [
          {
            breakpoint: 740,
            settings: {
              slidesToShow: slidesshown,
              slidesToScroll: 1,
            },
          },
        ],
      });
    };

    initInfoSlider($(".info-bar-content"));

    var trackHeight = $(".info-bar-content .slick-track").height();
    $(".info-bar-content .slick-slide").css("height", trackHeight + "px");

    $(document).on("shopify:section:unload", function (event) {
      if ($textSlide.hasClass("slick-initialized")) {
        $textSlide.slick("unslick");
        $(document).off(".info-bar-content");
      }
    });

    $(document).on("shopify:section:load", function (event) {
      initInfoSlider($(".info-bar-content"));
    });
  }
  InfoSlider.prototype = _.assignIn({}, InfoSlider.prototype, {});

  return InfoSlider;
})();

/*============================================================================
Accordion toggle on mobile navigation
==============================================================================*/
theme.mobileNav = (function () {
  function mobileNav(container) {
    $.shifter({
      maxWidth: Infinity,
    });

    $("#accordion")
      .find(".accordion-toggle")
      .click(function () {
        //Expand or collapse this panel
        $(this).next().addClass("boom");

        $(this).addClass("open");

        $(this).attr("aria-expanded", function (index, attr) {
          return attr == "false" ? true : "false";
        });

        //Hide the other panels
        $(".accordion-content").not($(this).next()).slideUp("fast");
      });

    $("#accordion")
      .find(".menu__child--back")
      .click(function () {
        $(this).closest(".menu__child--leayer").removeClass("boom");
        $(this).closest(".menu__child--leayer").prev().removeClass("open");
        $(this)
          .closest(".menu__child--leayer")
          .prev()
          .attr("aria-expanded", function (index, attr) {
            return attr == "false" ? true : "false";
          });
      });

    $("#accordion")
      .find(".accordion-toggle2")
      .click(function () {
        //Expand or collapse this panel
        $(this).toggleClass("open");
        $(this).next().slideToggle("fast");
        $(this).attr("aria-expanded", function (index, attr) {
          return attr == "false" ? true : "false";
        });
        //Hide the other panels
        $(".accordion-content2").not($(this).next()).slideUp("fast");
      });
  }

  return mobileNav;
})();

theme.mobileNav.prototype = _.assignIn({}, theme.mobileNav.prototype, {
  onSelect: function (event) {
    if (event.detail.load === false) {
      $.shifter("open");
    }
  },
  onDeselect: function (event) {
    $.shifter("close");
  },
});

/*============================================================================
Collection
==============================================================================*/
theme.Collection = (function () {
  function Collection(container) {
    (function collectionFilters() {
      var filters = container.querySelectorAll(".filter");

      if (!filters) {
        return false;
      }

      filters.forEach(function (filter) {
        var button = filter.querySelector(".filter-menu");
        var list = filter.querySelector("ul.filter-list");

        button.addEventListener("click", function () {
          if (list.style.display === "block") {
            list.style.display = "none";
          } else {
            list.style.display = "block";
          }
        });

        $(document).on("click", function (event) {
          event.stopPropagation();
          if (!$(event.target).closest(".filter").length) {
            $(list).hide(400);
          }
        });

        var listItems = filter.querySelectorAll("ul.filter-list li");
        if (listItems.length > 20) {
          list.classList.add("lg");
        }

        var listCurrentItems = filter.querySelectorAll(
          "#full-width-filter ul.filter-list li.current a"
        );
        var currentFilters = container.querySelector("#current-filters");
        if (listCurrentItems.length) {
          currentFilters.style.display = "block";
          $(listCurrentItems).clone().appendTo(currentFilters).show(300);
        }
      });

      var listCurrentItems = container.querySelectorAll(
        "#full-width-filter ul.filter-list li.current a"
      );
      var currentFilters = container.querySelector("#current-filters");
      if (listCurrentItems.length < 1) {
        $(currentFilters).hide(250);
      }
    })();

    (function mobileCollectionFilters() {
      var filters = container.querySelector("#full-width-filter");

      if (!filters) {
        return false;
      }

      //  var refine = container.querySelector('.show-filter').addEventListener("click", showFilters);
      function showFilters() {
        if (filters.style.display === "block") {
          filters.style.display = "none";
        } else {
          filters.style.display = "block";
        }
      }
    })();

    (function infiniteScroll() {
      function updateNextURL(doc) {
        nextURL = $(doc).find(".paginate_next").attr("href");
      }
      // get initial nextURL
      updateNextURL(document);
      var $container = $(".is_infinite").infiniteScroll({
        path: function () {
          return nextURL;
        },
        // options
        checkLastPage: ".paginate_next",
        append: ".is_infinite .product-index",
        hideNav: "#pagination",
        history: false,
        status: ".page-load-status",
      });

      // update nextURL on page load
      $container.on("load.infiniteScroll", function (event, response) {
        updateNextURL(response);
      });
    })();
  }
  Collection.prototype = _.assignIn({}, Collection.prototype, {});

  return Collection;
})();

/*============================================================================
Featured Content
==============================================================================*/
theme.FeatContent = (function () {
  function Feature(container) {
    var events = new EventEmitter3();
    events.trigger = events.emit; // alias

    container
      .querySelectorAll(".featured-collection")
      .forEach(function (context) {
        theme.FeaturedCollection(context, events);
      });
    container.querySelectorAll(".instagram-feed").forEach(function (context) {
      theme.Instagram(context, events);
    });
  }
  Feature.prototype = _.assignIn({}, Feature.prototype, {});

  return Feature;
})();

/*============================================================================
Debounce for window resizing
- Added to prevent multiple calls, when using an event for resizing
==============================================================================*/

function debounce(fn, wait, immediate) {
  var timeout;

  wait || (wait = 100);

  return function () {
    var context = this,
      args = arguments;

    var later = function () {
      timeout = null;

      if (!immediate) {
        fn.apply(context, args);
      }
    };

    var callNow = immediate && !timeout;

    clearTimeout(timeout);

    timeout = setTimeout(later, wait);

    if (callNow) {
      fn.apply(context, args);
    }
  };
}

//Read more
$(document).ready(function () {
  $(".read_more_btn a").on("click", function (e) {
    var btn = $(this).parent();
    var product_excerpt = $(".product_excerpt_less_part");
    btn.toggleClass("expanded");
    if (btn.hasClass("expanded")) {
      $(this).text("Read Less");
    } else {
      $(this).text("Read More");
    }
    product_excerpt.toggleClass("close");
    $("#read_more").toggleClass("close");
    return false;
  });
});

// Accordian
$(document).ready(function () {
  $(".accordian_item > .accordia_header h5").on("click", function () {
    var body = $(this).closest(".accordia_header").siblings(".accordian_body");
    if ($(this).hasClass("open")) {
      body.removeClass("opens").slideUp("fast");
      $(this).removeClass("open");
    } else {
      body.addClass("opens").slideDown("fast");
      $(this).addClass("open");
    }
  });

  function makeResponcive() {
    if (innerWidth < 741) {
      $(".accordian_item .accordia_header h5").removeClass("open");
      $(".accordian_item .accordian_body")
        .removeClass("opens")
        .removeAttr("style");
    } else {
      $(".accordian_item:nth-child(2) .accordia_header h5").addClass("open");
      $(".accordian_item:nth-child(2) .accordian_body")
        .addClass("opens")
        .css("display", "block");
    }
  }
  //makeResponcive();
  var width = $(window).width();
  $(window).on("resize", function (e) {
    if ($(window).width() === width) return;
    width = $(window).width();
    //makeResponcive();
  });
});

//faq
$(document).ready(function () {
  $(".faq .question").on("click", function (e) {
    if (!$(e.target).is("share-url")) {
      let id = $(this).attr("id");
      if (history.pushState) {
        history.pushState(null, null, `#${id}`);
      } else {
        location.hash = `#${id}`;
      }
      var body = $(this).siblings(".answer");
      if ($(this).hasClass("open")) {
        body.removeClass("opens").slideUp("fast");
        $(this).removeClass("open");
      } else {
        body.addClass("opens").slideDown("fast");
        $(this).addClass("open");
      }
    }
  });

  const url = new URL(window.location);
  const id = url.hash;
  if (id) {
    const expandable = document.querySelector(id);
    if (expandable) {
      // expandable.click();
      let body = $(expandable).siblings(".answer");
      body.addClass("opens").slideDown("fast");
      $(expandable).addClass("open");
      expandable.scrollIntoView({
        behavior: "smooth",
        block: "start",
        inline: "nearest",
      });
    }
  }

  $(".faq-dropdown-btn").on("click", function () {
    let body = $(this).siblings(".faq-dropdown-content");
    if ($(this).hasClass("open")) {
      body.removeClass("opens").slideUp("fast");
      $(this).removeClass("open");
      //$('body').removeClass('overflow-hidden');
    } else {
      body.addClass("opens").slideDown("fast");
      $(this).addClass("open");
      //$('body').addClass('overflow-hidden');
    }
  });

  $(".faq-dropdown-link").on("click", function () {
    let button = $(this).closest(".faq-dropdown").children(".faq-dropdown-btn");
    let body = $(this)
      .closest(".faq-dropdown")
      .children(".faq-dropdown-content");
    if ($(button).hasClass("open")) {
      body.removeClass("opens").slideUp("fast");
      $(button).removeClass("open");
      //$('body').removeClass('overflow-hidden');
    } else {
      body.addClass("opens").slideDown("fast");
      $(button).addClass("open");
      //$('body').addClass('overflow-hidden');
    }
  });

  $(document).on("click", function (e) {
    var container = $(".faq-dropdown");
    // if the target of the click isn't the container nor a descendant of the container
    if (!container.is(e.target) && container.has(e.target).length === 0) {
      $(".faq-dropdown-content").slideUp("fast");
      //$('body').removeClass('overflow-hidden');
    }
  });

  let headerHeight = document.querySelector("header").offsetHeight;
  document.documentElement.style.setProperty(
    "--header-size",
    `${headerHeight}px`
  );
  const handleResize = () => {
    headerHeight = document.querySelector("header").offsetHeight;
    document.documentElement.style.setProperty(
      "--header-size",
      `${headerHeight}px`
    );
  };

  window.addEventListener("resize", handleResize);

  let smallHeight = window.innerHeight;
  document.querySelectorAll(".faq-main").forEach((el) => {
    if (el.offsetHeight < smallHeight) smallHeight = el.offsetHeight;
  });

  const calculateRootMargin = () => {
    const viewportHeight = window.innerHeight;
    const margin = Math.floor(viewportHeight - (headerHeight + smallHeight));
    //return `-${margin}px 0px`;
    return `-${headerHeight + 20}px 0px ${margin}px 0px`;
  };
  let activeSection = null;
  const intersectingElements = [];

  const handleIntersect = (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        intersectingElements.push(entry.target);
        onIntersectingElementChange(intersectingElements[0]); // Call function with the first intersecting element
      } else {
        const index = intersectingElements.indexOf(entry.target);
        if (index > -1) {
          intersectingElements.splice(index, 1);
          if (intersectingElements.length > 0) {
            onIntersectingElementChange(intersectingElements[0]); // Call function with the new first intersecting element
          }
        }
      }
    });
  };

  // Create an Intersection Observer
  const observer = new IntersectionObserver(handleIntersect, {
    threshold: 0,
    rootMargin: calculateRootMargin(),
  });

  // Example function to be triggered when intersectingElements array changes
  const onIntersectingElementChange = (element) => {
    if (activeSection) {
      if (element && !element.isSameNode(activeSection)) {
        document
          .querySelector(
            `.faq-sidebar-linklist [href="#${activeSection.querySelector(".faq-section-title").id
            }"`
          )
          .classList.remove("current");
        document
          .querySelector(
            `.faq-sidebar-linklist [href="#${element.querySelector(".faq-section-title").id
            }"`
          )
          .classList.add("current");
        activeSection = element;
      }
    } else {
      if (element) {
        document
          .querySelector(
            `.faq-sidebar-linklist [href="#${element.querySelector(".faq-section-title").id
            }"`
          )
          .classList.add("current");
        activeSection = element;
      }
    }
  };

  const sections = document.querySelectorAll(".faq-main");

  sections.forEach((section) => {
    observer.observe(section);
  });
});

class shareUrl extends HTMLElement {
  constructor() {
    // Always call super first in constructor
    super();
  }
  connectedCallback() {
    this.addEventListener("click", async () => {
      const value = this.dataset.url;
      await navigator.clipboard.writeText(value);
      this.querySelector(".copied-tooltip").classList.add("show");
    });

    this.addEventListener("mouseout", () => {
      this.querySelector(".copied-tooltip").classList.remove("show");
    });
  }
}

customElements.define("share-url", shareUrl);

// product-sizing-chart
document.addEventListener("DOMContentLoaded", function () {
  $(".sizing_chart_slider").slick({
    centerMode: true,
    autoplay: false,
    autoplaySpeed: 3000,
    centerPadding: "60px",
    slidesToShow: 3,
    infinite: true,
    nextArrow: '<i class="la la-angle-right" aria-hidden="true"></i>',
    prevArrow: '<i class="la la-angle-left" aria-hidden="true"></i>',
    responsive: [
      {
        breakpoint: 576,
        settings: {
          centerMode: true,
          centerPadding: "20px",
          slidesToShow: 1,
        },
      },
    ],
  });
});

// Variants
$(document).ready(function () {
  var prevColorClass = null;
  var colors = $(".swatch-element.color");
  var swatchElements = $(".swatch-element");
  $.each(swatchElements, function () {
    $.each($(this).find("input"), function () {
      if ($(this).prop("checked") == true) {
        let $color = $(this).val();
        let allActiveInputs = document.querySelectorAll(
          `input[type="radio"][value="${$color}"]`
        );
        if (allActiveInputs.length > 1) {
          allActiveInputs.forEach((input) => {
            if (input.value === $color) {
              input.nextElementSibling.classList.add("selected-color");
            }
          });
        }
      }
    });
  });

  $.each(colors, function () {
    var $prevClass = null;
    $(this)
      .find("label")
      .on("click", function () {
        var $color = $(this).siblings("input").val();

        let allColorInputs = document.querySelectorAll(
          `.swatch-element input[name="color"]`
        );
        if (allColorInputs.length) {
          allColorInputs.forEach((input) => {
            let title = input.closest(".swatch-color-groups-with-title");
            if (
              title &&
              title
                .querySelector(".fabric-option-divider")
                .classList.contains("selected")
            )
              title
                .querySelector(".fabric-option-divider")
                .classList.remove("selected");
            if (
              title &&
              title
                .querySelector(".fabric-option-info")
                .classList.contains("selected")
            )
              title
                .querySelector(".fabric-option-info")
                .classList.remove("selected");
            if (input.nextElementSibling.classList.contains("selected-color"))
              input.nextElementSibling.classList.remove("selected-color");
          });
        }

        let allActiveInputs = document.querySelectorAll(
          `input[type="radio"][value="${$color}"]`
        );
        if (allActiveInputs.length > 0) {
          allActiveInputs.forEach((input) => {
            if (input.value === $color) {
              let title = input.closest(".swatch-color-groups-with-title");
              title
                .querySelector(".fabric-option-divider")
                .classList.add("selected");
              title
                .querySelector(".fabric-option-info")
                .classList.add("selected");
              input.nextElementSibling.classList.add("selected-color");
            }
          });
        }

        $("span.selected_color").text($color);
        $(".fabric__info-icon").attr(
          "title",
          "More information about " + $color
        );
      });
  });

  var $sizes = $(".size .swatch-element");
  var v = "Small";
  $.each($sizes, function () {
    $(this)
      .find("label")
      .on("click", function () {
        var $size = $(this).siblings("input").val();
        var clean_size = parseInt($size.match(/\d/g).join(""));
        switch (clean_size) {
          case 1824:
            v = "Small";
            break;
          case 2432:
            v = "Medium";
            break;
          case 3040:
            v = "Large";
            break;
          case 3648:
            v = "Extra-Large";
            break;
          default:
            v = $size;
        }
        $("span.selected_size").text(v);
      });
  });
  $(window).on("load", function () {
    $.each($sizes, function () {
      var selected = $(this).find("input");
      var clean_size = parseInt(selected.val().match(/\d/g).join(""));
      switch (clean_size) {
        case 1824:
          v = "Small";
          break;
        case 2432:
          v = "Medium";
          break;
        case 3040:
          v = "Large";
          break;
        case 3648:
          v = "Extra-Large";
          break;
        default:
          v = $size;
      }
      if (selected.prop("checked") == true) {
        $("span.selected_size").text(v);
      }
    });
  });
});

// advanced-content
$(window).on("scroll resize", function () {
  if ($(window).width() > 980) {
    var ac = $(".advance_content_section");
    $.each(ac, function () {
      var target = $(this).closest(".advance_content_section");
      var offset = $(this).position().top;
      var sectionHeight = $(this).height();
      var scrolled = $(window).scrollTop() + sectionHeight;
      if (scrolled > offset) {
        target.addClass("focused");
        if (scrolled > offset + sectionHeight) {
          target.removeClass("focused");
        }
      } else {
        target.removeClass("focused");
      }
    });
  }
});

// advanced-content
document.addEventListener("DOMContentLoaded", function () {
  var body = $("body");
  var wnd = $(window);
  if (body.hasClass("product")) {
    var container = $(".pdpqd_content_wrapper");
    var content = $(".pdpqd_content");
    var width_blank_space = wnd.width() - container.width();
    var height_blank_space = wnd.height() - container.height();
    var width = content.width();
    if (container.length != 0) {
      wnd.on("load scroll resize", function () {
        var scroll_point = $(this).scrollTop();
        var containerOffset = container.position().top;
        var cont_blank_space = (container.height() - content.height()) / 2;
        var top = height_blank_space / 2 + cont_blank_space;
        var right = width_blank_space / 2;
        var once_scrolled = containerOffset + cont_blank_space - top;
        if (scroll_point > once_scrolled) {
          var clip =
            content.height() +
            cont_blank_space -
            (scroll_point - once_scrolled);
          var rect = "rect(0px, auto, " + clip + "px, 0px)";
          content.css({
            position: "fixed",
            top: top,
            right: right,
            clip: rect,
            width: width,
            zIndex: 1,
          });
        } else {
          content.removeAttr("style");
        }
      });
    }
  }
});

document.addEventListener("DOMContentLoaded", function () {
  var wnd = $(window);
  var body = $("body");
  if (body.hasClass("collection") || body.hasClass("list-collections")) {
    var container = $(".collection_inner");
    var content = $(".collection_info");
    var width_blank_space = container.width() - content.width();
    var height_blank_space = wnd.height() - container.height();
    var site_header_height = $("div#shopify-section-header > header").height();
    var right = width_blank_space / 2;
    if (container.length != 0) {
      $(window).on("load scroll resize", function () {
        var top = site_header_height;
        var scroll_point = $(this).scrollTop();
        var containerOffset = container.position().top;
        var cont_blank_space = (container.height() - content.height()) / 2;
        var once_scrolled = containerOffset;
        if (scroll_point > once_scrolled) {
          var from = content.height() + cont_blank_space;

          var clip = from - (scroll_point - once_scrolled);
          var rect = "rect(0px, auto, " + clip + "px, 0px)";
          content.css({
            position: "fixed",
            clip: rect,
            zIndex: 1,
          });
        } else {
          content.removeAttr("style");
        }
      });
    }
  }
});

KlaviyoSubscribe.attachToForms("#newsletter_popup", {
  hide_form_on_success: true,
  custom_success_message: true,
  extra_properties: {
    $source: "7th Avenue",
    $method_type: "7th Avenue form",
    source: "Popup newsletter",
  },
  success: function ($form) {
    $(".form_data").hide();
  },
});

//Footer
KlaviyoSubscribe.attachToForms("#newsletter_popup_footer", {
  hide_form_on_success: true,
  custom_success_message: true,
  extra_properties: {
    $source: "7th Avenue",
    $method_type: "7th Avenue newsletter form",
    source: "Footer newsletter",
  },
  success: function ($form) {
    $(".footer_form_data").hide();
  },
});
document.addEventListener("DOMContentLoaded", function () {
  var homeImageSlider = $(".home_image_slider") || null;
  if (homeImageSlider) {
    let autoplaySpeed = homeImageSlider.data("autoplaySpeed");
    var image_slider = $(".home_image_slider").not(".slick-initialized").slick({
      autoplay: true,
      autoplaySpeed: autoplaySpeed,
      adaptiveHeight: true,
      cssEase: "ease",
      slidesToShow: 1,
      slidesToScroll: 1,
      lazyLoad: "ondemand",
      infinite: true,
      nextArrow:
        '<a class="slick-next slick-arrow"><i class="la la-angle-right" aria-hidden="true"></i></a>',
      prevArrow:
        '<a class="slick-prev slick-arrow"><i class="la la-angle-left" aria-hidden="true"></i></a>',
    });
    $(window).resize(function () {
      image_slider.slick("resize");
    });
  }
});
document.addEventListener("themeJSFastLoaded", function () {
  var customer_testimonials_slider = $(".customer_testimonials_slider") || null;
  if (customer_testimonials_slider) {
    var testimonial_slider = $(".customer_testimonials_slider").bxSlider({
      speed: 800,
      pause: 7500,
      tickerHover: false,
      adaptiveHeight: true,
      prevText: '<i class="la la-angle-left" aria-hidden="true"></i>',
      nextText: '<i class="la la-angle-right" aria-hidden="true"></i>',
      slideWidth: 1200,
      moveSlides: 1,
      pager: true,
      auto: true,
      onSlideBefore: function () {
        testimonial_slider.stopAuto();
        testimonial_slider.startAuto();
      },
      onSlideAfter: function () {
        testimonial_slider.stopAuto();
        testimonial_slider.startAuto();
      },
    });
  }
});

(function () {
  function collectionColorSwatch() {
    var container = document.querySelectorAll(".product-index");
    container.forEach(function (el) {
      var variants = [...el.querySelectorAll(".color__swatch li")];
      var images = el.querySelectorAll(".reveal .variant__image");
      let colorOption = `option${el.querySelector(".color__swatch li").dataset.position
        }`;
      var activeImageData = el.querySelector(".reveal .variant__image.open")
        .dataset.option1;
      let activeSwatchItem = el.querySelector(
        `.color__swatch li[data-option-name="${activeImageData}"]`
      );
      var links = el.querySelectorAll("a");
      var price = el.querySelector(".price__container .variant__price");
      var monthlyPriceContainer = el.querySelector(
        ".price__container .monthly__price"
      );
      var activeVariant = el.querySelector(".color__swatch li.open");
      var swatchSlider = el.querySelector(".color__swatch--container ul");

      const fristImage = el.querySelector(".reveal .variant__image.open");
      const defaultOptions = {
        option1: fristImage.dataset.option1
          ? `${fristImage.dataset.option1}`
          : "",
        option2: fristImage.dataset.option2
          ? `${fristImage.dataset.option2}`
          : "",
        option3: fristImage.dataset.option3
          ? `${fristImage.dataset.option3}`
          : "",
      };

      $(document).ready(function () {
        let availableWidth = swatchSlider.offsetWidth;
        let contentWidth =
          variants.length * variants[0].offsetWidth + variants.length * 6;
        function getIndexOfElementWithClass(element) {
          const elements = el.querySelectorAll(".color__swatch li");
          for (let i = 0; i < elements.length; i++) {
            if (elements[i] === element) {
              return i;
            }
          }
          return -1; // If the element is not found
        }

        let initialSlideIndex = 0;

        function getCookie(name) {
          const value = `; ${document.cookie}`;
          const parts = value.split(`; ${name}=`);
          if (parts.length === 2) return parts.pop().split(";").shift();
        }

        function processString(str) {
          if (!str) return "";
          const regex = /^(\d+_)(.*)/;
          const match = str.match(regex);
          if (match) {
            return match[2];
          } else {
            return str;
          }
        }

        const storedColors = getCookie("selected_color")
          ? JSON.parse(getCookie("selected_color"))
          : [];
        if (storedColors.length > 0) {
          // Call the reorderSlides function before initializing the slick slider
          initialSlideIndex = getIndexOfElementWithClass(activeVariant);
        }

        function enableSwatchSlider() {
          $(swatchSlider).not(".slick-initialized").slick({
            infinite: true,
            arrows: false,
            dots: false,
            slidesToShow: 6,
            slidesToScroll: 1,
            initialSlide: initialSlideIndex,
            focusOnSelect: true,
            mobileFirst: true,
            variableWidth: true,
          });
        }

        function disableSwatchSlider() {
          if ($(swatchSlider).hasClass("slick-initialized")) {
            $(swatchSlider).slick("unslick");
          }
        }

        if (contentWidth < availableWidth) {
          disableSwatchSlider();
        } else {
          enableSwatchSlider();
        }

        window.addEventListener("resize", () => {
          availableWidth = swatchSlider.offsetWidth;
          contentWidth =
            variants.length * variants[0].offsetWidth + variants.length * 6;
          if (contentWidth < availableWidth) {
            disableSwatchSlider();
          } else {
            enableSwatchSlider();
          }
        });
      });

      function updateVariantOption(currentOption) {
        var activeImage = el.querySelector(".variant__image.open");
        var option1 = activeImage.dataset.option1;
        var option2 = activeImage.dataset.option2;
        var option3 = activeImage.dataset.option3;
        if (currentOption) {
          var position = parseInt(currentOption.dataset.position);
          var _activeVariant;

          if (position == 1) {
            _activeVariant = el.querySelector(
              `.variant__image[data-option1="${currentOption.dataset.optionName}"][data-option2="${defaultOptions.option2}"][data-option3="${defaultOptions.option3}"]`
            );
            if (_activeVariant === null) {
              _activeVariant = el.querySelector(
                `.variant__image[data-option1="${currentOption.dataset.optionName}"][data-option2="${defaultOptions.option2}"]`
              );
            }
            if (_activeVariant === null) {
              _activeVariant = el.querySelector(
                `.variant__image[data-option1="${currentOption.dataset.optionName}"][data-option3="${defaultOptions.option3}"]`
              );
            }

            if (_activeVariant === null) {
              _activeVariant = el.querySelector(
                `.variant__image[data-option1="${currentOption.dataset.optionName}"]`
              );
            }
          }

          if (position == 2) {
            _activeVariant = el.querySelector(
              `.variant__image[data-option2="${currentOption.dataset.optionName}"][data-option1="${defaultOptions.option2}"][data-option3="${defaultOptions.option3}"]`
            );
            if (_activeVariant === null) {
              _activeVariant = el.querySelector(
                `.variant__image[data-option2="${currentOption.dataset.optionName}"][data-option1="${defaultOptions.option2}"]`
              );
            }
            if (_activeVariant === null) {
              _activeVariant = el.querySelector(
                `.variant__image[data-option2="${currentOption.dataset.optionName}"][data-option3="${defaultOptions.option3}"]`
              );
            }

            if (_activeVariant === null) {
              _activeVariant = el.querySelector(
                `.variant__image[data-option2="${currentOption.dataset.optionName}"]`
              );
            }
          }

          if (position == 3) {
            _activeVariant = el.querySelector(
              `.variant__image[data-option3="${currentOption.dataset.optionName}"][data-option1="${defaultOptions.option2}"][data-option1="${defaultOptions.option3}"]`
            );
            if (_activeVariant === null) {
              _activeVariant = el.querySelector(
                `.variant__image[data-option3="${currentOption.dataset.optionName}"][data-option1="${defaultOptions.option2}"]`
              );
            }
            if (_activeVariant === null) {
              _activeVariant = el.querySelector(
                `.variant__image[data-option3="${currentOption.dataset.optionName}"][data-option2="${defaultOptions.option3}"]`
              );
            }

            if (_activeVariant === null) {
              _activeVariant = el.querySelector(
                `.variant__image[data-option3="${currentOption.dataset.optionName}"]`
              );
            }
          }

          if (activeImage !== _activeVariant) {
            if (!_activeVariant.classList.contains("open")) {
              _activeVariant.classList.add("open");
            }
            if (_activeVariant.classList.contains("open"))
              activeImage.classList.remove("open");
          }

          var variantId, variantUrl, variantPrice, monthlyPrice;
          variantId = _activeVariant.dataset.variantId;
          variantUrl = _activeVariant.dataset.variantUrl;
          variantPrice = _activeVariant.dataset.variantPrice;
          monthlyPrice = _activeVariant.dataset.monthlyPrice;
          var searchString = variantUrl.split("?")[1];
          const searchParams = new URLSearchParams(searchString);
          searchParams.set("variant", variantId);
          var newUrl = variantUrl.split("?")[0] + "?" + searchParams.toString();
          links.forEach(function (link) {
            link.href = newUrl;
          });
          if (variantPrice != null && price != null) {
            price.innerText = variantPrice;
          }
          if (monthlyPrice != null && monthlyPriceContainer != null) {
            monthlyPriceContainer.innerText = monthlyPrice;
          }

          if (activeVariant && activeVariant.classList.contains("open")) {
            activeVariant.classList.remove("open");
          }
          currentOption.classList.add("open");
          activeVariant = currentOption;
        }
      }
      updateVariantOption(activeVariant);
      variants.forEach(function (variant, variantIndex) {
        variant.addEventListener("click", function (e) {
          updateVariantOption(e.currentTarget);
          let currentImage = el.querySelector(
            `.variant__image[data-${colorOption}="${e.currentTarget.dataset.optionName}"]`
          );
          let price = currentImage.dataset.variantPrice;
          let CompairPrice = currentImage.dataset.variantComparePrice;
          let priceOff = currentImage.dataset.priceOff;
          let priceContainer = el.querySelector(".price__container");
          if (e.currentTarget.classList.contains("deselect")) {
            if (currentImage) {
              let currentVariantImgae = currentImage.querySelector(
                ".variant-featured-image"
              );
              if (
                currentVariantImgae &&
                currentVariantImgae.classList.contains("hidden")
              )
                currentVariantImgae.classList.remove("hidden");
            }
            e.currentTarget.classList.remove("deselect");
          }
          if (price && CompairPrice && priceOff && priceContainer) {
            priceContainer.innerHTML = `
                        <div class="collection__price"> 
                           <span class="product-price was"> 
                           <span class="collection_money">${CompairPrice}</span>
                           </span>
                           <span class="product-price current sale" itemprop="price"> 
                           <span class="collection_money">${price}</span>
                           </span>
                           <span class="money_save money_save_pdp">${priceOff}</span>
                        </div>
                      `;
          } else {
            priceContainer.innerHTML = `
                        <div class="collection__price">      
                         <span class="product-price current" itemprop="price">
                           <span class="collection_money">${price}</span>
                         </span>
                      </div>
                      `;
          }
        });
      });
    });
  }
  collectionColorSwatch();
  window.addEventListener("filterFormSubmit", collectionColorSwatch);
})();

(function () {
  window.addEventListener("DOMContentLoaded", function () {
    var checkAffirm = setInterval(getAffirm, 1000);
    function getAffirm() {
      var affirmAmountElement = document.querySelector(".affirm-ala-price");
      if (affirmAmountElement !== null) {
        var affirmAmount = affirmAmountElement.innerText;
        document.querySelector(".pdb-affirm__title--amount").innerText =
          affirmAmount;
        clearInterval(checkAffirm);
      }
    }
  });
})();

$(function () {
  const strip = document.querySelector(".strip__buy-button");
  const mainButtonWrapper = document.querySelector(
    ".product__form--button-wrapper"
  );
  if (strip == null) return;
  const hideWhenBoxInView = new IntersectionObserver((entries) => {
    if (entries[0].intersectionRatio <= 0) {
      // If not in view
      strip.style.display = "block";
    } else {
      strip.style.display = "none";
    }
  });

  hideWhenBoxInView.observe(mainButtonWrapper);
});

(function () {
  function addClass(wrapper, isBodyFixed = true) {
    wrapper.classList.add("show");
    if (!isBodyFixed) return;
    document.body.classList.add("variant-details-open");
  }

  function removeClass(wrapper) {
    if (!wrapper.classList.contains("show")) return;
    wrapper.classList.remove("show");
    if (!document.body.classList.contains("variant-details-open")) return;
    document.body.classList.remove("variant-details-open");
  }

  function desktopFabricInfo() {
    let colors = document.querySelectorAll(".swatch-element.color label");
    let wrapper = document.querySelector(".variant-details-wrapper");
    let desktopWrapper = document.querySelector(
      ".variant-details-wrapper-inner"
    );
    if (colors.length === 0) return;
    colors.forEach((color) => {
      color.addEventListener("mouseover", () => {
        let element = color.parentElement.querySelector(".option-info");
        if (!element && element.innerHTML.trim() === "") return;
        desktopWrapper.innerHTML = element.innerHTML;
        addClass(wrapper, false);
      });

      color.addEventListener("mouseout", () => {
        removeClass(wrapper);
      });
    });
  }

  function mobileFabricInfo() {
    let detailsIcons = document.querySelectorAll(
      ".fabric-option-info .fabric__info-icon"
    );
    let detailsClose = document.querySelector(".variant-details-close");
    let mobileWrapper = document.querySelector(
      ".variant-details-wrapper-mobile"
    );
    let mobileWrapperMain = document.querySelector(
      ".variant-details-wrapper-mobile-main"
    );

    if (detailsIcons.length === 0) return;
    detailsIcons.forEach((detailsIcon) => {
      detailsIcon.addEventListener("click", () => {
        let element = document
          .querySelector(".swatch-element input:checked")
          .parentElement.querySelector(".option-info");
        if (!element && element.innerHTML.trim() === "") return;
        mobileWrapperMain.innerHTML = element.innerHTML;
        mobileWrapperMain.scrollTop = 0;
        addClass(mobileWrapper);
      });
    });

    detailsClose.addEventListener("click", () => {
      removeClass(mobileWrapper);
    });

    window.addEventListener("resize", () => {
      removeClass(mobileWrapper);
    });

    mobileWrapper.addEventListener("click", (event) => {
      if (!mobileWrapperMain.contains(event.target)) {
        removeClass(mobileWrapper);
      }
    });
  }

  Events.on("mediaquery:desktop", function () {
    desktopFabricInfo();
  });

  Events.on("mediaquery:tablet", function () {
    mobileFabricInfo();
  });
  Events.on("mediaquery:mobile", function () {
    mobileFabricInfo();
  });
})();

(function () {
  function getXOverlapAmount(el1, el2) {
    const rect1 = el1.getBoundingClientRect();
    const rect2 = el2.getBoundingClientRect();
    return Math.max(
      0,
      Math.min(rect1.right, rect2.right) - Math.max(rect1.left, rect2.left)
    );
  }

  function fixOverlap() {
    const form = document.querySelector(".product-form");
    const variantWrapper = document.querySelector(".variant-details-wrapper");
    if (form && variantWrapper) {
      const xOverlap = getXOverlapAmount(form, variantWrapper);
      variantWrapper.style.setProperty("--x-overlap", `${xOverlap}px`);
      variantWrapper.classList.add("ready");
    }
  }

  document.addEventListener("DOMContentLoaded", fixOverlap);
  window.addEventListener("resize", fixOverlap);
  window.addEventListener("orientationchange", fixOverlap);
})();

(function () {
  let act = document.querySelector(".product__form--button-wrapper");
  let stickyAct = document.querySelector(".sticky__act--mobile");
  let footer = document.querySelector("#footer-wrapper");
  if (act === null || stickyAct === null) return;
  window.addEventListener("scroll", () => {
    let actRectY = act.getBoundingClientRect().y;
    let footerRectTop = footer.getBoundingClientRect().top;
    let isTrue = actRectY < 0 && footerRectTop > window.innerHeight;
    stickyAct.classList.toggle("active", isTrue);
  });
})();

(() => {
  $('.custom-gallery__grid [data-fancybox="custom-gallery"]').fancybox({
    loop: true,
    transitionDuration: 100,
    animationDuration: 500,
    buttons: ["close"],
  });
})();

(() => {
  let galleryItem = document.querySelectorAll(".help-desk__btn.reamaze__open");
  if (galleryItem.length <= 0) return;
  galleryItem.forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      GorgiasChat.open();
    });
  });

  $('[data-fancybox="help-desk"]').fancybox({
    loop: true,
    transitionDuration: 100,
    animationDuration: 500,
    animationEffect: "fade",
    buttons: ["close"],
  });
})();

(() => {
  function makeSameHeight() {
    var w, activeTabContentHeight, responciveHeight;
    w = $(window).width();
    activeTabContentHeight =
      $(
        ".product-details__accordian--content.opens .product-details__accordian--content--inner"
      ).outerHeight() + 15;

    const h =
      $(".product-details__accordian").outerHeight() -
      $(".product-details__accordian--content.opens").outerHeight();
    function makeResponciveHeight(height) {
      var imageContainerHeight, tabContainerHeight, extraHeight;
      imageContainerHeight = $(
        ".product-details__image--inner.active"
      ).outerHeight();
      tabContainerHeight = h + height;

      if (tabContainerHeight > imageContainerHeight && w > 980) {
        extraHeight = tabContainerHeight - imageContainerHeight;
      } else {
        extraHeight = 0;
      }
      return height - extraHeight + "px";
    }

    $(".product-details__accordian--content.opens").css(
      "max-height",
      makeResponciveHeight(activeTabContentHeight)
    );

    let oldDataIndex = $(".product-details__image--inner.active").data("index");
    $(document).on("click", ".product-details__accordian--title", function () {
      $(".product-details__accordian--title").not(this).removeClass("open");
      $(".product-details__accordian--content")
        .not(this)
        .css("max-height", "0px")
        .removeClass("opens");

      var body = $(this).siblings(".product-details__accordian--content");

      if ($(this).hasClass("open")) {
        body.removeClass("opens").css("max-height", "0px");
        $(this).removeClass("open");
      } else {
        body.addClass("opens");
        var content_inner = body.find(
          ".product-details__accordian--content--inner"
        );
        var content_inner_height = content_inner.outerHeight() + 15;
        body.css("max-height", makeResponciveHeight(content_inner_height));
        $(this).addClass("open");
      }

      $(
        ".product-details__image [data-index=" + oldDataIndex + "]"
      ).removeClass("active");
      const dataIndex = $(this).data("index");
      $(".product-details__image [data-index=" + dataIndex + "]").addClass(
        "active"
      );
      oldDataIndex = dataIndex;
    });

    window.addEventListener(
      "tabChange",
      (e) => {
        let vatiantTitle = e.detail.title.toLowerCase();
        let tabTitles = [
          ...document.querySelectorAll(".product-details__accordian--title"),
        ];
        let match = tabTitles.find((title) =>
          vatiantTitle.includes(title.dataset.id)
        );
        if (!match) return;
        tabTitles.forEach((tabTitle) => {
          let tabTitleId = tabTitle.dataset.id;

          if (vatiantTitle.includes(tabTitleId)) {
            let body = $(tabTitle.nextElementSibling);
            tabTitle.classList.add("open");
            var content_inner = body.find(
              ".product-details__accordian--content--inner"
            );
            var content_inner_height = content_inner.outerHeight() + 15;
            body.css("max-height", makeResponciveHeight(content_inner_height));

            $(
              ".product-details__image [data-index=" + oldDataIndex + "]"
            ).removeClass("active");
            const dataIndex = $(tabTitle).data("index");
            $(
              ".product-details__image [data-index=" + dataIndex + "]"
            ).addClass("active");
            oldDataIndex = dataIndex;
          } else {
            if (tabTitle.classList.contains("open")) {
              let body = $(tabTitle.nextElementSibling);
              tabTitle.classList.remove("open");
              body.removeClass("opens").css("max-height", "0px");
            }
          }
        });

        let activeImageContainer = document.querySelector(
          ".product-details__image--inner.active"
        );
        let images = [
          ...activeImageContainer.querySelectorAll(
            ".product-details__image--single"
          ),
        ];
        if (images.length === 2) {
          let imageToBeActive = images.find((image) =>
            vatiantTitle.includes(image.dataset.imageTitle)
          );
          images.forEach((image) => {
            if (image === imageToBeActive) {
              image.classList.add("active");
            } else {
              if (image.classList.contains("active")) {
                image.classList.remove("active");
              }
            }
          });
        }
      },
      false
    );
  }

  $(document).ready(makeSameHeight);
})();

(() => {
  function makeSameHeight() {
    var table = document.querySelector(".pdp-sofa-compare__table--mobile");
    if (table !== null) {
      for (var i = 1; i <= 14; i++) {
        var cls = `.table__row--${i}`;
        var row = table.querySelectorAll(cls);
        var height = 0;
        row.forEach(function (el) {
          if (el.clientHeight > height) {
            height = el.clientHeight;
          }
        });

        row.forEach(function (el) {
          el.style.height = `${height}px`;
        });
      }
    }
  }

  function makeSticky() {
    window.addEventListener("scroll", function () {
      var headerHeight = document.querySelector(".scrollheader").clientHeight;
      var tableHeader = document.querySelector(
        ".pdp-sofa-compare__table--header"
      );
      if (tableHeader !== null) {
        var tableHeaderWidth = tableHeader.clientWidth;
        var tableHeaderHeight = tableHeader.clientHeight;
        var table = document.querySelector(".pdp-sofa-compare__table");
        var tableTop = table.getBoundingClientRect().top;
        var tablebottom =
          table.getBoundingClientRect().top + table.clientHeight;

        var lastRow = document.querySelector(
          ".pdp-sofa-compare__table--row.table__last--row"
        );
        var lastRowTop = lastRow.getBoundingClientRect().top;
        if (tableTop < headerHeight) {
          tableHeader.classList.add("sticky");
          tableHeader.style.cssText = `width:${tableHeaderWidth}px; top:${headerHeight}px;`;
          table.style.paddingTop = tableHeaderHeight + "px";
        } else {
          tableHeader.classList.remove("sticky");
          tableHeader.style.cssText = `width:100%; top:unset;`;
          table.style.paddingTop = 0;
        }

        if (lastRowTop < tableHeaderHeight + headerHeight) {
          tableHeader.classList.add("hide");
        } else {
          tableHeader.classList.remove("hide");
        }
      }
    });
  }

  //setTimeout(makeSticky, 500);
  window.addEventListener("DOMContentLoaded", function () {
    makeSameHeight();
  });
  window.addEventListener("resize", function () {
    makeSameHeight();
  });
})();

(() => {
  var wrappers = document.querySelectorAll(".collection__review");
  wrappers.forEach((wrapper) => {
    var id = wrapper.dataset.sectionId;
    var slider = document.querySelector(
      `.collection__review--${id} .collection__review--slider`
    );
    var speed = parseInt(wrapper.dataset.speed);
    $(slider).slick({
      infinite: true,
      autoplay: true,
      autoplaySpeed: speed,
      speed: 300,
      slidesToShow: 7,
      slidesToScroll: 1,
      prevArrow: $(".slider__controller--prev"),
      nextArrow: $(".slider__controller--next"),
      responsive: [
        {
          breakpoint: 3420,
          settings: {
            slidesToShow: 6,
          },
        },
        {
          breakpoint: 2820,
          settings: {
            slidesToShow: 5,
          },
        },
        {
          breakpoint: 2220,
          settings: {
            slidesToShow: 4,
          },
        },
        {
          breakpoint: 1920,
          settings: {
            slidesToShow: 3,
          },
        },
        {
          breakpoint: 740,
          settings: {
            slidesToShow: 2,
          },
        },
        {
          breakpoint: 480,
          settings: {
            slidesToShow: 1,
            slidesToScroll: 1,
          },
        },
      ],
    });

    $(
      ".collection__review .slick-slide:not(.slick-cloned) [data-fancybox]"
    ).fancybox({
      loop: true,
      transitionDuration: 100,
      animationDuration: 500,
      animationEffect: "fade",
      buttons: ["close"],
    });
  });
})();

(() => {
  var wrappers = document.querySelectorAll(".sofa-page-feature-product");
  wrappers.forEach((wrapper) => {
    var id = wrapper.dataset.sectionId;
    var slider = document.querySelector(
      `.sofa-page-feature-product__${id} .sofa-page-feature-product-slider`
    );
    var prev = document.querySelector(
      `.sofa-page-feature-product__${id} .slider__controller--prev`
    );
    var next = document.querySelector(
      `.sofa-page-feature-product__${id} .slider__controller--next`
    );

    function enableProductSlider() {
      $(slider)
        .not(".slick-initialized")
        .slick({
          infinite: true,
          speed: 300,
          slidesToShow: 7, // Default setting
          slidesToScroll: 1,
          prevArrow: $(prev),
          nextArrow: $(next),
          responsive: [
            {
              breakpoint: 3420,
              settings: {
                slidesToShow: 6,
              },
            },
            {
              breakpoint: 2820,
              settings: {
                slidesToShow: 5,
              },
            },
            {
              breakpoint: 2220,
              settings: {
                slidesToShow: 4,
              },
            },
            {
              breakpoint: 1920,
              settings: {
                slidesToShow: 3,
              },
            },
          ],
        });
    }

    function disableProductSlider() {
      if ($(slider).hasClass("slick-initialized")) {
        $(slider).slick("unslick");
      }
    }

    Events.on("mediaquery:desktop", function () {
      enableProductSlider();
    });

    Events.on("mediaquery:tablet", function () {
      enableProductSlider();
    });

    Events.on("mediaquery:mobile", function () {
      disableProductSlider();
    });
  });
})();

(() => {
  function play() {
    var h =
      window.innerHeight ||
      document.documentElement.clientHeight ||
      document.body.clientHeight;
    var headerHeight = document.querySelector("#navigation").offsetHeight;
    var videos = document.querySelectorAll(
      ".product-special-feature__video video"
    );
    videos.forEach(function (video) {
      var videoHeight = video.offsetHeight;
      var videoTopPosition = video.getBoundingClientRect().top;
      var videoBottomPosition = video.getBoundingClientRect().bottom;

      if (
        (video && videoTopPosition + videoHeight / 2 < headerHeight) ||
        videoTopPosition + videoHeight / 2 > h
      ) {
        video.pause();
      } else {
        video.play();
      }
    });
  }

  play();
  window.addEventListener("scroll", play);
  document.body.addEventListener("touchstart", play);

  function stickyContent() {
    var h =
      window.innerHeight ||
      document.documentElement.clientHeight ||
      document.body.clientHeight;
    var w =
      window.innerWidth ||
      document.documentElement.clientWidth ||
      document.body.clientWidth;
    var headerHeight = document.querySelector("#navigation").offsetHeight;
    var containerS = document.querySelectorAll(
      ".product-special-feature__container"
    );
    window.addEventListener("resize", function () {
      w =
        window.innerWidth ||
        document.documentElement.clientWidth ||
        document.body.clientWidth;
    });

    window.addEventListener("scroll", function () {
      var containerHeight,
        containerTopPosition,
        containerBottomPosition,
        content,
        contentHeight,
        contentTopPosition,
        contentBottomPosition,
        contentRight,
        contentBlankSpace,
        rect;

      function getScrollbarWidth() {
        return window.innerWidth - document.documentElement.clientWidth;
      }

      containerS.forEach(function (container) {
        containerHeight = container.offsetHeight;
        containerTopPosition = container.getBoundingClientRect().top;
        containerBottomPosition = container.getBoundingClientRect().bottom;
        content = container.querySelector(
          ".product-special-feature__content--inner"
        );
        contentHeight = content.offsetHeight;
        contentTopPosition = content.getBoundingClientRect().top;
        contentBottomPosition = content.getBoundingClientRect().bottom;
        contentBlankSpace = containerHeight - contentHeight;

        contentRight =
          w - (container.getBoundingClientRect().right + getScrollbarWidth());

        if (containerTopPosition < headerHeight && w > 751) {
          if (containerBottomPosition < contentBottomPosition) {
            rect = `${containerBottomPosition - contentBottomPosition + contentHeight
              }px`;
          } else {
            rect = "auto";
          }
          content.style.cssText = `position: fixed; top: ${contentTopPosition}px; right: ${contentRight}px; clip: rect(0px,auto, ${rect},0px)`;
        } else {
          content.removeAttribute("style");
        }
      });
    });
  }

  stickyContent();

  window.addEventListener("resize", function () {
    stickyContent();
  });
})();

(() => {
  $(window).on("scroll resize", function () {
    if ($(window).width() > 980) {
      var ac = $(".pdp-advanced-content__row");
      $.each(ac, function () {
        var target = $(this).closest(".pdp-advanced-content__row");
        var offset = $(this).position().top;
        var sectionHeight = $(this).height();
        var scrolled = $(window).scrollTop() + sectionHeight;
        if (scrolled > offset) {
          target.addClass("focused");
          if (scrolled > offset + sectionHeight) {
            target.removeClass("focused");
          }
        } else {
          target.removeClass("focused");
        }
      });
    }
  });

  function hanldeVideoPlay() {
    let videos = document.querySelectorAll(
      ".pdp-advanced-content__image video"
    );
    if (videos.length <= 0) return;
    videos.forEach(function (video) {
      video.play();
    });
  }
  document.body.addEventListener("touchstart", hanldeVideoPlay);
})();

window.addEventListener("load", function () {
  var buttons = document.querySelectorAll(".showroom-card__button");
  buttons.forEach(function (button) {
    button.addEventListener(
      "click",
      function (event) {
        fbq("track", "Schedule", {
          book_appointment_page_url: theme.routes.url,
          event_type_url: event.target.href,
          event_type_name:
            event.target.parentElement.children[0].children[0].innerHTML.replace(
              /<br\s*\/?>/gi,
              " "
            ),
        });
      },
      false
    );
  });
});

function setCookie(cname, cvalue) {
  document.cookie = `${cname}=${JSON.stringify(cvalue)};domain=;path=/`;
}

function getCookie(cname) {
  let name = cname + "=";
  let decodedCookie = decodeURIComponent(document.cookie);
  let ca = decodedCookie.split(";");
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) == " ") {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}

const allShowRoom = document.querySelectorAll(".showroom");
allShowRoom.forEach(function (showroom) {
  //Calendly
  let buttons = showroom.querySelectorAll(".showroom-card__button");
  buttons.forEach(function (button) {
    let ButtonUrl = button.href;
    if (ButtonUrl) {
      button.addEventListener("click", initCalendly);
    }
    function initCalendly(e) {
      e.preventDefault();
      Calendly.initPopupWidget({
        url: ButtonUrl,
      });
    }
  });

  const allShowroom = showroom.querySelectorAll(
    ".active_geo [data-showroom-order]"
  );

  const distData = function () {
    return new Promise(async (res, rej) => {
      if (allShowroom.length <= 0) return;
      let i = 0;
      const distances = [];
      let currentItem = null;
      for (const address of allShowroom) {
        currentItem = await getDistance(address, i);
        if (!distances.find((item) => item.id == currentItem.id))
          distances.push(currentItem);
        if (i == allShowroom.length - 1) res(distances);
        i++;
      }
    });
  };

  function getDistance(address, i) {
    return new Promise((res) => {
      let geoArr = getCookie("geo") ? JSON.parse(getCookie("geo")) : [];
      const itemCached = geoArr?.find((item) => item.id == address.dataset.id);
      if (itemCached) {
        return res(itemCached);
      }
      fetch(
        "https://api.ipgeolocation.io/ipgeo?apiKey=2c6a7373a74548c798abd31f823fa892"
      )
        .then((data) => {
          return data.json();
        })
        .then((data) => {
          let shoroomLatitude = address.dataset.latitude,
            shoroomLongitude = address.dataset.longitude,
            clientLatitude = data.latitude,
            clientLongitude = data.longitude,
            showRoomId = address.dataset.id;
          function calcCrow(lat1, lon1, lat2, lon2) {
            let R = 6371; // km
            let dLat = toRad(lat2 - lat1);
            let dLon = toRad(lon2 - lon1);
            lat1 = toRad(lat1);
            lat2 = toRad(lat2);

            let a =
              Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.sin(dLon / 2) *
              Math.sin(dLon / 2) *
              Math.cos(lat1) *
              Math.cos(lat2);
            let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            let d = R * c;
            return d * 0.621371;
          }

          // Converts numeric degrees to radians
          function toRad(Value) {
            return (Value * Math.PI) / 180;
          }

          let distance = Math.round(
            calcCrow(
              shoroomLatitude,
              shoroomLongitude,
              clientLatitude,
              clientLongitude
            )
          );
          const dist = { distance: distance, index: i, id: showRoomId };
          geoArr.push(dist);
          setCookie("geo", geoArr);
          res(dist);
        })
        .catch((e) => {
          res({});
        });
    });
  }

  const activeGeo = showroom.querySelector(".active_geo");
  if (activeGeo) {
    distData().then((distArr) => {
      distArr.sort(function (a, b) {
        return a.distance - b.distance;
      });
      distArr.forEach(function (dist, index) {
        let showroom = document.querySelector(
          `.showroom .section-boxed-column[data-id="${dist.id}"]`
        );
        showroom.setAttribute("data-dis", dist.distance);
        showroom.style = `--order:${index}`;
      });
    });
  }
});

(function () {
  const variantInfo = document.querySelectorAll(".variant--info");
  if (variantInfo.length === 0) return;
  variantInfo.forEach(function (info) {
    const icon = info.querySelector(".variant-info--icon");
    const wrapper = info.querySelector(".variant-info-wrapper");
    icon.addEventListener("mouseover", function () {
      wrapper.classList.add("open");
    });

    icon.addEventListener("mouseout", function () {
      if (wrapper.classList.contains("open")) wrapper.classList.remove("open");
    });
  });
})();

(function () {
  const clocks = document.querySelectorAll(`.clock[data-final-date]`);
  clocks.forEach((clock) => {
    if (clock == null) return;

    const countDownDate = new Date(clock.dataset.finalDate).getTime();

    // Update the count down every 1 second
    const updateTime = setInterval(function () {
      // Get today's date and time
      let now = new Date().getTime();

      // Find the distance between now and the count down date
      let distance = countDownDate - now;

      // Time calculations for days, hours, minutes and seconds
      let days = setClock(Math.floor(distance / (1000 * 60 * 60 * 24)));
      let hours = setClock(
        Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      );
      let minutes = setClock(
        Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))
      );
      let text = ` ${days > 0 ? days + " days" : ""} ${days > 0 && hours > 1 ? " & " : ""
        } ${hours > 1 ? +hours + " hours" : ""} ${days < 1 && hours > 1 ? " & " : ""
        } ${days < 1 ? minutes + " minutes" : ""}`;
      clock.innerHTML = `${text.trim()}`;
      // If the count down is over, write some text
      if (distance < 0) {
        clearInterval(updateTime);
        clock.parentNode.innerHTML = `Our Cyber Monday sale is EXPIRED`;
      }
    }, 1000);

    setClock = (timeValue) => {
      if (timeValue < 10) {
        return `0${timeValue}`;
      } else {
        return timeValue;
      }
    };
  });
})();

(function () {
  const allContainer = document.querySelectorAll(".feature-in");
  allContainer.forEach((container) => {
    const featureInSlider = container.querySelector(".grid_wrapper");
    const settings = {
      mobileFirst: true,
      infinite: true,
      autoplay: true,
      autoplaySpeed: 5000,
      speed: 300,
      slidesToShow: 1,
      slidesToScroll: 1,
      prevArrow: $(".feature-in .slider__controller--prev"),
      nextArrow: $(".feature-in .slider__controller--next"),
      responsive: [
        {
          breakpoint: 600,
          settings: {
            slidesToShow: 2,
            slidesToScroll: 1,
          },
        },
        {
          breakpoint: 740,
          settings: "unslick",
        },
      ],
    };

    $(featureInSlider).slick(settings);

    $(window).on("resize", function () {
      if ($(window).width() > 740) {
        return;
      }
      if (!$(featureInSlider).hasClass("slick-initialized")) {
        return $(featureInSlider).slick(settings);
      }
    });
  });
})();

(function () {
  let buttons = document.querySelectorAll(".image-with-text__btn");
  buttons.forEach(function (button) {
    let ButtonUrl = button.href;
    if (ButtonUrl.includes("calendly")) {
      button.addEventListener("click", initCalendly);
    }
    function initCalendly(e) {
      e.preventDefault();
      Calendly.initPopupWidget({
        url: ButtonUrl,
      });
    }
  });
})();

(function () {
  const affirmMessage = document.querySelector(".affirm-osm .affirm-as-low-as");
  const klarnaMessage = document.querySelector(".klarna-osm klarna-placement");

  if (affirmMessage) {
    const affirmInterval = setInterval(function () {
      if (affirmMessage.hasChildNodes()) {
        clearInterval(affirmInterval);
        document
          .querySelectorAll(".affirm-popup-opener")
          .forEach(function (el) {
            el.addEventListener("click", function () {
              document
                .querySelector(".affirm-osm .affirm-modal-trigger")
                .click();
            });
          });
      }
    }, 500);
  }

  if (klarnaMessage) {
    const klarnaInterval = setInterval(function () {
      if (klarnaMessage.hasChildNodes()) {
        clearInterval(klarnaInterval);
        document
          .querySelectorAll(".klarna-popup-opener")
          .forEach(function (el) {
            el.addEventListener("click", function () {
              klarnaMessage.shadowRoot.querySelector(".link").click();
            });
          });
      }
    }, 500);
  }
})();

(function () {
  const expandAbleTexts = document.querySelectorAll(".expandable_container");
  expandAbleTexts.forEach((expandAbleText) => {
    if (expandAbleText.length == 0) return;
    const btnContainer = expandAbleText.querySelector(".expand");
    const btn = expandAbleText.querySelector(".read-more");
    window.addEventListener("click", (e) => {
      if (e.target.classList.contains("read-more")) {
        expandAbleText.classList.toggle("expanded");
        if (expandAbleText.classList.contains("expanded")) {
          btnContainer.innerHTML = `<span class="read-more">Read less</span>`;
        } else {
          btnContainer.innerHTML = `... <span class="read-more">Read more</span>`;
        }
      }
    });
  });
})();

(function () {
  var TxtType = function (el, toRotate, period) {
    this.toRotate = toRotate;
    this.el = el;
    this.loopNum = 0;
    this.period = parseInt(period, 10) || 2000;
    this.txt = "";
    this.tick();
    this.isDeleting = false;
  };

  TxtType.prototype.tick = function () {
    var i = this.loopNum % this.toRotate.length;
    var fullTxt = this.toRotate[i];

    if (this.isDeleting) {
      this.txt = fullTxt.substring(0, this.txt.length - 1);
    } else {
      this.txt = fullTxt.substring(0, this.txt.length + 1);
    }

    this.el.querySelector(".wrap").innerText = this.txt;
    var that = this;
    var delta = 200 - Math.random() * 100;

    if (this.isDeleting) {
      delta /= 3;
    }

    if (!this.isDeleting && this.txt === fullTxt) {
      delta = this.period;
      this.isDeleting = true;
    } else if (this.isDeleting && this.txt === "") {
      this.isDeleting = false;
      this.loopNum++;
      delta = 500;
    }

    setTimeout(function () {
      that.tick();
    }, delta);
  };

  window.onload = function () {
    var elements = document.getElementsByClassName("typewrite");
    if (!elements) return;
    for (var i = 0; i < elements.length; i++) {
      var toRotate = elements[i].getAttribute("data-type");
      var period = elements[i].getAttribute("data-period");
      if (toRotate) {
        new TxtType(elements[i], JSON.parse(toRotate), period);
      }
    }
  };
})();

document.addEventListener("DOMContentLoaded", function () {
  const productRecommendationsSection = document.querySelector(
    ".product-recommendations"
  );
  if (productRecommendationsSection == null) return;
  const url = productRecommendationsSection.dataset.url;
  let slider, collGrid, container;
  fetch(url)
    .then((response) => response.text())
    .then((text) => {
      const html = document.createElement("div");
      html.innerHTML = text;

      const recommendations = html.querySelector(".product-recommendations");
      if (recommendations && recommendations.innerHTML.trim().length) {
        productRecommendationsSection.innerHTML = recommendations.innerHTML;
        slider = productRecommendationsSection.querySelector(
          ".sofa-page-feature-product-slider"
        );
        collGrid =
          productRecommendationsSection.querySelectorAll(".product-index");
        container =
          productRecommendationsSection.querySelectorAll(".product-index");
      }
      enableSlider(slider)();
      setColorSwatch(collGrid)();
      collectionColorSwatch(container);
    })
    .catch((e) => {
      console.error(e);
    });

  function setColorSwatch(collGrid) {
    function enableColor() {
      if (collGrid.length > 0) {
        collGrid.forEach((grid) => {
          let colors = grid.querySelectorAll(".color__swatch li");
          colors.forEach((color) => {
            let colorName = color.dataset.optionName
              .toString()
              .replace(/-/g, "_");
            if (
              colorDetails[colorName] !== undefined &&
              colorDetails[colorName].thumbnail !== undefined
            ) {
              color.querySelector(
                ".color__swatch--bg"
              ).style.backgroundImage = `url(${colorDetails[colorName].thumbnail})`;
            }
          });
        });
      }
    }
    return enableColor;
  }

  function enableSlider(slider) {
    function enableProductSliderOnLOad() {
      if (window.matchMedia("(min-width: 741px)").matches) {
        $(slider)
          .not(".slick-initialized")
          .slick({
            infinite: true,
            speed: 300,
            slidesToShow: 3,
            slidesToScroll: 1,
            prevArrow: $(".product-recommendations .slider__controller--prev"),
            nextArrow: $(".product-recommendations .slider__controller--next"),
          });
      }

      if (window.matchMedia("(max-width: 740px)").matches) {
        if ($(slider).hasClass("slick-initialized")) {
          $(slider).slick("unslick");
        }
      }
    }

    function enableProductSlider() {
      $(slider)
        .not(".slick-initialized")
        .slick({
          infinite: true,
          speed: 300,
          slidesToShow: 3,
          slidesToScroll: 1,
          prevArrow: $(".product-recommendations .slider__controller--prev"),
          nextArrow: $(".product-recommendations .slider__controller--next"),
        });
    }

    function disableProductSlider() {
      if ($(slider).hasClass("slick-initialized")) {
        $(slider).slick("unslick");
      }
    }

    Events.on("mediaquery:desktop", function () {
      enableProductSlider();
    });

    Events.on("mediaquery:tablet", function () {
      enableProductSlider();
    });

    Events.on("mediaquery:mobile", function () {
      disableProductSlider();
    });
    return enableProductSliderOnLOad;
  }

  function collectionColorSwatch(container) {
    container.forEach(function (el) {
      var variants = el.querySelectorAll(".color__swatch li");
      var activeVariant = el.querySelector(".color__swatch li.open");
      var images = el.querySelectorAll(".reveal .variant__image");
      var links = el.querySelectorAll("a");
      var price = el.querySelector(".price__container .variant__price");
      var monthlyPriceContainer = el.querySelector(
        ".price__container .monthly__price"
      );

      variants.forEach(function (variant, variantIndex) {
        variant.addEventListener("click", function (e) {
          var activeImage = el.querySelector(".variant__image.open");

          var option1 = activeImage.dataset.option1;
          var option2 = activeImage.dataset.option2;
          var option3 = activeImage.dataset.option3;

          var position = parseInt(e.currentTarget.dataset.position);
          var _activeVariant;
          if (position == 1) {
            _activeVariant = el.querySelector(
              `.variant__image[data-option1="${e.currentTarget.dataset.optionName}"][data-option2=${option2}][data-option3="${option3}"]`
            );
          }
          if (position == 2) {
            _activeVariant = el.querySelector(
              `.variant__image[data-option2="${e.currentTarget.dataset.optionName}"][data-option1=${option1}][data-option3="${option3}"]`
            );
          }
          if (position == 3) {
            _activeVariant = el.querySelector(
              `.variant__image[data-option3="${e.currentTarget.dataset.optionName}"][data-option1=${option1}][data-option2="${option2}"]`
            );
          }
          if (activeImage !== _activeVariant) {
            if (!_activeVariant.classList.contains("open"))
              _activeVariant.classList.add("open");
            if (_activeVariant.classList.contains("open"))
              activeImage.classList.remove("open");

            var variantId, variantUrl, variantPrice, monthlyPrice;
            variantId = _activeVariant.dataset.variantId;
            variantUrl = _activeVariant.dataset.variantUrl;
            variantPrice = _activeVariant.dataset.variantPrice;
            monthlyPrice = _activeVariant.dataset.monthlyPrice;
            var searchString = variantUrl.split("?")[1];
            const searchParams = new URLSearchParams(searchString);
            searchParams.set("variant", variantId);
            var newUrl =
              variantUrl.split("?")[0] + "?" + searchParams.toString();
            links.forEach(function (link) {
              link.href = newUrl;
            });
            if (variantPrice != null && price != null) {
              price.innerText = variantPrice;
            }
            if (monthlyPrice != null && monthlyPriceContainer != null) {
              monthlyPriceContainer.innerText = monthlyPrice;
            }
          }
          if (activeVariant.classList.contains("open")) {
            activeVariant.classList.remove("open");
          }
          e.currentTarget.classList.add("open");
          activeVariant = e.currentTarget;
        });
      });
    });
  }
});

(function () {
  $(".relavant-article-slider")
    .not(".slick-initialized")
    .slick({
      infinite: false,
      speed: 300,
      slidesToShow: 3,
      slidesToScroll: 1,
      prevArrow: $(".relevant-article-prev"),
      nextArrow: $(".relevant-article-next"),
      responsive: [
        {
          breakpoint: 740,
          settings: {
            slidesToShow: 2,
          },
        },
      ],
    });
})();

$(document).ready(function () {
  const win = $(window);
  const doc = $(document);
  const progressBar = $(".reading-progress-indicator progress");
  const setMax = () => $(".article.article-main").height();
  const setValue = () =>
    win.scrollTop() > setMax() ? setMax() : win.scrollTop();
  // const setPercent = () => Math.round(win.scrollTop() / (doc.height() - win.height()) * 100);
  if (progressBar) {
    progressBar.attr({ value: setValue(), max: setMax() });
    doc.on("scroll", () => {
      progressBar.attr({ value: setValue() });
    });
    win.on("resize", () => {
      progressBar.attr({ value: setValue(), max: setMax() });
    });
  }
});

document.addEventListener("DOMContentLoaded", function () {
  const interval = setInterval(() => {
    const parentElement = document.querySelector(
      ".shopify-installments_wrapper"
    );
    if (parentElement && parentElement.childNodes.length > 0) {
      const shopifyPaymentTerms = parentElement.querySelector(
        "shopify-payment-terms"
      );
      if (shopifyPaymentTerms && shopifyPaymentTerms.shadowRoot) {
        const banner = shopifyPaymentTerms.shadowRoot.querySelector(
          "shop-pay-installments-banner"
        );
        if (banner && banner.shadowRoot) {
          const shopifyPaymentTermsbtn = banner.shadowRoot.querySelector(
            "#shopify-installments-cta"
          );
          if (shopifyPaymentTermsbtn) {
            const openers = document.querySelectorAll(".shoppay-popup-opener");
            openers.forEach((opener) => {
              opener.addEventListener("click", () => {
                shopifyPaymentTermsbtn.click();
              });
            });
            clearInterval(interval);
          }
        }
      }
    }
  }, 100);

  setTimeout(() => clearInterval(interval), 5000);
});

class TabContainer extends HTMLElement {
  constructor() {
    super();
    this.addEventListener("click", this.clickHandler.bind(this));
    this.addEventListener("keydown", this.KeyDownHandler.bind(this));
    this.activeButton = this.querySelector(
      '[role="tablist"] a[aria-selected="true"]'
    );
    this.tabButtons = this.querySelectorAll('[role="tablist"] a');
    this.tabPanels = this.querySelectorAll(".tabs__panels > div");
    this.tabListContainer = this.querySelector(
      ".product-tabs-tablist-container"
    );
    this.tabIndicator = this.querySelector(".product-tab-indicator");
    document.addEventListener(
      "DOMContentLoaded",
      this.updateTabIndicator(this.activeButton)
    );
    this.makeScrollable();
  }

  updateTabIndicator(activeTab) {
    const tabPosition = activeTab.offsetLeft;
    const tabWidth = activeTab.offsetWidth;
    // Move the indicator to the active tab
    this.tabIndicator.style.cssText = `
      width: ${tabWidth}px; 
      left: ${tabPosition}px;
    `;
    this.scrollToCenter(activeTab);
  }

  scrollToCenter(activeTab) {
    const index = Array.from(this.tabButtons).indexOf(activeTab);

    const containerWidth = this.tabListContainer.offsetWidth;
    const elementWidth = activeTab.offsetWidth;

    const containerLeft = this.tabListContainer.getBoundingClientRect().left;
    const elementLeft = activeTab.getBoundingClientRect().left;

    const scrollAmount =
      elementLeft - containerLeft - (containerWidth - elementWidth) / 2;

    // this.tabListContainer.scrollLeft += scrollAmount
    this.tabListContainer.scrollTo({
      left: this.tabListContainer.scrollLeft + scrollAmount,
      behavior: "smooth",
    });
  }

  makeScrollable() {
    let isScrollable =
      this.tabListContainer.clientWidth < this.tabListContainer.scrollWidth;
    let isDown = false,
      startX,
      scrollLeft;
    if (!isScrollable) return;
    this.tabListContainer.addEventListener("mousedown", (e) => {
      isDown = true;
      this.tabListContainer.classList.add("slider-ready");
      startX = e.pageX - this.tabListContainer.offsetLeft;
      scrollLeft = this.tabListContainer.scrollLeft;
    });

    this.tabListContainer.addEventListener("mouseleave", () => {
      isDown = false;
      this.tabListContainer.classList.remove("slider-ready");
      this.tabListContainer.classList.remove("slider-scrolling");
    });

    this.tabListContainer.addEventListener("mouseup", () => {
      isDown = false;
      this.tabListContainer.classList.remove("slider-ready");
      this.tabListContainer.classList.remove("slider-scrolling");
    });
    this.tabListContainer.addEventListener("mousemove", (e) => {
      if (!isDown) return;
      e.preventDefault();
      this.tabListContainer.classList.add("slider-scrolling");
      const x = e.pageX - this.tabListContainer.offsetLeft;
      const walk = (x - startX) * 3; //scroll-fast
      this.tabListContainer.scrollLeft = scrollLeft - walk;
    });
  }

  clickHandler(e) {
    const clickedTab = e.target.closest("a");
    if (!clickedTab) return;
    e.preventDefault();
    this.switchTab(clickedTab);
  }

  KeyDownHandler(e) {
    switch (e.key) {
      case "ArrowLeft":
        this.moveLeft();
        break;
      case "ArrowRight":
        this.moveRight();
        break;
      case "Home":
        e.preventDefault();
        this.switchTab(this.tabButtons[0]);
        break;
      case "End":
        e.preventDefault();
        this.switchTab(this.tabButtons[this.tabButtons.length - 1]);
        break;
    }
  }

  moveLeft() {
    const currentTab = this.querySelector(":focus");
    if (!currentTab.parentElement.previousElementSibling) {
      this.switchTab(this.tabButtons[this.tabButtons.length - 1]);
    } else {
      this.switchTab(
        currentTab.parentElement.previousElementSibling.querySelector("a")
      );
    }
  }

  moveRight() {
    const currentTab = this.querySelector(":focus");
    if (!currentTab.parentElement.nextElementSibling) {
      this.switchTab(this.tabButtons[0]);
    } else {
      this.switchTab(
        currentTab.parentElement.nextElementSibling.querySelector("a")
      );
    }
  }

  switchTab(newTab) {
    const activePanelId = newTab.getAttribute("href");
    const activePanel = this.querySelector(activePanelId);
    this.tabButtons.forEach((button) => {
      button.setAttribute("aria-selected", false);
      button.setAttribute("tabindex", "-1");
    });

    this.tabPanels.forEach((panel) => {
      panel.setAttribute("hidden", true);
    });

    activePanel.removeAttribute("hidden", false);

    newTab.setAttribute("aria-selected", true);
    newTab.setAttribute("tabindex", "0");
    newTab.focus();

    this.updateTabIndicator(newTab);
  }
}

customElements.define("tab-container", TabContainer);

class productInfoSlider extends HTMLElement {
  constructor() {
    //super();
    super();
    this.addEventListener("click", this.clickHandler.bind(this));
    this.titleListContainer = this.querySelector(
      ".product-info-titles-container"
    );
    this.contentList = this.querySelector(".product-info-contents");
    this.tabIndicator = this.querySelector(".product-tab-indicator");
    //this.titleListSlider(this.titleList);
    this.contentSlider(this.contentList);
    this.makeScrollable();
  }

  clickHandler(e) {
    const clickedTab = e.target.closest("li[role=presentation]");
    if (!clickedTab) return;
    e.preventDefault();
    this.switchTab(clickedTab);
  }

  makeScrollable() {
    let isScrollable =
      this.titleListContainer.clientWidth < this.titleListContainer.scrollWidth;
    let isDown = false,
      startX,
      scrollLeft;
    if (!isScrollable) return;
    this.titleListContainer.addEventListener("mousedown", (e) => {
      isDown = true;
      this.titleListContainer.classList.add("slider-ready");
      startX = e.pageX - this.titleListContainer.offsetLeft;
      scrollLeft = this.titleListContainer.scrollLeft;
    });

    this.titleListContainer.addEventListener("mouseleave", () => {
      isDown = false;
      this.titleListContainer.classList.remove("slider-ready");
      this.titleListContainer.classList.remove("slider-scrolling");
    });

    this.titleListContainer.addEventListener("mouseup", () => {
      isDown = false;
      this.titleListContainer.classList.remove("slider-ready");
      this.titleListContainer.classList.remove("slider-scrolling");
    });
    this.titleListContainer.addEventListener("mousemove", (e) => {
      if (!isDown) return;
      e.preventDefault();
      this.titleListContainer.classList.add("slider-scrolling");
      const x = e.pageX - this.titleListContainer.offsetLeft;
      const walk = (x - startX) * 3; //scroll-fast
      this.titleListContainer.scrollLeft = scrollLeft - walk;
    });
  }

  updateTabIndicator(activeTab) {
    const tabPosition = activeTab.offsetLeft;
    const tabWidth = activeTab.offsetWidth;
    // Move the indicator to the active tab
    this.tabIndicator.style.cssText = `
      width: ${tabWidth}px; 
      left: ${tabPosition}px;
    `;
    this.scrollToCenter(activeTab);
  }

  switchTab(newTab) {
    const activePanelId = newTab.getAttribute("id");
    const activePanel = this.querySelector(`[data-id="${activePanelId}"]`);
    const slickIndex = activePanel.closest(".slick-slide").dataset.slickIndex;
    $(this.contentList).slick("slickGoTo", slickIndex);
  }

  updateCurrentTitle(id) {
    const currentTitle = document.querySelector(`.product-info-titles #${id}`);
    this.updateTabIndicator(currentTitle);
  }

  scrollToCenter(activeTab) {
    const containerWidth = this.titleListContainer.offsetWidth;
    const elementWidth = activeTab.offsetWidth;

    const containerLeft = this.titleListContainer.getBoundingClientRect().left;
    const elementLeft = activeTab.getBoundingClientRect().left;

    const scrollAmount =
      elementLeft - containerLeft - (containerWidth - elementWidth) / 2;
    // this.tabListContainer.scrollLeft += scrollAmount
    this.titleListContainer.scrollTo({
      left: this.titleListContainer.scrollLeft + scrollAmount,
      behavior: "smooth",
    });
  }

  contentSlider(content) {
    const self_this = this;
    $(content).slick({
      draggable: true,
      accessibility: false,
      centerMode: false,
      slidesToShow: 1,
      arrows: false,
      dots: false,
      swipeToSlide: true,
      infinite: true,
      adaptiveHeight: true,
      mobileFirst: true,
      responsive: [
        {
          breakpoint: 980,
          settings: {
            draggable: false,
          },
        },
      ],
    });

    const activeTitle = this.querySelector(
      `[data-slick-index="${$(content).slick("slickCurrentSlide")}"]`
    ).querySelector(".product-info-content").dataset.id;
    this.updateCurrentTitle(activeTitle);

    $(content).on("afterChange", function (event, slick, current) {
      let id = slick.$slides[current].querySelector(".product-info-content")
        .dataset.id;
      let activeTitle = self_this.querySelector(`.product-info-titles #${id}`);
      self_this.updateCurrentTitle(id);
      self_this.updateTabIndicator(activeTitle);
    });
  }
}

customElements.define("product-info-slider", productInfoSlider);

(() => {
  function updateArrowTop() {
    const section = document.querySelector(
      ".homepage-section.slideshow-section"
    );
    const image = document.querySelector(".mobile_hero_image");
    if (image) {
      const imageHeight = image.getBoundingClientRect().height;
      section.style.cssText = `
      --top: ${imageHeight / 2}px;
    `;
    }
  }
  updateArrowTop();
  window.addEventListener("resize", updateArrowTop);
})();

(function () {
  let activeColorSwatchGroup = document.querySelector(
    ".color-swatch-tab-titles .color-swatch-tab-title.active"
  );
  const colorSwatchGroups = document.querySelectorAll(
    ".color-swatch-tab-titles .color-swatch-tab-title"
  );

  colorSwatchGroups.forEach((colorSwatchGroup) => {
    colorSwatchGroup.addEventListener("click", (event) => {
      event.preventDefault();
      if (event.target.isSameNode(activeColorSwatchGroup)) return;
      colorSwatchGroups.forEach((el) => {
        if (el.classList.contains("active")) el.classList.remove("active");
      });
      event.target.classList.add("active");
      document.querySelectorAll(".color-swatch-tab-content").forEach((el) => {
        if (el.classList.contains("active")) el.classList.remove("active");
      });
      const toBeActiveContainer = document.querySelector(
        `.color-swatch-tab-content${event.target.hash}`
      );
      toBeActiveContainer.classList.add("active");
      activeColorSwatchGroup = event.target;
    });
  });
})();

(function () {
  document.addEventListener("DOMContentLoaded", function () {
    const stickyAddToCartButton = document.querySelector(
      ".product-sticky-button"
    );
    const gallery =
      document.querySelector(
        "#product-content .product-photos.make-product-gallery-sticky"
      ) ||
      document.querySelector("#siteHeader:not(.hide-header-on-pdp-on-scroll)");
    const spacer = document.querySelector("#button-sticky-indicator");
    const mediaQuery = window.matchMedia("(max-width: 980px)");

    if (!stickyAddToCartButton || !spacer) return;

    const updateStickyButton = () => {
      const galleryBottom = gallery
        ? gallery.getBoundingClientRect().bottom
        : null;
      const spacerBottom = spacer.getBoundingClientRect().bottom;
      const stickyButtonHeight = stickyAddToCartButton.offsetHeight;

      if (gallery) {
        if (spacerBottom <= galleryBottom) {
          stickyAddToCartButton.classList.add("open");
          if (gallery.classList.contains("act-position-above")) {
            gallery.style.paddingTop = `${stickyButtonHeight}px`;
          }
        } else {
          stickyAddToCartButton.classList.remove("open");
          gallery.style.paddingTop = "0px";
        }
      } else {
        if (spacerBottom <= 0) {
          stickyAddToCartButton.classList.add("open");
        } else {
          stickyAddToCartButton.classList.remove("open");
        }
      }
    };

    const handleViewportChange = (e) => {
      if (e.matches) {
        window.addEventListener("scroll", updateStickyButton);
        updateStickyButton(); // Initial check on load
      } else {
        window.removeEventListener("scroll", updateStickyButton);
        stickyAddToCartButton.classList.remove("open");
      }
    };

    // Initial check
    handleViewportChange(mediaQuery);

    // Listen for changes in viewport width
    mediaQuery.addEventListener("change", handleViewportChange);
  });
})();

(function () {
  window.addEventListener("DOMContentLoaded", function () {
    // Get the current URL parameters
    const urlParams = new URLSearchParams(window.location.search);

    // Define the parameter to check, for example 'scrollToSection'
    const param = urlParams.get("scrollToSection");

    const productPhotos = document.querySelector(
      "#product-content .product-photos"
    );
    const stickyContainer = document.querySelector("#sticky-container");
    let isFrozen = false;

    if (!productPhotos || !stickyContainer) return;

    const updateStickyClass = () => {
      setTimeout(() => {
        const headerHeight = document.querySelector("header").clientHeight || 0;
        const shouldStickBottom =
          window.innerWidth > 1024 &&
          productPhotos.clientHeight + headerHeight > window.innerHeight;
        productPhotos.classList.toggle("bottom-sticky", shouldStickBottom);
      }, 500);
    };

    const updateStickyScroll = () => {
      const productPhotosRect = productPhotos.getBoundingClientRect();

      if (window.innerWidth < 1025) {
        if (isFrozen) unfreezeScrolling(stickyContainer, productPhotosRect);
        return;
      }
      if (productPhotosRect.bottom > window.innerHeight) {
        if (!isFrozen) {
          freezeScrolling(stickyContainer);
        }
      } else {
        if (isFrozen) unfreezeScrolling(stickyContainer, productPhotosRect);
      }
    };

    const freezeScrolling = (element) => {
      const elementRect = element.getBoundingClientRect();
      element.style.cssText = `position: fixed; top: var(--header); left: ${elementRect.left}px; width: ${elementRect.width}px !important; z-index: 99;`;
      isFrozen = true;
    };

    const unfreezeScrolling = (element, rect) => {
      element.style.cssText = `margin-top: ${window.scrollY}px!important`;
      isFrozen = false;
    };

    const startStickyLogic = () => {
      updateStickyClass();
      updateStickyScroll();

      // Add event listeners
      ["resize", "orientationchange", "scroll"].forEach((event) => {
        window.addEventListener(event, updateStickyScroll);
        if (event !== "scroll")
          window.addEventListener(event, updateStickyClass);
      });
    };

    // If scrollToSection exists, wait for it to be removed before starting sticky logic
    if (param) {
      const interval = setInterval(() => {
        if (!window.location.search.includes("scrollToSection")) {
          clearInterval(interval);
          startStickyLogic(); // Start sticky logic once the parameter is removed
        }
      }, 500);
    } else {
      const interval = setInterval(() => {
        clearInterval(interval);
        startStickyLogic();
      }, 500);
    }
  });
})();

(function () {
  const swatchElement = document.querySelectorAll(".swatch-element");
  const productGallery = document.querySelector(".product-photos");
  if (swatchElement.length === 0 || !productGallery) return;
  swatchElement.forEach((element) => {
    element.addEventListener("click", () => {
      const galleryBottom = productGallery.getBoundingClientRect().bottom;
      const viewportHeight = window.innerHeight;

      if (galleryBottom > viewportHeight) {
        // Scroll the gallery into view
        productGallery.scrollIntoView({ block: "end", behavior: "smooth" });
      }
    });
  });
})();

(function () {
  // Define the custom element class
  class CopyTextElement extends HTMLElement {
    constructor() {
      super();
    }

    connectedCallback() {
      // Find and store the tooltip element within the custom element
      this._tooltip = this.querySelector(".tooltip");

      // Add click event listener for the element
      this.addEventListener("click", () => {
        this.copyText();
      });
    }

    copyText() {
      // Get only the text content excluding the tooltip if tooltip exists
      const textContent = this.childNodes[0].textContent.trim();

      // Copy the text content to the clipboard
      navigator.clipboard
        .writeText(textContent)
        .then(() => {
          if (this._tooltip) {
            this.showTooltip();
          }
        })
        .catch((err) => {
          console.error("Failed to copy text: ", err);
        });
    }

    showTooltip() {
      if (!this._tooltip) return;

      this._tooltip.classList.add("show-tooltip");
      setTimeout(() => {
        this._tooltip.classList.remove("show-tooltip");
      }, 2000); // Tooltip visible for 2 seconds
    }
  }

  // Register the custom element
  customElements.define("copy-text", CopyTextElement);
})();

(function (document, window) {
  function addEventListenerForOkendo() {
    let targetElement = document.querySelector("#product-reviews");

    if (targetElement) {
      let mutationTimeout;
      let isProcessing = false;

      const mutationCallback = (mutationsList, observer) => {
        if (isProcessing) {
          clearTimeout(mutationTimeout);
        }

        isProcessing = true;

        mutationTimeout = setTimeout(() => {
          const filterToggle = document.querySelector(
            "#filter-toggle.oke-w-reviews-filterToggle"
          );
          let reviewFilteringWithActiveVariant = document.querySelector(
            '[data-filter-review-with-variant="true"]'
          );

          if (filterToggle) {
            observer.disconnect();
            handleFilterButton(filterToggle)
              .then(() => replaceText())
              .then(() => makeVisible())
              .then(() => {
                if (reviewFilteringWithActiveVariant) {
                  filterReviewForVariant();
                }
              })
              .then(() => {
                const urlParams = new URLSearchParams(window.location.search);
                const param = urlParams.get("scrollToSection");
                const hasVariant = urlParams.get("variant");
                if (param) {
                  scrollToReviewsSection(param, hasVariant, urlParams);
                }
              })
              .catch((error) => console.error(error));
          }

          isProcessing = false;
        }, 2000);
      };

      const observer = new MutationObserver(mutationCallback);
      const config = { childList: true, attributes: true, subtree: true };
      observer.observe(targetElement, config);
    }
  }

  function replaceText() {
    const filterTitle = document.querySelector(
      ".oke-w-reviews-head .oke-w-reviews-filterToggle .oke-button-text"
    );
    if (filterTitle) {
      filterTitle.textContent = filterTitle.textContent.replace(
        "Filters",
        "Filter by Color"
      );
    }

    const filterLabelTitles = document.querySelectorAll(".oke-w-filter-title");
    filterLabelTitles.forEach((title) => {
      const textNode = title.childNodes[0];
      if (textNode && textNode.nodeType === Node.TEXT_NODE) {
        if (textNode.textContent.includes("Rating")) {
          title.closest(".oke-w-filter").setAttribute("hidden", true);
        }
        if (textNode.textContent.includes("Color")) {
          title.setAttribute("hidden", true);
        }
      }
    });
  }

  function makeVisible() {
    const reviewContainer = document.querySelector("#filter-options");
    if (reviewContainer) reviewContainer.style.display = "block";
    const filterButton = document.querySelector("#filter-toggle");
    if (filterButton) filterButton.style.display = "inline-block";
  }

  const knownPrefixes = ["Velvet", "Outdoor"];

  function extractCoreValue(str) {
    return str
      .replace(/\s*\(.*?\)/g, "")
      .split("/")[0]
      .trim();
  }

  function findClosestMatch(coreValue, allValues) {
    for (const value of allValues) {
      if (coreValue === value) {
        return value;
      }
    }
    for (const prefix of knownPrefixes) {
      const strippedPrefix = coreValue.replace(`${prefix} `, "").trim();
      for (const value of allValues) {
        if (
          strippedPrefix === value ||
          strippedPrefix === value.replace(`${prefix} `, "")
        ) {
          return value;
        }
      }
    }
    return coreValue;
  }

  function cleanString(str, allValues) {
    const coreValue = extractCoreValue(str);
    return findClosestMatch(coreValue, allValues);
  }

  function filterReviewForVariant() {
    const allSelectedColors = document.querySelectorAll(
      `.oke-w-filter-options input[name="Color"]`
    );
    const allValues = Array.from(allSelectedColors).map(
      (checkbox) => checkbox.value
    );

    window.addEventListener("reviewChange", (e) => {
      const filterToggle = document.querySelector(
        "#filter-toggle.oke-w-reviews-filterToggle"
      );
      const cleanTitle = cleanString(e.detail.title, allValues);
      ensureExpanded(filterToggle)
        .then(() => handleFilterOptionClick(cleanTitle, allSelectedColors))
        .catch((error) =>
          console.error("Error in filterReviewForVariant:", error)
        );
    });
  }

  function handleFilterOptionClick(selectedValue, allSelectedColors) {
    const selectedFilterItem = document.querySelector(
      `.oke-w-filter-options input[name="Color"][value="${selectedValue}"]`
    );
    allSelectedColors.forEach((checkbox) => {
      if (checkbox.checked) {
        checkbox.nextElementSibling.click();
      }
    });

    if (selectedFilterItem) {
      selectedFilterItem.setAttribute("inert", "true");
      const label = document.querySelector(
        `label[for="${selectedFilterItem.id}"]`
      );
      if (label) {
        label.click();
      }
    }
  }

  function scrollToReviewsSection(param, hasVariant, urlParams) {
    const filterToggle = document.querySelector(
      "#filter-toggle.oke-w-reviews-filterToggle"
    );
    const reviewFilteringWithActiveVariant = document.querySelector(
      '[data-filter-review-with-variant="true"]'
    );

    if (reviewFilteringWithActiveVariant && param && hasVariant) {
      const currentVariant = document.querySelector("[data-current-variant]")
        .dataset.currentVariant;
      const allSelectedColors = document.querySelectorAll(
        `.oke-w-filter-options input[name="Color"]`
      );
      const allValues = Array.from(allSelectedColors).map(
        (checkbox) => checkbox.value
      );
      const cleanTitle = cleanString(currentVariant, allValues);
      ensureExpanded(filterToggle)
        .then(() => handleFilterOptionClick(cleanTitle, allSelectedColors))
        .catch((error) =>
          console.error("Error in scrollToReviewsSection:", error)
        );
    }

    if (param) {
      const targetSection = document.getElementById(param);
      if (targetSection) {
        targetSection.scrollIntoView({ behavior: "smooth" });
        // Remove scrollToSection from the URL after scrolling
        urlParams.delete("scrollToSection");
        const newUrl = window.location.pathname + "?" + urlParams.toString();
        window.history.replaceState({}, "", newUrl);
      }
    }
  }

  function ensureExpanded(filterToggle) {
    return new Promise((resolve, reject) => {
      if (!filterToggle) {
        return reject("No filterToggle found");
      }

      let isExpanded = filterToggle.getAttribute("aria-expanded");

      if (isExpanded === "false") {
        filterToggle.click();

        const observer = new MutationObserver(() => {
          isExpanded = filterToggle.getAttribute("aria-expanded");
          if (isExpanded === "true") {
            observer.disconnect();
            resolve();
          }
        });
        observer.observe(filterToggle, {
          attributes: true,
          attributeFilter: ["aria-expanded"],
        });
      } else if (isExpanded === "true") {
        resolve();
      }
    });
  }

  function handleFilterButton(filterToggle) {
    return new Promise((resolve, reject) => {
      if (!filterToggle) return reject("No filterToggle found");

      let isExpanded = filterToggle.getAttribute("aria-expanded");

      if (isExpanded === "false") {
        filterToggle.click();

        const observer = new MutationObserver(() => {
          isExpanded = filterToggle.getAttribute("aria-expanded");
          if (isExpanded === "true") {
            filterToggle.click();
            observer.disconnect();
            resolve();
          }
        });
        observer.observe(filterToggle, {
          attributes: true,
          attributeFilter: ["aria-expanded"],
        });
      } else if (isExpanded === "true") {
        filterToggle.click();
        resolve();
      }
    });
  }

  document.addEventListener("oke-rendered", (e) => {
    if (e.detail.widget === "reviews-widget") {
      addEventListenerForOkendo();
    }
  });
})(document, window);

(function () {
  document.addEventListener("galleryReady:covetPics", function (e) {
    const gallery = document.querySelector("covet-pics-widget");
    if (!gallery) return;
    if (e.detail.galleryId != 215621) return;
    // Create a <style> element with gallery CSS
    const galleryStyle = document.createElement("style");
    galleryStyle.textContent = `
      .gallery.grid {
        gap: 5px;
        grid-template-columns: repeat(3, 1fr);
      }
      
      covet-pics-gallery-item.grid-item,
      covet-pics-gallery-item.grid-item.highlighted {
        margin-bottom: 0;
      }
      
      @media (min-width: 800px) {
        .gallery.grid {
          gap: 10px;
          grid-template-columns: repeat(8, 1fr);
        }

        covet-pics-gallery-item.grid-item,
        covet-pics-gallery-item.grid-item.highlighted {
          margin-bottom: 0;
        }
      }
    `;

    // Get the Covet gallery and inject CSS if the element exists

    if (gallery?.shadowRoot) {
      gallery.shadowRoot.appendChild(galleryStyle);
    }

    // Hide the fake gallery
    const fakeGallery = document.querySelector(".covetpics-gallery-fake");
    if (fakeGallery) {
      fakeGallery.style.display = "none";
    }
  });
})();

(() => {
  const toggleButton = document.getElementById("toggleButton");
  if (!toggleButton) return;
  toggleButton.addEventListener("click", function () {
    this.classList.toggle("open");
    document
      .querySelectorAll(".js-filter-wrapper.should-hide")
      .forEach((el) => {
        if (el.classList.contains("hide")) {
          // First remove the hide class to make it visible
          el.classList.remove("hide");

          // Trigger a reflow to ensure the transition starts (forces browser to apply styles before continuing)
          void el.offsetWidth;

          // Then apply the transition to move the element in
          el.classList.add("show");
        } else {
          // When hiding, remove show first for sliding out
          el.classList.remove("show");

          // Add a delay before hiding to allow the slide out animation to occur
          setTimeout(() => {
            el.classList.add("hide");
          }, 300); // Delay must match the CSS transition duration
        }
      });
  });
})();

document.querySelectorAll(".product-main-image").forEach((wrapper) => {
  const img = wrapper.querySelector(".product__image");
  const altText = img.getAttribute("alt");
  wrapper.setAttribute("data-alt", altText);
});

/*============================================================================
Registering Index Sections
==============================================================================*/

$(document).ready(function () {
  var sections = new theme.Sections();
  sections.register("header-section", theme.Header);
  sections.register("slideshow-section", theme.Slideshow);
  sections.register("new-slideshow", theme.newSlideshow);
  sections.register("carousel-section", theme.FeaturedCollection);
  sections.register("product-section", theme.Product);
  sections.register("instagram", theme.Instagram);
  sections.register("mobile-navigation", theme.mobileNav);
  sections.register("collection-section", theme.Collection);
  sections.register("map", theme.Maps);
  sections.register("scrolling-announcements", theme.InfoSlider);
  sections.register("featured-content", theme.FeatContent);
  sections.register("parallax-section", theme.Parallax);
});

/*============================================================================
Global Events
==============================================================================*/
$(document).ready(function () {
  var smallMobile = window.matchMedia("(max-width: 465px)");
  var mobile = window.matchMedia("(max-width: 740px)");
  var tablet = window.matchMedia("(max-width: 980px) and (min-width: 741px)");
  var desktop = window.matchMedia("(min-width: 981px)");

  if (smallMobile.matches) {
    Events.trigger("mediaquery:smallMobile");
  }

  if (mobile.matches) {
    Events.trigger("mediaquery:mobile");
  }

  if (tablet.matches) {
    Events.trigger("mediaquery:tablet");
  }

  if (desktop.matches) {
    Events.trigger("mediaquery:desktop");
  }

  window.addEventListener("resize", function () {
    if (smallMobile.matches) {
      Events.trigger("mediaquery:smallMobile");
    }

    if (mobile.matches) {
      Events.trigger("mediaquery:mobile");
    }

    if (tablet.matches) {
      Events.trigger("mediaquery:tablet");
    }

    if (desktop.matches) {
      Events.trigger("mediaquery:desktop");
    }
  });

  document.addEventListener("shopify:section:select", function (event) {
    Events.trigger("editor:section:select", event);
  });

  document.addEventListener("shopify:section:deselect", function (event) {
    Events.trigger("editor:section:deselect", event);
  });

  document.addEventListener("shopify:section:load", function (event) {
    Events.trigger("editor:section:load", event);
  });

  document.addEventListener("shopify:section:unload", function (event) {
    Events.trigger("editor:section:unload", event);
  });

  document.addEventListener("shopify:block:select", function (event) {
    Events.trigger("editor:block:select", event);
  });

  document.addEventListener("shopify:block:deselect", function (event) {
    Events.trigger("editor:block:deselect", event);
  });

  document.addEventListener("lazyloaded", function (e) {
    Events.trigger("lazyLoad:complete");
  });
});
