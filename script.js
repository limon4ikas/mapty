'use strict';

/* ========== ACTIVITY ========== */

class Activity {
  date = new Date();
  id = (Date.now() + '').slice(-10); // Use library
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

class Running extends Activity {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence; // in spm
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}
class Cycling extends Activity {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

/* ========== APPLICATION ========== */

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #activities = [];

  constructor() {
    // Get user's position
    this._getPosition();

    //Get data from local storage
    this._getLocalStorage();

    // Event listeners
    form.addEventListener('submit', this._createActivity.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  // Map
  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position');
        }
      );
    }
  }

  _loadMap(position) {
    const { latitude, longitude } = position.coords;
    const userCoords = [latitude, longitude];

    // Map
    this.#map = L.map('map').setView(userCoords, this.#mapZoomLevel);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // Event listener on map
    this.#map.on('click', this._showForm.bind(this));

    this.#activities.forEach(activity => {
      this._renderActivityMarker(activity);
    });
  }

  _moveToPopup(e) {
    const activityEl = e.target.closest('.workout');

    if (!activityEl) return;

    const activity = this.#activities.find(
      activity => activity.id === activityEl.dataset.id
    );

    this.#map.setView(activity.coords, this.#mapZoomLevel, {
      animate: true,
      pan: { duration: 1 },
    });

    // activity.click();
  }

  // Form
  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    // Empty inputs
    inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value =
      '';

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  // Create activity
  _createActivity(e) {
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();

    // Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let activity;

    // If activity running, create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;

      // Check if data is valid
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Inputs have to be positive numbers!');

      activity = new Running([lat, lng], distance, duration, cadence);
    }

    // If activity cycling, create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;

      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Inputs have to be positive numbers!');

      activity = new Cycling([lat, lng], distance, duration, elevation);
    }

    // Add new object to workout array
    this.#activities.push(activity);

    // Render
    this._renderActivityMarker(activity);
    this._renderActivity(activity);
    this._hideForm();

    // Set local storage to all activities
    this._setLocalStorage();
  }

  // Display
  _renderActivityMarker(activity) {
    L.marker(activity.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 100,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${activity.type}-popup`,
        })
      )
      .setPopupContent(
        `${activity.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${activity.description}`
      )
      .openPopup();
  }

  _renderActivity(activity) {
    let html = `
  <li class="workout workout--${activity.type}" data-id="${activity.id}">
    <h2 class="workout__title">${activity.description}</h2>
      <div class="workout__details">
      <span class="workout__icon">${
        activity.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
      }</span>
      <span class="workout__value">${activity.distance}</span>
      <span class="workout__unit">km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⏱</span>
      <span class="workout__value">${activity.duration}</span>
      <span class="workout__unit">min</span>
    </div>`;

    if (activity.type === 'running')
      html += `
  <div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${activity.pace.toFixed(1)}</span>
      <span class="workout__unit">min/km</span>
  </div>
   <div class="workout__details">
      <span class="workout__icon">🦶🏼</span>
      <span class="workout__value">${activity.cadence}</span>
      <span class="workout__unit">spm</span>
   </div>
  </li>`;

    if (activity.type === 'cycling')
      html += `
  <div class="workout__details">
    <span class="workout__icon">⚡️</span>
    <span class="workout__value">${activity.speed.toFixed(1)}</span>
    <span class="workout__unit">km/h</span>
  </div>
  <div class="workout__details">
    <span class="workout__icon">⛰</span>
    <span class="workout__value">${activity.elevationGain}</span>
    <span class="workout__unit">m</span>
  </div>
</li>`;

    form.insertAdjacentHTML('afterend', html);
  }

  // Storage
  _setLocalStorage() {
    localStorage.setItem('activities', JSON.stringify(this.#activities));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('activities'));

    if (!data) return;

    this.#activities = data;

    this.#activities.forEach(activity => {
      this._renderActivity(activity);
    });
  }

  reset() {
    localStorage.removeItem('activities');
    location.reload();
  }
}

const app = new App();
