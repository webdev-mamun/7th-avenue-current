if (!customElements.get('showroom-items')) {
    customElements.define('showroom-items',
        class ShowroomItems extends HTMLElement {
            constructor() {
                super();
                this.handleButtonClick = this.handleButtonClick.bind(this);

                this.activeButton = this.querySelector('button.active');
                this.activeSortOption = this.activeButton?.dataset.sortOption || this.dataset.defaultSortOption;
                this.allShowroomData = JSON.parse(this.querySelector('[data-showroom-info]').textContent.trim());

                console.log('all showroom data: ',this.allShowroomData);

                this.allShowroom = [...this.querySelectorAll('[data-showroom-order]')];
                this.buttons = [...this.querySelectorAll('.showroom-sort-option')];

                this.sortHandlers = {
                    all_showrooms: this.handleAllShowrooms.bind(this),
                    by_state: this.handleByState.bind(this),
                    near_me: this.handleNearMe.bind(this),
                };

                this.buttons.forEach(button => {
                    button.addEventListener('click', this.handleButtonClick);
                });
            }

            connectedCallback() {
                const sortFn = this.sortHandlers[this.activeSortOption];
                if (sortFn) sortFn();
                else this.handleAllShowrooms(); 
            }

            disconnectedCallback() {
                this.buttons.forEach(button => {
                    button.removeEventListener('click', this.handleButtonClick);
                });
            }

            handleButtonClick(event) {
                const button = event.target;
                if (this.activeButton?.isSameNode(button)) return;

                const activeSortOption = button?.dataset.sortOption;

                const sortFn = this.sortHandlers[activeSortOption];
                if (sortFn) sortFn();

                this.setActiveButton(button);
            }

            setActiveButton(button) {
                this.buttons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                this.activeButton = button;
                this.activeSortOption = button.dataset.sortOption;
            }

            sortShowrooms(getSortKey) {
                const sorted = this.allShowroom
                    .map(el => ({
                        key: getSortKey(el),
                        el,
                    }))
                    .sort((a, b) => a.key.localeCompare(b.key));

                sorted.forEach((item, index) => {
                    item.el.style.setProperty('--order', index);
                });
            }

            handleAllShowrooms() {
                const sorted = this.allShowroom
                    .map(el => {
                        const handle = el.dataset.handle;
                        const data = this.allShowroomData.find(d => d.handle === handle);
                        const title = data?.title?.trim() || '';
                        return { key: title, el };
                    })
                    .sort((a, b) => a.key.localeCompare(b.key));
            
                sorted.forEach((item, index) => {
                    item.el.style.setProperty('--order', index);
                });
            }
            

            handleByState() {
                const sorted = this.allShowroom
                    .map(el => {
                        const handle = el.dataset.handle;
                        const data = this.allShowroomData.find(d => d.handle === handle);
                        const state = data?.state?.trim() || '';
                        return { key: state, el };
                    })
                    .sort((a, b) => a.key.localeCompare(b.key));
            
                sorted.forEach((item, index) => {
                    item.el.style.setProperty('--order', index);
                });
            }
            

            handleNearMe() {
                console.log('handle near me');
            }
        }
    )
}
