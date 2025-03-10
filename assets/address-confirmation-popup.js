function debounce(fn, wait) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }
  
class ThankYouPopup extends HTMLElement {
  constructor() {
    super();
    this.sessionKey = 'isThankYouPopupClosed';
    this.sessionvalue = 'yes';
    this.debouncedOnButtonClicked = debounce((event) => {
        this.buttonClickHandler(event)
      }, 500);
    this.debouncedOnOutsideClicked = debounce((event) => {
        this.outsideClickHandler(event);
      }, 500);
    
    this.debouncedOnDocumentLoad = debounce((event) => {
        this.windowLoadHandler(event);
      }, 500);
    this.querySelector('button').addEventListener('click', this.debouncedOnButtonClicked.bind(this));
    window.addEventListener('click', this.debouncedOnOutsideClicked.bind(this));
    document.addEventListener('DOMContentLoaded', this.debouncedOnDocumentLoad.bind(this));
  } 

  outsideClickHandler(e) {
    const isOutside = !e.target.closest('.thank-you-popup-main');
    this.setSession();
    if(isOutside) this.popupClose();
  }

  buttonClickHandler(e) {
    this.setSession();
    this.popupClose();
  }
    
  popupClose() {
    if(this.classList.contains('active')) this.classList.remove('active');
  }

  setSession() {
    sessionStorage.setItem(this.sessionKey, this.sessionvalue);
  }

  getSession() {
    return sessionStorage.getItem(this.sessionKey) == this.sessionvalue;
  }
  
  windowLoadHandler() {
    const sessionKeyFound = this.getSession();
    if(!sessionKeyFound) this.popupOpen();
  }

  popupOpen() {
    this.classList.add('active');
  }
}

customElements.define("thank-you-popup", ThankYouPopup);