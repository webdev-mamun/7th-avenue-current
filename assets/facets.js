function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
}

function setCookie(name, value, days) {
  const date = new Date();
  date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
  const expires = `expires=${date.toUTCString()}`;
  document.cookie = `${name}=${value}; ${expires}; path=/`;
}

function clearCookie(name) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}

class FacetFiltersForm extends HTMLElement {
  constructor() {
    super();
    
    this.debouncedOnSubmit = debounce((event) => {
      this.onSubmitHandler(event);
    }, 500);
    
    const facetForm = this.querySelector('form');
    facetForm.addEventListener('input', this.debouncedOnSubmit.bind(this));
  }

  connectedCallback() {
    FacetFiltersForm.init();
  }

  static init() {
    document.querySelectorAll('.active-filter-item').forEach((elm) => {
      elm.closest('.js-filter-wrapper').classList.remove('open');
      FacetFiltersForm.handleButtonClick(elm);
    });
    document.querySelectorAll('.filter-sort_by .filter-item').forEach(FacetFiltersForm.handleFilterItem);
    document.querySelector('.mobile-filter-opener').addEventListener('click', FacetFiltersForm.handleMobileFilterClick);
    document.querySelector('.mobile-filter-header button').addEventListener('click', FacetFiltersForm.closeFilterDrawer);

    const storedColors = getCookie('selected_color') ? JSON.parse(getCookie('selected_color')) : [];
    // if(storedColors.length === 0){
    //   console.log('need to check really 0 or not set yet');
    // }
    const firstValue = FacetFiltersForm.processString(storedColors[0]).replace(' ', '-').toLowerCase();
    if(storedColors.length > 1){
      const swatchesEl = document.querySelectorAll('.color__swatch')
      
      swatchesEl.forEach(el => {
        const swatch = el.querySelector(`[data-option-name*="${firstValue}"]`);
        if(swatch) swatch.click();
      });

      FacetFiltersForm.setColorOrder(swatchesEl);
    }
  }

  static handleMobileFilterClick() {
    document.querySelector('.mobile-filter').classList.toggle('open');
  }

  static openFilterDrawer() {
    document.querySelector('.mobile-filter').classList.add('open');
  }

  static closeFilterDrawer() {
    if(document.querySelector('.mobile-filter').classList.contains('open')) document.querySelector('.mobile-filter').classList.remove('open');
  }

  static handleButtonClick(elm) {
    const handleClick = (event) => {
      if (!event.currentTarget.closest('.js-filter-wrapper').classList.contains('open')) {
        FacetFiltersForm.openFilterItem(event);
      } else {
        event.currentTarget.closest('.js-filter-wrapper').classList.remove('open');
      }
      FacetFiltersForm.closeFilterItem(event);
    };

    elm._handleClick = handleClick;  // Store the handler function on the element
    elm.addEventListener('click', handleClick);
  }

  static removeButtonClickListener(elm) {
    if (elm._handleClick) {
      elm.removeEventListener('click', elm._handleClick);
      delete elm._handleClick;  // Clean up the reference
    }
  }


  static handleFilterItem(elm) {
    elm.addEventListener('click', FacetFiltersForm.changeFilterValue);
  }
  

  static openFilterItem(event) {
    event.currentTarget.closest('.js-filter-wrapper').classList.add('open');
  }

  static toggleFilterItem(element) {
    element.classList.toggle('open');
    //FacetFiltersForm.showLoader();
  }

  static closeFilterItem(event) {
    document.querySelectorAll('.js-filter-wrapper').forEach((elm) => {
      if(elm !== event.currentTarget.closest('.js-filter-wrapper')){
        elm.classList.remove('open');
      }
    })
  }
  

  static changeFilterValue(event) {
    event.currentTarget.closest('.js-filter-wrapper').querySelector('select').value = event.currentTarget.dataset.value;
    event.currentTarget.closest('form').dispatchEvent(new Event('input', { bubbles: true }));
    const element = event.target.closest('.js-filter-wrapper');
    FacetFiltersForm.toggleFilterItem(element);
    
  }
  
  static setListeners() {
    const onHistoryChange = (event) => {
      const searchParams = event.state ? event.state.searchParams : FacetFiltersForm.searchParamsInitial;
      if (searchParams === FacetFiltersForm.searchParamsPrev) return;
      FacetFiltersForm.renderPage(searchParams, null, false);
    };
    window.addEventListener('popstate', onHistoryChange);
  }

  static updateURLHash(searchParams) {
    console.log(searchParams, 'searchParams')
    history.pushState({ searchParams }, '', `${window.location.pathname}${searchParams && '?'.concat(searchParams)}`);
  }

  static getSections() {
    return [
      {
        section: document.getElementById('collection-products').dataset.sectionId,
      },
    ];
  }
  
  // createSearchParams(form) {
  //   const formData = new FormData(form);
  //   return new URLSearchParams(formData).toString();
  // }

