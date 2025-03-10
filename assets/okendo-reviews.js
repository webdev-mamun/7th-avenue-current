const dateFormat = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
});

window.okeReviewsWidgetOnInit = function () {
    const reviewMain = document.querySelector('.js-okeReviews-reviews-main');
    if (reviewMain) {
        const observer = new MutationObserver(formatDateForElement);
        observer.observe(reviewMain, {childList: true});
        formatDateForElement();
    }

    const warButton = document.querySelector(".okeReviews-reviewsWidget-header .js-okeReviews-writeReview");
    const controlsSelect = document.querySelector(".okeReviews-reviews .okeReviews-reviews-controls-sort");

    // Move the WaR button after the sort dropdown
    if (warButton && controlsSelect) {
        controlsSelect.insertAdjacentElement("afterend", warButton);
    }

}

window.okeReviewsQandaOnInit = function () {
    const questionMain = document.querySelector('.js-okeReviews-questions-main');
    if (questionMain) {
        const observer = new MutationObserver(formatDateForElement);
        observer.observe(questionMain, {childList: true});
        formatDateForElement();
    }
}

function formatDateForElement() {
    const reviewDates = document.querySelectorAll('[data-oke-reviews-date]');

    // Format the review date to numbers 
    for (const reviewDate of reviewDates) {
        const dateIsoString = reviewDate.getAttribute('data-oke-reviews-date');
        const date = new Date(dateIsoString);
        const localeDate = date.getMonth()+1 + "/" + date.getDate() + "/" + date.getFullYear();
        reviewDate.innerText = localeDate;
    }
}