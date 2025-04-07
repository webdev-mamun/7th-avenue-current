if (!customElements.get('custom-tooltip')) {
  customElements.define('custom-tooltip', class extends HTMLElement {
    constructor() {
      super();
      this.target = this.querySelector('[data-tooltip-target]');
      this.tooltip = this.querySelector('[data-tooltip]');
      this.placement = this.getAttribute('placement') || 'top';

      this.hoverTimeout = null;
      this.enter = this.enter.bind(this);
      this.leave = this.leave.bind(this);
      this.updatePosition = this.updatePosition.bind(this);
      this.isTooltipVisible = false;
    }

    connectedCallback() {
      this.target.addEventListener('mouseenter', this.enter);
      this.target.addEventListener('mouseleave', this.leave);
      this.tooltip.addEventListener('mouseenter', this.enter);
      this.tooltip.addEventListener('mouseleave', this.leave);
      window.addEventListener('scroll', this.updatePosition, true);
      window.addEventListener('resize', this.updatePosition);
    }

    disconnectedCallback() {
      this.target.removeEventListener('mouseenter', this.enter);
      this.target.removeEventListener('mouseleave', this.leave);
      this.tooltip.removeEventListener('mouseenter', this.enter);
      this.tooltip.removeEventListener('mouseleave', this.leave);
      window.removeEventListener('scroll', this.updatePosition, true);
      window.removeEventListener('resize', this.updatePosition);
    }

    enter() {
      clearTimeout(this.hoverTimeout);
      this.tooltip.style.display = 'block';
      this.tooltip.style.visibility = 'hidden'; // prepare for measurement
      this.isTooltipVisible = true;
      this.updatePosition();
    }

    leave() {
      this.hoverTimeout = setTimeout(() => {
        this.tooltip.style.display = 'none';
        this.isTooltipVisible = false;
      }, 200);
    }

    updatePosition() {
      if (!this.isTooltipVisible) return;

      const targetRect = this.target.getBoundingClientRect();
      this.tooltip.style.display = 'block';
      this.tooltip.style.visibility = 'hidden';
      this.tooltip.style.position = 'fixed';

      const tooltipRect = this.tooltip.getBoundingClientRect();
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      const scrollX = window.scrollX || document.documentElement.scrollLeft;

      // Get available space
      const space = {
        top: targetRect.top,
        bottom: window.innerHeight - targetRect.bottom,
        left: targetRect.left,
        right: window.innerWidth - targetRect.right
      };

      const placements = [
        this.placement,        // preferred
        'top', 'bottom', 'right', 'left', // fallbacks
        'top-left', 'top-right', 'bottom-left', 'bottom-right'
      ];

      const placement = this.resolvePlacement(this.placement, targetRect, tooltipRect, space);

      const { top, left } = this.calculatePosition(placement, targetRect, tooltipRect, scrollX, scrollY);

      this.tooltip.style.top = `${top}px`;
      this.tooltip.style.left = `${left}px`;
      this.tooltip.style.visibility = 'visible';
    }

    resolvePlacement(preferred, targetRect, tooltipRect, space) {
  const isEnough = (side, size) => space[side] >= size + 8;

  const fallbackMap = {
    'top-right': ['top-left', 'top', 'bottom-right', 'bottom-left', 'bottom'],
    'top-left': ['top-right', 'top', 'bottom-left', 'bottom-right', 'bottom'],
    'bottom-right': ['bottom-left', 'bottom', 'top-right', 'top-left', 'top'],
    'bottom-left': ['bottom-right', 'bottom', 'top-left', 'top-right', 'top'],
    'top': ['bottom', 'top-left', 'top-right', 'bottom-left', 'bottom-right'],
    'bottom': ['top', 'bottom-left', 'bottom-right', 'top-left', 'top-right'],
    'left': ['right'],
    'right': ['left'],
  };

  const fitsMap = {
    'top': () => isEnough('top', tooltipRect.height),
    'bottom': () => isEnough('bottom', tooltipRect.height),
    'left': () => isEnough('left', tooltipRect.width),
    'right': () => isEnough('right', tooltipRect.width),
    'top-left': () => isEnough('top', tooltipRect.height),
    'top-right': () => isEnough('top', tooltipRect.height),
    'bottom-left': () => isEnough('bottom', tooltipRect.height),
    'bottom-right': () => isEnough('bottom', tooltipRect.height),
  };

  if (fitsMap[preferred]?.()) return preferred;

  const fallbacks = fallbackMap[preferred] || [];

  return fallbacks.find(f => fitsMap[f]?.()) || preferred;
}


    calculatePosition(placement, targetRect, tooltipRect, scrollX, scrollY) {
  let top = 0, left = 0;

  switch (placement) {
    case 'top':
      top = targetRect.top + scrollY - tooltipRect.height - 8;
      left = targetRect.left + scrollX + (targetRect.width - tooltipRect.width) / 2;
      break;
    case 'top-left':
      top = targetRect.top + scrollY - tooltipRect.height - 8;
      left = targetRect.left + scrollX;
      break;
    case 'top-right':
      top = targetRect.top + scrollY - tooltipRect.height - 8;
      left = targetRect.right + scrollX - tooltipRect.width;
      break;
    case 'bottom':
      top = targetRect.bottom + scrollY + 8;
      left = targetRect.left + scrollX + (targetRect.width - tooltipRect.width) / 2;
      break;
    case 'bottom-left':
      top = targetRect.bottom + scrollY + 8;
      left = targetRect.left + scrollX;
      break;
    case 'bottom-right':
      top = targetRect.bottom + scrollY + 8;
      left = targetRect.right + scrollX - tooltipRect.width;
      break;
    case 'left':
      top = targetRect.top + scrollY + (targetRect.height - tooltipRect.height) / 2;
      left = targetRect.left + scrollX - tooltipRect.width - 8;
      break;
    case 'right':
      top = targetRect.top + scrollY + (targetRect.height - tooltipRect.height) / 2;
      left = targetRect.right + scrollX + 8;
      break;
  }

  // ✅ Clamp values so tooltip stays inside viewport
  const padding = 8; // space from edge
  const maxTop = window.innerHeight + scrollY - tooltipRect.height - padding;
  const maxLeft = window.innerWidth + scrollX - tooltipRect.width - padding;

  top = Math.max(scrollY + padding, Math.min(top, maxTop));
  left = Math.max(scrollX + padding, Math.min(left, maxLeft));

  return { top, left };
}

  });
}