  onSubmitForm(searchParams, event) {
    FacetFiltersForm.renderPage(searchParams, event);
  }
  
  onSubmitHandler(event) {
    event.preventDefault();
    FacetFiltersForm.toggleFilterItem(event.target.closest('form').querySelector('.js-filter-wrapper'));
    const deviceId = event.target.dataset.deviceId;
    const secondInput = event.target.closest('form').querySelector(`input#${deviceId}`);
    
    if(secondInput != null){
      secondInput.checked = event.target.checked;
    }
    const isColorFilter = event.target.name.includes('color')
    if(isColorFilter) {
      const value = event.target.value
      const isSelected = event.target.checked
      const storedColors = getCookie('selected_color');
      
      if(!storedColors) {
        if(isSelected) {
          setCookie('selected_color', JSON.stringify([event.target.value]), 30)
        }
      } else {
        const storedColorsArray = JSON.parse(storedColors)
        if(!isSelected) {
          const storedColorUpadte = storedColorsArray.filter(v => v !== value)
          setCookie('selected_color', JSON.stringify(storedColorUpadte))
        } else {
          if(storedColorsArray.includes(value)) {
            const storedColorUpadte = storedColorsArray.filter(v => v !== value)
            setCookie('selected_color', JSON.stringify([event.target.value, ...storedColorUpadte]))
          } else {
            setCookie('selected_color', JSON.stringify([event.target.value, ...storedColorsArray]))
          }
        }
      }
    }
    const searchParams = this.createSearchParams(event.target.closest('form'));
    this.onSubmitForm(searchParams, event);
  }

  createSearchParams(form) {
    // Collect form data
    const formData = new FormData(form);
    const params = new URLSearchParams();

    // Use a Map to keep track of unique parameters by their key
    const uniqueParams = new Map();

    // Iterate over the form data entries
    for (const [key, value] of formData.entries()) {
        const paramKey = `${key}=${value}`;

        // Add the parameter to the Map if it's not already present
        if (!uniqueParams.has(paramKey)) {
            uniqueParams.set(paramKey, value);
            params.append(key, value);
        }
    }

    return params.toString();
}

static renderPage(searchParams, event, updateURLHash = true) {
  document.querySelectorAll('.active-filter-item').forEach(FacetFiltersForm.removeButtonClickListener);
  
  FacetFiltersForm.searchParamsPrev = searchParams;
  const sections = FacetFiltersForm.getSections();
  sections.forEach((section) => {
    const url = `${window.location.pathname}?section_id=${section.section}&${searchParams}`;
    const filterDataUrl = (element) => element.url === url;
    FacetFiltersForm.filterData.some(filterDataUrl) ? FacetFiltersForm.renderSectionFromCache(filterDataUrl, event) : FacetFiltersForm.renderSectionFromFetch(url, event);
  });

  if (updateURLHash) FacetFiltersForm.updateURLHash(searchParams);
}


  static showLoader() {
    document.querySelector('.product-loop-loader').classList.add('show');
  }

  static removeLoader() {
    document.querySelector('.product-loop-loader').classList.remove('show');
  }
  
  static renderSectionFromFetch(url, event) {
    
    fetch(url)
      .then((response) => response.text())
      .then((responseText) => {
        const html = responseText;
        FacetFiltersForm.filterData = [...FacetFiltersForm.filterData, { html, url }];
        FacetFiltersForm.renderFilters(html, event);
        FacetFiltersForm.renderProductGridContainer(html);
        FacetFiltersForm.renderHerder(html);
        FacetFiltersForm.renderPagination(html);
        const filterFormSubmit = new Event("filterFormSubmit");
        window.dispatchEvent(filterFormSubmit);
      });
  }

  static processString(str) {
    if(!str) return ""
    const regex = /^(\d+_)(.*)/;
    const match = str.match(regex);
    if (match) {
      return match[2];
    } else {
      return str;
    }
  }

  static renderSectionFromCache(filterDataUrl, event) {
    const html = FacetFiltersForm.filterData.find(filterDataUrl).html;
    FacetFiltersForm.renderFilters(html, event);
    FacetFiltersForm.renderProductGridContainer(html);
    FacetFiltersForm.renderHerder(html);
    FacetFiltersForm.renderPagination(html);
    const filterFormSubmit = new Event("filterFormSubmit");
    window.dispatchEvent(filterFormSubmit);
  }

  static renderProductGridContainer(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html')
    
    const storedColors = getCookie('selected_color') ? JSON.parse(getCookie('selected_color')) : [];
    const firstValue = FacetFiltersForm.processString(storedColors[0]).replace(' ', '-').toLowerCase();

    if(storedColors.length > 1){
      const currentlySelectedSwatchs = doc.querySelectorAll('.color__swatch li.open')
      
      currentlySelectedSwatchs.forEach(_ => {
        if(storedColors.length > 1) _.classList.remove('open')
      })
      
      const swatchesEl = doc.querySelectorAll('.color__swatch')
      swatchesEl.forEach(el => {
        const swatches = el.querySelectorAll('li')
        swatches.forEach((_, i) => {
          const name = _.dataset.optionName
          if(name.includes(firstValue)) {
            _.classList.add('open')
          }
        })
      })
      FacetFiltersForm.setColorOrder(swatchesEl)
    }
    document.getElementById('sofa-collection').innerHTML = doc.getElementById('sofa-collection').innerHTML;
    //FacetFiltersForm.removeLoader();
  }

