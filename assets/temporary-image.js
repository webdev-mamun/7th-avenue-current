function parseDate(input) {
  // Split the string into date and time parts
  const parts = input.split(' ');

  if (parts.length !== 2) {
    // Invalid input format
    return null;
  }

  // Extract date and time components
  const datePart = parts[0];
  const timePart = parts[1];

  // Split the date part into day, month, and year
  const dateComponents = datePart.split('/');
  if (dateComponents.length !== 3) {
    // Invalid date format
    return null;
  }

  const day = parseInt(dateComponents[0], 10);
  const month = parseInt(dateComponents[1], 10) - 1; // Month is 0-based (0 for January, 11 for December)
  const year = parseInt(dateComponents[2], 10);

  // Split the time part into hours and minutes
  const timeComponents = timePart.match(/(\d+):(\d+)([ap]m)/i);
  if (!timeComponents) {
    // Invalid time format
    return null;
  }

  let hours = parseInt(timeComponents[1], 10);
  const minutes = parseInt(timeComponents[2], 10);
  const ampm = timeComponents[3].toLowerCase();

  if (ampm === 'pm' && hours < 12) {
    hours += 12;
  } else if (ampm === 'am' && hours === 12) {
    hours = 0;
  }

  // Create a Date object
  const date = new Date(year, month, day, hours, minutes);
  const result = {date, timeStamp: date.getTime()};
  return result;
}
window.addEventListener('DOMContentLoaded', () => {
  const showImage = setInterval(checkTime, 1000);
  function checkTime() {
    const element = document.querySelector('.slideshow-section');
    const startDate = parseDate(element.dataset.startDate);
    const endDate = parseDate(element.dataset.endDate);
    const now = Date.now();
    if(now >= startDate.timeStamp && now <= endDate.timeStamp) {
      document.querySelectorAll('.hero-image-permanent').forEach((el) => {
        el.classList.remove('show');
      });
      document.querySelectorAll('.hero-image-temporary').forEach((el) => {
        el.classList.add('show');
      });
    } else {
      document.querySelectorAll('.hero-image-permanent').forEach((el) => {
        el.classList.add('show');
      });
      document.querySelectorAll('.hero-image-temporary').forEach((el) => {
        el.classList.remove('show');
      });
    }
    if(now > endDate.timeStamp) {
      clearInterval(showImage);
    }
  }
}); 