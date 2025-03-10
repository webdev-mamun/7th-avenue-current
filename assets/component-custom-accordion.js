if (!customElements.get('custom-accordion')) {
  customElements.define(
    'custom-accordion',
    class CustomAccordion extends HTMLElement {
      constructor() {
        super();
      }

      connectedCallback() {
        this.items = this.querySelectorAll('.custom-accordion-item');

        this.items.forEach((item) => {
          const button = item.querySelector('button');
          const content = item.querySelector('.custom-accordion-content');

          button.addEventListener('click', () => {
            this.toggleItem(item, button, content);
          });
        });
      }

      toggleItem(selectedItem, selectedButton, selectedContent) {
        const isExpanded = selectedButton.getAttribute('aria-expanded') === 'true';
        
        selectedButton.setAttribute('aria-expanded', !isExpanded);
        selectedContent.setAttribute('aria-hidden', isExpanded);
        
        this.items.forEach((item) => {
          if (item !== selectedItem) {
            const button = item.querySelector('button');
            const content = item.querySelector('.custom-accordion-content');
            button.setAttribute('aria-expanded', 'false');
            content.setAttribute('aria-hidden', 'true');
          }
        });
      }
    }
  );
}

