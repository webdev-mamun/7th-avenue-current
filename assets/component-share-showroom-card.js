if (!customElements.get('share-showroom-card')) {
    customElements.define('share-showroom-card', class ShareShowroomCard extends HTMLElement {
      constructor() {
        super();
        this.tooltip = this.querySelector('[tooltip]');
        this.addEventListener('click', () => this.onShareClick());
        window.addEventListener('resize', debounce(() => this.placeTooltip(), 200));
      }
  
      onShareClick() {
        const shareUrl = this.generateShareUrl();
        this.copyTextToClipboard(shareUrl);
      }
  
      copyTextToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
          this.placeTooltip();
          this.displayTooltip();
        }).catch(error => {
          console.error('Failed to copy to clipboard:', error);
        });
      }
  
      generateShareUrl() {
        const currentUrl = window.location.href;
        const urlObject = new URL(currentUrl);
        const searchParams = new URLSearchParams(urlObject.search);
        const showroomId = this.dataset.showroomId;
        if (showroomId) {
          searchParams.set('find-showroom', showroomId);
        }
        return `${urlObject.origin}${urlObject.pathname}?${searchParams.toString()}${urlObject.hash}`;
      }
  
      displayTooltip() {
        this.tooltip.classList.add('share-showroom-card__tooltip--visible');
        setTimeout(() => {
          this.tooltip.classList.remove('share-showroom-card__tooltip--visible');
        }, 1000);
      }
  
      placeTooltip() {
        const gap = 8;
        this.tooltip.style.position = 'absolute';
        this.tooltip.style.left = '-9999px';
        this.tooltip.style.visibility = 'visible';
        const tooltipWidth = this.tooltip.offsetWidth;
        this.tooltip.style.position = '';
        this.tooltip.style.visibility = '';
        this.tooltip.style.left = '';
  
        const elementRect = this.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
  
        const leftOverflow = elementRect.left - tooltipWidth - gap < 0;
        const rightOverflow = elementRect.right + tooltipWidth + gap > viewportWidth;
  
        if (leftOverflow && !rightOverflow) {
          this.tooltip.classList.remove('share-showroom-card__tooltip--left');
          this.tooltip.classList.add('share-showroom-card__tooltip--right');
        } else if (!leftOverflow && rightOverflow) {
          this.tooltip.classList.remove('share-showroom-card__tooltip--right');
          this.tooltip.classList.add('share-showroom-card__tooltip--left');
        } else {
          this.tooltip.classList.remove('share-showroom-card__tooltip--left');
          this.tooltip.classList.add('share-showroom-card__tooltip--right');
        }
      }
    });
  }
 
