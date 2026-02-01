const openWeatherKey = "dfe40acb558c2b7b4507435292e988df";
const weatherApiKey = "84093dfdf62643748d404656260102"; 

const cityInput = document.getElementById("city_input");
const searchBtn = document.getElementById("searchBtn");
const locationBtn = document.getElementById("locationBtn");

const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const months = ["Jan","Feb","Mar","Apr","May","June","July","Aug","Sep","Oct","Nov","Dec"];

const currentCard = document.querySelector(".weather-left .card");
const forecastItems = document.querySelectorAll(".forecast-item");
const airItems = document.querySelectorAll(".air-indices .item h2");
const sunriseVal = document.querySelectorAll(".sunrise-sunset .item h2")[0];
const sunsetVal = document.querySelectorAll(".sunrise-sunset .item h2")[1];

const humidityVal = document.getElementById("humidityVal");
const pressreVal = document.getElementById("pressreVal");
const visibilityVal = document.getElementById("visibilityVal");
const windSpeedVal = document.getElementById("windSpeedVal");
const feelsVal = document.getElementById("feelsVal");

const hourlyCards = document.querySelectorAll(".hourly-forecast .card");

/* ---------------- EVENTS ---------------- */
searchBtn.addEventListener("click", () => {
    const city = cityInput.value.trim();
    if(city) getCityCoordinates(city);
});

locationBtn.addEventListener("click", () => {
    navigator.geolocation.getCurrentPosition(
        pos => getWeatherByCoords(pos.coords.latitude, pos.coords.longitude),
        () => alert("Location access denied")
    );
});

/* ---------------- GEO CODING ---------------- */
function getCityCoordinates(city){
    fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=1&appid=${openWeatherKey}`)
    .then(res => res.json())
    .then(data => {
        if(!data.length) return alert("City not found");
        const {lat, lon, name, country} = data[0];
        getWeatherByCoords(lat, lon, name, country);
    })
    .catch(() => alert("Error fetching coordinates"));
}

/* ---------------- MAIN FETCH ---------------- */
async function getWeatherByCoords(lat, lon, name="", country=""){
    try{
        const [ow, wa] = await Promise.all([
            fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${openWeatherKey}`).then(r=>r.json()),
            fetch(`https://api.weatherapi.com/v1/current.json?key=${weatherApiKey}&q=${lat},${lon}`).then(r=>r.json())
        ]);

        const avgTemp = ((ow.main.temp + wa.current.temp_c) / 2).toFixed(1);
        const avgFeels = ((ow.main.feels_like + wa.current.feelslike_c) / 2).toFixed(1);
        const avgHumidity = Math.round((ow.main.humidity + wa.current.humidity) / 2);
        const avgWind = ((ow.wind.speed + wa.current.wind_kph/3.6) / 2).toFixed(1);

        updateCurrentWeatherAverage(ow, wa, avgTemp, avgFeels, avgHumidity, avgWind, name, country);

        const forecast = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${openWeatherKey}`).then(r=>r.json());
        updateForecast(forecast);

        const air = await fetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${openWeatherKey}`).then(r=>r.json());
        updateAirQuality(air);

    }catch(err){
        console.error(err);
        alert("Weather services unreachable");
    }
}

/* ---------------- FIXED TIME HELPER ---------------- */
function formatLocalTime(unix, timezone) {
    // Adding the timezone offset to unix timestamp
    // We use timeZone: 'UTC' to prevent JS from adding your local computer's offset
    const date = new Date((unix + timezone) * 1000);
    return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "UTC" 
    });
}

/* ---------------- CURRENT WEATHER ---------------- */
function updateCurrentWeatherAverage(ow, wa, avgTemp, avgFeels, avgHumidity, avgWind, name, country){
    // Use the same logic for the main date display
    const localDate = new Date((ow.dt + ow.timezone) * 1000);

    currentCard.innerHTML = `
        <div class="current-weather">
            <div class="details">
                <p>Now</p>
                <h2>${avgTemp}&deg;C</h2>
                <p>${ow.weather[0].description}</p>
            </div>
            <div class="weather-icon">
                <img src="https://openweathermap.org/img/wn/${ow.weather[0].icon}@2x.png">
            </div>
        </div>
        <hr>
        <div class="card-footer">
            <p>${days[localDate.getUTCDay()]}, ${localDate.getUTCDate()} ${months[localDate.getUTCMonth()]} ${localDate.getUTCFullYear()}</p>
            <p>${name || ow.name}, ${country || ow.sys.country}</p>
        </div>
    `;

    humidityVal.textContent = avgHumidity + "%";
    pressreVal.textContent = ow.main.pressure + " hPa";
    visibilityVal.textContent = (ow.visibility/1000).toFixed(1) + " Km";
    windSpeedVal.textContent = avgWind + " m/s";
    feelsVal.textContent = avgFeels + "°C";

    // Applying the fixed formatting
    sunriseVal.textContent = formatLocalTime(ow.sys.sunrise, ow.timezone);
    sunsetVal.textContent = formatLocalTime(ow.sys.sunset, ow.timezone);
}

/* ---------------- FORECAST ---------------- */
function updateForecast(data){
    const daily = data.list.filter(item => item.dt_txt.includes("12:00:00"));

    daily.forEach((item, i) => {
        if(forecastItems[i]) {
            const date = new Date((item.dt + data.city.timezone) * 1000);
            forecastItems[i].innerHTML = `
                <div class="icon-wrapper">
                    <img src="https://openweathermap.org/img/wn/${item.weather[0].icon}.png">
                    <span>${item.main.temp.toFixed(1)}°C</span>
                </div>
                <p>${days[date.getUTCDay()]}</p>
                <p>${date.getUTCDate()} ${months[date.getUTCMonth()]}</p>
            `;
        }
    });

    hourlyCards.forEach((card, i) => {
        if(data.list[i]) {
            const h = data.list[i];
            const time = formatLocalTime(h.dt, data.city.timezone);
            card.innerHTML = `
                <p>${time}</p>
                <img src="https://openweathermap.org/img/wn/${h.weather[0].icon}.png">
                <p>${h.main.temp.toFixed(1)}°C</p>
            `;
        }
    });
}

/* ---------------- AIR QUALITY ---------------- */
function updateAirQuality(data){
    const air = data.list[0].components;
    // Map the API response to your UI order
    const values = [air.pm2_5, air.pm10, air.so2, air.co, air.no, air.no2, air.nh3, air.o3];
    airItems.forEach((el, i) => {
        if(values[i] !== undefined) el.textContent = values[i].toFixed(1);
    });
}
