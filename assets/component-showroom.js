if (!customElements.get('showroom-items')) {
    customElements.define('showroom-items',
      class ShowroomItems extends HTMLElement {
        constructor() {
          super();
          this.handleButtonClick = this.handleButtonClick.bind(this);
          this.handleCalendly = this.handleCalendly.bind(this);
  
          this.allDistance = this.getCookie('showroomGeoDistances_v1') || [];
          console.log(this.allDistance, 'from cache');
  
          this.activeButton = this.querySelector('[data-sort-by].active') || this.buttons[0];
          this.activeSortOption = this.activeButton?.dataset.sortBy || this.dataset.defaultSortBy || 'by_location';
          console.log(this.activeSortOption, 'default');
  
          try {
            this.allShowroomData = JSON.parse(
              this.querySelector('[data-showroom-info]').textContent.trim()
            );
          } catch (error) {
            console.error('Failed to parse showroom data:', error);
            this.allShowroomData = [];
          }
  
          this.allShowroom = [...this.querySelectorAll('[data-showroom-order]')];
          this.buttons = [...this.querySelectorAll('[data-sort-by]')];
          this.calendlyOpenerButtons = [...this.querySelectorAll('[data-calendly-opener]')];
  
          this.sortHandlers = {
            by_alphabetical: this.handleByAlphabetical.bind(this),
            by_location: this.handleByLocation.bind(this),
            by_state: this.handleByState.bind(this)
          };
  
          this.buttons.forEach(button =>
            button.addEventListener('click', this.handleButtonClick)
          );
  
          this.calendlyOpenerButtons.forEach(button =>
            button.addEventListener('click', this.handleCalendly)
          );
        }
  
        connectedCallback() {
          this.sortHandlers[this.activeSortOption]?.();
        }
  
        disconnectedCallback() {
          this.buttons.forEach(button =>
            button.removeEventListener('click', this.handleButtonClick)
          );
  
          this.calendlyOpenerButtons.forEach(button =>
            button.removeEventListener('click', this.handleCalendly)
          );
        }
  
        handleCalendly(event) {
          this.calendlyPopupOpener(event);
          this.scheduleTracking(event);
        }
  
        calendlyPopupOpener(event) {
          const button = event.target;
          const url = event.target.href;
          if (!button || !url) return;
          event.preventDefault();
          if (typeof Calendly !== 'undefined') {
            Calendly.initPopupWidget({
              url: url,
            });
          } else {
            console.warn('Calendly widget is not loaded');
          }
        }
  
        scheduleTracking(event) {
            const parameters = {
                book_appointment_page_url: theme.routes.url || '',
                event_type_url: event.target.href || '',
                event_type_name:
                event?.target?.closest('.showroom-card')?.querySelector('.showroom-card__title')?.innerHTML.replace(
                    /<br\s*\/?>/gi,
                    " "
                ) || 'Unknown Showroom',
            };
            
            this.initializeFbq();
            
            fbq("track", "Schedule", parameters);
        }
          
        initializeFbq() {
            if (typeof fbq === 'undefined') {
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
        }          
  
        handleButtonClick(event) {
          const button = event.target;
          if (this.activeButton?.isSameNode(button)) return;
  
          const sortBy = button.dataset.sortBy;
          const sortOption = button.dataset.sortOption;
  
          this.sortHandlers[sortBy]?.(sortOption);
          this.setActiveButton(button);
        }
  
        setActiveButton(button) {
          this.buttons.forEach(btn => btn.classList.remove('active'));
          button.classList.add('active');
          this.activeButton = button;
          this.activeSortOption = button.dataset.sortBy;
        }
  
        sortShowrooms(getSortKey) {
          this.allShowroom
            .map(el => ({
              key: getSortKey(el),
              el,
            }))
            .sort((a, b) => a.key.localeCompare(b.key))
            .forEach((item, index) => {
              item.el.style.setProperty('--order', index);
              item.el.hidden = false;
            });
        }
  
        handleByAlphabetical() {
          this.sortShowrooms(el => {
            const handle = el.dataset.handle;
            const data = this.allShowroomData.find(d => d.handle === handle);
            return data?.title?.trim() || '';
          });
        }
  
        async handleByLocation() {
          const missingHandles = [];
  
          for (const el of this.allShowroom) {
            const handle = el.dataset.handle;
            const cached = this.allDistance.find(d => d.handle === handle);
            const data = this.allShowroomData.find(d => d.handle === handle);
  
            if (!cached || !data) {
              missingHandles.push(handle);
              continue;
            }
  
            const latChanged = parseFloat(data.latitude) !== cached.lat;
            const lonChanged = parseFloat(data.longitude) !== cached.lon;
  
            if (latChanged || lonChanged) {
              missingHandles.push(handle);
            }
          }
  
          if (missingHandles.length === 0 && this.allDistance.length > 0) {
            this.sortByDistance(this.allDistance);
          } else {
            const newDistances = await this.fetchMissingDistances(missingHandles);
  
            const merged = [
              ...new Map(
                [...this.allDistance, ...newDistances].map(item => [item.handle, item])
              ).values()
            ];
  
            const sortedMerged = [...merged].sort((a, b) => a.distance - b.distance);
  
            this.allDistance = sortedMerged;
            this.setCookie('showroomGeoDistances_v1', sortedMerged, 30);
  
            if (sortedMerged.length > 0) {
              this.sortByDistance(sortedMerged);
            } else {
              this.handleByAlphabetical();
            }
          }
        }
  
        sortByDistance(distances) {
          const limit = this.dataset.limit > 0 ? this.dataset.limit : this.allShowroom.length;
          distances.forEach((item, index) => {
            const el = this.allShowroom.find(el => el.dataset.handle === item.handle);
            if (el) {
              el.style.setProperty('--order', index);
              el.setAttribute('data-distance', item.distance);
              if (index + 1 <= limit) {
                el.hidden = false;
              } else {
                el.hidden = true;
              }
            }
          });
        }
  
        async fetchMissingDistances(missingHandles) {
          if (missingHandles.length === 0) return [];
  
          try {
            const ipGeo = await fetch("https://api.ipgeolocation.io/ipgeo?apiKey=2c6a7373a74548c798abd31f823fa892")
              .then(res => res.json());
  
            const clientLat = parseFloat(ipGeo.latitude);
            const clientLon = parseFloat(ipGeo.longitude);
  
            return this.allShowroom
              .map(el => {
                const handle = el.dataset.handle;
                if (!missingHandles.includes(handle)) return null;
  
                const data = this.allShowroomData.find(d => d.handle === handle);
                if (!data) return null;
  
                const showroomLat = parseFloat(data.latitude);
                const showroomLon = parseFloat(data.longitude);
                const distance = Math.round(this.calculateDistance(clientLat, clientLon, showroomLat, showroomLon));
  
                return {
                  handle,
                  distance,
                  lat: showroomLat,
                  lon: showroomLon
                };
              })
              .filter(Boolean);
          } catch (err) {
            console.warn('Geolocation API failed:', err);
            return [];
          }
        }
  
        handleByState(state) {
          if (!state) return;
  
          const matchingHandles = new Set(
            this.allShowroomData
              .filter(data => data.state === state)
              .map(data => data.handle)
          );
  
          this.allShowroom.forEach(el => {
            const handle = el.dataset.handle;
            el.hidden = !matchingHandles.has(handle);
          });
        }
  
        calculateDistance(lat1, lon1, lat2, lon2) {
          const toRad = deg => (deg * Math.PI) / 180;
          const R = 6371;
          const dLat = toRad(lat2 - lat1);
          const dLon = toRad(lon2 - lon1);
          const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) *
            Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) ** 2;
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          return R * c * 0.621371; // in miles
        }
  
        getCookie(name) {
          try {
            const raw = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
            return raw ? JSON.parse(decodeURIComponent(raw[1])) : [];
          } catch {
            return [];
          }
        }
  
        setCookie(name, data, days = 60) {
          const value = encodeURIComponent(JSON.stringify(data));
          const expires = new Date(Date.now() + days * 864e5).toUTCString();
          document.cookie = `${name}=${value}; expires=${expires}; path=/`;
        }
      }
    );
  }
  