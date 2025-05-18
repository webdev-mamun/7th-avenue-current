if (!customElements.get('showroom-items')) {
  customElements.define('showroom-items',
    class ShowroomItems extends HTMLElement {
      constructor() {
        super();
        this.filterWrapper = this.querySelector('.showroom-sort-option-scroller');
        this.sectionId = this.getAttribute('id');
        this.showroomElements = [...this.querySelectorAll('[data-showroom]')];
        this.sortButtons = [...this.querySelectorAll('[data-sort-by]')];
        this.calendlyButtons = [...this.querySelectorAll('[data-calendly-opener]')];
        this.cachedDistances = this.getCookie('showroomGeoDistances_v1') || [];

        this.handleSortButtonClick = this.handleSortButtonClick.bind(this);
        this.handleCalendlyClick = this.handleCalendlyClick.bind(this);

        const urlParams = new URLSearchParams(window.location.search);
        const showroomParam = urlParams.get('find-showroom'); // Get the single parameter
        this.selectedShowroomHandles = showroomParam ? showroomParam.split(',').map(handle => handle.trim()) : [];

        if (this.selectedShowroomHandles.length > 0) {
          this.initializeForYouButton();
        } else {
          this.activeButton = this.querySelector('[data-sort-by].active') || this.sortButtons[0];
          this.activeSortOption = this.activeButton?.dataset.sortBy || this.dataset.defaultSortBy || 'sort_by_location';
        }

        try {
          this.showroomData = JSON.parse(this.querySelector('[data-showroom-info]').textContent.trim());
        } catch (error) {
          console.error('Failed to parse showroom data:', error);
          this.showroomData = [];
        }

        this.sortHandlers = {
          sort_by_alphabetical: this.sortByTitle.bind(this),
          sort_by_location: this.sortByDistance.bind(this),
          sort_by_state: this.filterByState.bind(this),
          sort_by_find_showroom: this.filterBySelectedShowrooms.bind(this)
        };

        this.attachEventListeners();
      }

      initializeForYouButton() {
        const activeButton = this.sortButtons.find(el => el.classList.contains('active'));
        if (activeButton) activeButton.classList.remove('active');

        const forYouButton = document.createElement('button');
        forYouButton.classList.add('showroom-sort-option', 'active');
        forYouButton.dataset.sortBy = 'sort_by_find_showroom';
        forYouButton.textContent = this.selectedShowroomHandles.length > 1
          ? `Only for you (${this.selectedShowroomHandles.length})`
          : 'Only for you';

        this.querySelector('.showroom-sort-option-wrapper').prepend(forYouButton);

        this.activeButton = forYouButton;
        this.activeSortOption = 'sort_by_find_showroom';
        this.sortButtons.push(forYouButton);
        forYouButton.addEventListener('click', this.handleSortButtonClick);

        const url = new URL(window.location);
        const params = new URLSearchParams(url.search);
        params.delete('find-showroom');
        url.search = params.toString();
        history.pushState({}, document.title, url.toString());
      }

      attachEventListeners() {
        this.manageEventListeners(this.sortButtons, 'click', this.handleSortButtonClick, true);
        this.manageEventListeners(this.calendlyButtons, 'click', this.handleCalendlyClick, true);
      }

      async connectedCallback() {
        await this.sortHandlers[this.activeSortOption]?.();
        this.ensureActiveButtonVisible();
      
        if (this.selectedShowroomHandles.length > 0 && this.sectionId) {
          const targetElement = document.getElementById(this.sectionId);
          if (targetElement) {
            setTimeout(() => {
              requestAnimationFrame(() => this.scrollToSection(this.sectionId));
            }, 1500);
          }
        }
      }

      disconnectedCallback() {
        this.manageEventListeners(this.sortButtons, 'click', this.handleSortButtonClick, false);
        this.manageEventListeners(this.calendlyButtons, 'click', this.handleCalendlyClick, false);
      }

      handleSortButtonClick(event) {
        const button = event.target;
        if (this.activeButton?.isSameNode(button)) return;

        const sortBy = button.dataset.sortBy;
        const sortOption = button.dataset.sortOption;
        this.sortHandlers[sortBy]?.(sortOption);
        this.setActiveSortButton(button);
        this.ensureActiveButtonVisible();
      }

      handleCalendlyClick(event) {
        this.openCalendlyPopup(event);
        this.trackScheduleEvent(event);
      }

      openCalendlyPopup(event) {
        const button = event.target;
        const url = button.href;
        if (!button || !url) return;
        event.preventDefault();
        if (typeof Calendly !== 'undefined') {
          Calendly.initPopupWidget({ url });
        } else {
          console.warn('Calendly widget not loaded');
        }
      }

      setActiveSortButton(button) {
        this.sortButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        this.activeButton = button;
        this.activeSortOption = button.dataset.sortBy;
      }

      async filterBySelectedShowrooms() {
        if (this.selectedShowroomHandles.length === 0) return;
        if (this.selectedShowroomHandles.length > 1) {
          await this.sortByDistance();
        }

        const matchingShowrooms = this.showroomElements.filter(el =>
          this.selectedShowroomHandles.includes(el.dataset.handle)
        );

        this.showroomElements.forEach(el => {
          el.hidden = !matchingShowrooms.includes(el);
        });

        if (matchingShowrooms.length === 0) {
          console.warn('No showrooms found for handles:', this.selectedShowroomHandles);
          await this.sortByDistance();
        }
      }

      sortByTitle() {
        this.sortShowrooms(el => {
          const handle = el.dataset.handle;
          const data = this.showroomData.find(d => d.handle === handle);
          return data?.title?.trim() || '';
        });
      }

      async sortByDistance() {
        const missingHandles = this.showroomData
          .filter(data => {
            const cached = this.cachedDistances.find(d => d.handle === data.handle);
            if (!cached) return true;
            return parseFloat(data.latitude) !== cached.lat || parseFloat(data.longitude) !== cached.lon;
          })
          .map(data => data.handle);

        this.cachedDistances = this.cachedDistances.filter(distance =>
          this.showroomData.some(data => data.handle === distance.handle)
        );

        if (missingHandles.length === 0 && this.cachedDistances.length > 0) {
          this.applyDistanceSort(this.cachedDistances);
        } else {
          const newDistances = await this.fetchMissingDistances(missingHandles);
          if (newDistances.length > 0) {
            const merged = [...new Map(
              [...this.cachedDistances, ...newDistances].map(item => [item.handle, item])
            ).values()].sort((a, b) => a.distance - b.distance);

            this.cachedDistances = merged;
            this.setCookie('showroomGeoDistances_v1', merged, 30);
            this.applyDistanceSort(merged);
          } else {
            console.warn('No distances available, falling back to title sort');
            this.sortByTitle();
          }
        }
      }

      async filterByState(state) {
        if (!state) {
          console.warn('No state provided');
          return;
        }
      
        const normalizedState = state.toLowerCase();
        const matchingHandles = new Set(
          this.showroomData
            .filter(data => data.state && data.state.toLowerCase() === normalizedState)
            .map(data => data.handle)
        );
      
        if (matchingHandles.size > 1) {
          this.sortByTitle();
        }
      
        this.showroomElements.forEach(el => {
          el.hidden = !matchingHandles.has(el.dataset.handle);
        });
      
        if (matchingHandles.size === 0) {
          console.warn(`No showrooms found for state: ${state}`);
          this.sortByTitle();
        }
      }
      

      sortShowrooms(getSortKey) {
        const limit = Number(this.dataset.limit) || this.showroomElements.length;
        this.showroomElements
          .map(el => ({ key: getSortKey(el), el }))
          .sort((a, b) => a.key.localeCompare(b.key))
          .forEach((item, index) => {
            item.el.style.setProperty('--order', index);
            item.el.hidden = index >= limit;
          });
      }

      applyDistanceSort(distances) {
        const limit = Number(this.dataset.limit) || this.showroomElements.length;
        distances.forEach((item, index) => {
          const el = this.showroomElements.find(el => el.dataset.handle === item.handle);
          if (el) {
            el.style.setProperty('--order', index);
            el.setAttribute('data-distance', item.distance);
            el.hidden = index >= limit;
          }
        });
      }

      async fetchMissingDistances(handles) {
        if (handles.length === 0) return [];

        try {
          const response = await fetch("https://api.ipgeolocation.io/ipgeo?apiKey=2c6a7373a74548c798abd31f823fa892");
          const ipGeo = await response.json();
          const clientLat = parseFloat(ipGeo.latitude);
          const clientLon = parseFloat(ipGeo.longitude);

          return this.showroomData
            .filter(data => handles.includes(data.handle))
            .map(data => {
              const showroomLat = parseFloat(data.latitude);
              const showroomLon = parseFloat(data.longitude);
              const distance = Math.round(this.calculateDistance(clientLat, clientLon, showroomLat, showroomLon));
              return { handle: data.handle, distance, lat: showroomLat, lon: showroomLon };
            });
        } catch (err) {
          console.warn('Geolocation API failed:', err);
          return [];
        }
      }

      scrollToSection(id) {
        if (!id) return;
        const sectionElement = document.getElementById(id);
        if (!sectionElement) return;

        const header = document.querySelector('header');
        const headerHeight = header ? header.offsetHeight : 0;

        const scrollPosition = sectionElement.getBoundingClientRect().top + window.scrollY - headerHeight;
        window.scrollTo({
          top: scrollPosition,
          behavior: 'smooth'
        });
      }

      trackScheduleEvent(event) {
        const parameters = {
          book_appointment_page_url: theme.routes.url || '',
          event_type_url: event.target.href || '',
          event_type_name: event?.target?.closest('.showroom-card')
            ?.querySelector('.showroom-card__title')
            ?.innerHTML
            .replace(/<br\s*\/?>/gi, " ")
            .replace(/\s*-\s*/g, " - ") || 'Unknown Showroom'
        };

        this.initializeFacebookPixel();
        fbq('track', 'Schedule', parameters);
      }

      initializeFacebookPixel() {
        if (typeof fbq !== 'undefined') return;

        !function(f, b, e, v, n, t, s) {
          if (f.fbq) return;
          n = f.fbq = function() {
            n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
          };
          if (!f._fbq) f._fbq = n;
          n.push = n.queue = [];
          n.loaded = true;
          n.version = '2.0';
          n.queue = [];
          t = b.createElement(e);
          t.async = true;
          t.src = v;
          s = b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t, s);
        }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

        fbq('init', '425167842559234');
      }

      ensureActiveButtonVisible() {
        if (!this.activeButton || !this.filterWrapper) return;
        const buttonRect = this.activeButton.getBoundingClientRect();
        const scrollerRect = this.filterWrapper.getBoundingClientRect();

        if (buttonRect.left < scrollerRect.left || buttonRect.right > scrollerRect.right) {
          this.activeButton.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'end' });
        }
      }

      manageEventListeners(elements, event, handler, add) {
        elements.forEach(element => {
          if (add) {
            element.addEventListener(event, handler);
          } else {
            element.removeEventListener(event, handler);
          }
        });
      }

      calculateDistance(lat1, lon1, lat2, lon2) {
        const toRad = deg => (deg * Math.PI) / 180;
        const R = 6371;
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a = Math.sin(dLat / 2) ** 2 +
                  Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c * 0.621371;
      }

      getCookie(name) {
        try {
          const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
          return match ? JSON.parse(decodeURIComponent(match[1])) : [];
        } catch (err) {
          console.warn(`Failed to read cookie ${name}:`, err);
          return [];
        }
      }

      setCookie(name, data, days = 60) {
        try {
          const value = encodeURIComponent(JSON.stringify(data));
          const expires = new Date(Date.now() + days * 864e5).toUTCString();
          document.cookie = `${name}=${value}; expires=${expires}; path=/`;
        } catch (err) {
          console.warn(`Failed to set cookie ${name}:`, err);
        }
      }
    }
  );
}
