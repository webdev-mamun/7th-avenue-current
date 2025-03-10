if (!customElements.get("cart-page-note")) {
  customElements.define(
    "cart-page-note",
    class CartPageNote extends HTMLElement {
      constructor() {
        super();
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