  static setColorOrder(swatchesEl) {
    const storedColors = getCookie('selected_color') ? JSON.parse(getCookie('selected_color')) : [];
    if(storedColors.length > 1) {
      storedColors.forEach((optionName, i) => {
        let nameValue = FacetFiltersForm.processString(optionName).replace(' ', '-').toLowerCase()
        swatchesEl.forEach(el => {
          const swatches = el.querySelectorAll('li')
          swatches.forEach((_) => {
            const name = _.dataset.optionName
            if(name.includes(nameValue)) {
              _.style.setProperty('--order', i+1)
            }
          })
        })
      })
    }
  }


  static renderFilters(html, event) {
    const parsedHTML = new DOMParser().parseFromString(html, 'text/html');
    
    const facetDetailsElements = parsedHTML.querySelectorAll('.js-filter-wrapper');
    const filterItems = parsedHTML.querySelectorAll('.filter-item')
    filterItems.forEach(item => {
      const input = item.querySelector('input')
      if(input) {
        const id = input.getAttribute('id')

        const el = document.getElementById(id)
        if(input.checked) {
          el.checked = true
        } else {
          el.checked = false
        }
        if(input.disabled) {
          el.disabled = true
          el.closest('.facets__label').classList.add('disabled')
        } else {
          el.disabled = false
          el.closest('.facets__label').classList.remove('disabled')
        }
      }
    })

    FacetFiltersForm.init();
    FacetFiltersForm.renderActiveFacets(parsedHTML);

  
  }

  static renderActiveFacets(html) {
    const activeFacetElementSelectors = ['.active-facets'];
    activeFacetElementSelectors.forEach((selector) => {
      const activeFacetsElement = html.querySelector(selector);
      if (!activeFacetsElement) return;
      document.querySelector(selector).innerHTML = activeFacetsElement.innerHTML;
    });

    //FacetFiltersForm.toggleActiveFacets(false);
  }

  onActiveFilterClick(event) {
    event.preventDefault();
    // FacetFiltersForm.toggleActiveFacets();
    const facetLink = event.target.closest('.active-facets__button');
    const isClearAll = facetLink.hasAttribute('data-clear-all');
    if(facetLink) {
      if(isClearAll) {
        clearCookie('selected_color')
      } else {
        const color = facetLink.dataset.value;
        const storedColors = getCookie('selected_color');
        if(storedColors){
          const storedColorsArray = JSON.parse(storedColors)
          const storedColorUpadte = storedColorsArray.filter(v => v !== color)
          setCookie('selected_color', JSON.stringify(storedColorUpadte))
        }
      }
    }
    
    const url = event.currentTarget.href.indexOf('?') == -1 ? '' : event.currentTarget.href.slice(event.currentTarget.href.indexOf('?') + 1);
    FacetFiltersForm.renderPage(url);
    FacetFiltersForm.closeFilterItem(event);
  }

  static renderHerder(html) {
    const parsedHTML = new DOMParser().parseFromString(html, 'text/html');
    document.querySelector('#collection-header').innerHTML = parsedHTML.querySelector('#collection-header').innerHTML;
  }

  static renderPagination(html) {
    const parsedHTML = new DOMParser().parseFromString(html, 'text/html');
    console.log(parsedHTML.querySelector('#pagination').innerHTML);
    document.querySelector('#pagination').innerHTML = parsedHTML.querySelector('#pagination').innerHTML;
    publish(PUB_SUB_EVENTS.facetFormChange, {});
  }
}
  
FacetFiltersForm.filterData = [];
FacetFiltersForm.searchParamsInitial = window.location.search.slice(1);
FacetFiltersForm.searchParamsPrev = window.location.search.slice(1);
customElements.define('facet-filters-form', FacetFiltersForm);
FacetFiltersForm.setListeners();

class FacetRemove extends HTMLElement {
  constructor() {
    super();
    const facetLink = this.querySelector('a');
    facetLink.setAttribute('role', 'button');
    facetLink.addEventListener('click', this.closeFilter.bind(this));
    facetLink.addEventListener('keyup', (event) => {
      event.preventDefault();
      if (event.code.toUpperCase() === 'SPACE') this.closeFilter(event);
    });
  }

  closeFilter(event) {
    event.preventDefault();
    const form = this.closest('facet-filters-form') || document.querySelector('facet-filters-form');
    form.onActiveFilterClick(event);
  }
}

customElements.define('facet-remove', FacetRemove);
