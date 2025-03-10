class CustomTabs extends HTMLElement {
    constructor() {
        super();
    }
    connectedCallback() {
        this.tabButtons = this.querySelectorAll('.custom-tab-button');
        this.tabContents = this.querySelectorAll('.custom-tab-content');
        this.maxWidth = 0;
        this.tabButtons.forEach((button, index) => {
          this.maxWidth = Math.max(this.maxWidth, button.offsetWidth);
          button.addEventListener('click', () => this.openTab(index));
          button.addEventListener('keydown', (e) => this.handleKeydown(e, index));
        });
      
        this.tabButtons.forEach((button) => {
          button.style.width = `${this.maxWidth}px`;
        });
        
    }
    openTab(index) {
        this.tabButtons.forEach((button, i) => {
            button.classList.toggle('active', i === index);
            button.setAttribute('aria-selected', i === index);
            button.tabIndex = i === index ? 0 : -1;
            this.tabContents[i].classList.toggle('active', i === index);
        });
        this.tabButtons[index].focus();
    }
    handleKeydown(e, index) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
            let newIndex = index;
            if (e.key === 'ArrowRight') {
                newIndex = (index + 1) % this.tabButtons.length;
            } else if (e.key === 'ArrowLeft') {
                newIndex = (index - 1 + this.tabButtons.length) % this.tabButtons.length;
            }
            this.openTab(newIndex);
        }
    }
}
customElements.define('custom-tabs', CustomTabs);