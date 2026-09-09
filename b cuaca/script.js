let unit = "metric";
let currentCity = "";
const apiKey = "84062f1f545074177b7387c8f995cfdb";

let dailyForecastGroups = []; 
let currentSelectedDayIndex = 0;
let hourlyChartInstance = null; // Variabel global untuk instance grafik
let debounceTimer; // Timer untuk menahan pemanggilan API pencarian

// Event Listener saat dokumen siap
document.addEventListener("DOMContentLoaded", () => {
    const cityInput = document.getElementById("city");
    if (cityInput) {
        // Jalankan pencarian saran saat mengetik
        cityInput.addEventListener("input", handleSearchInput);
    }

    // Menutup dropdown otomatis jika mengeklik di luar area pencarian
    document.addEventListener("click", (e) => {
        const searchBox = document.querySelector(".search-container") || document.querySelector(".search-box");
        if (searchBox && !searchBox.contains(e.target)) {
            hideSuggestions();
        }
    });
});
// Fitur Auto-complete & Debounce
function handleSearchInput(event) {
    clearTimeout(debounceTimer);
    const query = event.target.value.trim();

    if (query.length < 3) {
        hideSuggestions();
        return;
    }
    // Menunggu 300ms setelah user berhenti mengetik
    debounceTimer = setTimeout(() => {
        fetchCitySuggestions(query);
    }, 300);
}
// Ambil saran lokasi dari API Geocoding OpenWeatherMap
async function fetchCitySuggestions(query) {
    const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=5&appid=${apiKey}`;
    try {
        const response = await fetch(geoUrl);
        const data = await response.json();
        renderSuggestions(data);
    } catch (error) {
        console.error("Gagal mengambil saran lokasi:", error);
    }
}
// Menampilkan dropdown saran kota
function renderSuggestions(cities) {
    let dropdown = document.getElementById("search-suggestions");
    
    if (!dropdown) {
        dropdown = document.createElement("ul");
        dropdown.id = "search-suggestions";
        dropdown.className = "search-dropdown";
        
        const searchBox = document.querySelector(".search-box");
        if (searchBox) {
            searchBox.appendChild(dropdown);
        }
    }
    dropdown.innerHTML = "";

    if (!cities || cities.length === 0) {
        hideSuggestions();
        return;
    }
    cities.forEach(city => {
        const li = document.createElement("li");
        li.className = "suggestion-item";
        
        const state = city.state ? `, ${city.state}` : "";
        const lat = city.lat ? city.lat.toFixed(2) : "";
        const lon = city.lon ? city.lon.toFixed(2) : "";

        li.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <span style="font-size: 22px;">🇮🇩</span>
                <div>
                    <div style="font-size: 14px; font-weight: 600; color: #ffffff;">
                        ${city.name}<span style="color: #94a3b8; font-weight: 400;">${state}</span>
                    </div>
                    <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
                        ${lat}, ${lon}
                    </div>
                </div>
            </div>
        `;

        li.onclick = () => {
            const cityInput = document.getElementById("city");
            if (cityInput) cityInput.value = city.name;
            currentCity = city.name;
            hideSuggestions();
            getWeatherByCoords(city.lat, city.lon, city.name);
        };

        dropdown.appendChild(li);
    });

    dropdown.style.display = "block";
}
function hideSuggestions() {
    const dropdown = document.getElementById("search-suggestions");
    if (dropdown) dropdown.style.display = "none";
}

// Fungsi Ambil Cuaca berdasarkan Koordinat (Hasil dari klik saran)
async function getWeatherByCoords(lat, lon, cityName) {
    currentCity = cityName;
    const currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=${unit}&lang=id`;
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=${unit}&lang=id`;
        fetchWeatherData(currentUrl, forecastUrl);
}
// Fungsi untuk mengganti Unit (°C / °F)
function setUnit(newUnit) {
    if (unit === newUnit) return;
    unit = newUnit;

    const btnC = document.getElementById("btn-celsius");
    const btnF = document.getElementById("btn-fahrenheit");
    if (btnC) btnC.classList.toggle("active", unit === "metric");
    if (btnF) btnF.classList.toggle("active", unit === "imperial");
    if (currentCity !== "") {
        getWeather();
    }
}

// Event pencarian via tombol Enter
function handleKeyPress(event) {
    if (event.key === "Enter") {
        hideSuggestions();
        getWeather();
    }
}

async function getWeather() {
    const cityInput = document.getElementById("city");
    const city = cityInput ? cityInput.value.trim() : "";
    if (city !== "") {
        currentCity = city;
    }
    if (currentCity === "") {
        alert("Masukkan nama kota terlebih dahulu!");
        return;
    }
        const currentUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(currentCity)}&appid=${apiKey}&units=${unit}&lang=id`;
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(currentCity)}&appid=${apiKey}&units=${unit}&lang=id`;
    
    fetchWeatherData(currentUrl, forecastUrl);
}
// Helper untuk fetch data cuaca
async function fetchWeatherData(currentUrl, forecastUrl) {
    try {
        const [currentRes, forecastRes] = await Promise.all([
            fetch(currentUrl),
            fetch(forecastUrl)
        ]);
        const currentData = await currentRes.json();
        const forecastData = await forecastRes.json();
        if (currentData.cod == 200) {
            if (forecastData.cod == "200") {
                dailyForecastGroups = groupForecastByDay(forecastData.list);
                renderDailyTabs(dailyForecastGroups);
                selectDay(0, currentData);
            }
        } else {
            document.getElementById("result").innerHTML = `
                <div class="current-weather-card" style="text-align: center; padding: 30px;">
                    <div style="font-size: 24px; margin-bottom: 8px;">❌</div>
                    <div style="font-size: 14px; color: #f87171; font-weight: 600;">Kota "${currentCity}" tidak ditemukan.</div>
                </div>
            `;
        }
    } catch (error) {
        document.getElementById("result").innerHTML = `
            <div class="current-weather-card" style="text-align: center; padding: 30px;">
                <div style="font-size: 24px; margin-bottom: 8px;">⚠️</div>
                <div style="font-size: 14px; color: #f87171; font-weight: 600;">Gagal mengambil data cuaca.</div>
            </div>
        `;
        console.error(error);
    }
}

function groupForecastByDay(list) {
    const groups = {};
    list.forEach(item => {
        const date = item.dt_txt.split(' ')[0];
        if (!groups[date]) {
            groups[date] = [];
        }
        groups[date].push(item);
    });
    return Object.values(groups);
}

function getWeatherIcon(condition, iconCode = "") {
    const isNight = iconCode.endsWith("n");
    let iconName = "clear.svg";

    switch (condition) {
        case "Clear":
            iconName = isNight ? "night.svg" : "clear.svg";
            break;
        case "Clouds":
            iconName = isNight ? "clouds_night.svg" : "clouds.svg";
            break;
        case "Rain":
            iconName = "rain.svg";
            break;
        case "Drizzle":
            iconName = "drizzle.svg";
            break;
        case "Thunderstorm":
            iconName = "stormthunder.svg";
            break;
        case "Snow":
            iconName = "snow.svg";
            break;
        case "Mist":
        case "Fog":
        case "Haze":
        case "Smoke":
            iconName = "mist.svg";
            break;
        default:
            iconName = isNight ? "night.svg" : "clear.svg";
    }

    return `<img src="images/${iconName}" alt="${condition}" style="width: 18px; height: 18px; vertical-align: middle; object-fit: contain;">`;
}

function renderDailyTabs(groups) {
    const container = document.getElementById("daily-forecast-container");
    if (!container) return;
    container.innerHTML = "";
    groups.forEach((dayData, index) => {
        const firstItem = dayData[0];
        const dateObj = new Date(firstItem.dt * 1000);
        
        let dayName = index === 0 ? "Today" : dateObj.toLocaleDateString("en-US", { weekday: 'short' });
        const temp = Math.round(firstItem.main.temp);
        const condition = firstItem.weather[0].main;
        const iconCode = firstItem.weather[0].icon;

        const tab = document.createElement("div");
        tab.className = `daily-card ${index === 0 ? 'active' : ''}`;
    
        tab.style.backgroundColor = index === 0 ? '#ea580c' : 'rgba(255, 255, 255, 0.08)';
        tab.style.color = '#ffffff';
        tab.style.padding = '8px 16px';
        tab.style.borderRadius = '10px';
        tab.style.display = 'flex';
        tab.style.alignItems = 'center';
        tab.style.gap = '10px';
        tab.style.fontSize = '13px';
        tab.style.fontWeight = '500';
        tab.style.whiteSpace = 'nowrap';
        tab.style.cursor = 'pointer';
        tab.style.flexShrink = '0';
        tab.style.border = '1px solid rgba(255, 255, 255, 0.1)';
        
        tab.innerHTML = `
            <span>${dayName}</span> 
            <strong style="font-weight: 700;">${temp}°</strong> 
            ${getWeatherIcon(condition, iconCode)}
        `;
                tab.onclick = () => {
            document.querySelectorAll(".daily-card").forEach(t => {
                t.style.backgroundColor = "rgba(255, 255, 255, 0.08)";
                t.classList.remove("active");
            });
            tab.style.backgroundColor = "#ea580c";
            tab.classList.add("active");
            
            selectDay(index);
        };

        container.appendChild(tab);
    });
}

function selectDay(index, currentDataFallback = null) {
    currentSelectedDayIndex = index;
    const dayDataList = dailyForecastGroups[index];
    if (!dayDataList) return;

    const mainData = (index === 0 && currentDataFallback) ? currentDataFallback : dayDataList[0];
    
    renderCurrentWeather(mainData);
    renderHourlyForecast(dayDataList);
}

function renderHourlyForecast(dayDataList) {
    const hourlyContainer = document.querySelector(".hourly-list");
    if (!hourlyContainer) return;

    hourlyContainer.innerHTML = "";
    const unitSymbol = unit === "metric" ? "°" : "°F";
    const chartLabels = [];
    const chartTemps = [];

    dayDataList.forEach(item => {
        const dateObj = new Date(item.dt * 1000);
        const timeString = dateObj.toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' });
        const temp = Math.round(item.main.temp);
        const condition = item.weather[0].main;
        const iconCode = item.weather[0].icon;
        
        const pop = Math.round((item.pop || 0) * 100);

        chartLabels.push(timeString);
        chartTemps.push(temp);

        hourlyContainer.innerHTML += `
        <div style="
            text-align: center; 
            color: #fff; 
            width: 52px; 
            height: 125px; 
            flex-shrink: 0; 
            background: rgba(255, 255, 255, 0.05); 
            padding: 12px 4px; 
            border-radius: 12px; 
            border: 1px solid rgba(255, 255, 255, 0.08);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-between;
            ">
            <div style="font-size: 11px; color: #cbd5e1; font-weight: 500;">${timeString}</div>
            <div style="display: flex; align-items: center; justify-content: center; height: 24px;">
                ${getWeatherIcon(condition, iconCode)}
            </div>
            <div style="font-size: 10px; color: #38bdf8; font-weight: 600;">${pop}%</div>
            <div style="font-size: 13px; font-weight: bold;">${temp}${unitSymbol}</div>
        </div>
        `;
    });

    renderHourlyChart(chartLabels, chartTemps);
}

function renderHourlyChart(labels, temps) {
    const canvas = document.getElementById('hourlyChart');
    if (!canvas) return;
        const ctx = canvas.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, 0, 150);
    gradient.addColorStop(0, 'rgba(234, 88, 12, 0.4)');
    gradient.addColorStop(1, 'rgba(234, 88, 12, 0.0)');

    if (hourlyChartInstance) {
        hourlyChartInstance.destroy();
    }

    const unitSymbol = unit === "metric" ? "°C" : "°F";

    hourlyChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                data: temps,
                borderColor: '#ea580c',
                borderWidth: 2,
                fill: true,
                backgroundColor: gradient,
                tension: 0.4,
                pointBackgroundColor: '#ea580c',
                pointRadius: 3,
                pointHoverRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => ` Suhu: ${ctx.raw}${unitSymbol}`
                    }
                }
            },
            scales: {
                x: { display: false },
                y: { display: false }
            }
        }
    });
}

function updateWeatherBackground(mainWeather, iconCode, weatherId, description = "") {
    const safeIcon = iconCode || "";
    const isNight = safeIcon.endsWith("n");
    let bgImage = "gambar_cuaca/clear.jpg";

    const descLower = description.toLowerCase();

    if (descLower.includes("hujan") || mainWeather === "Rain" || mainWeather === "Drizzle") {
        bgImage = "gambar_cuaca/rain.jpg";
    } else if (mainWeather === "Thunderstorm") {
        bgImage = "gambar_cuaca/thunderstrom.jpg";
    } else if (descLower.includes("awan pecah") || descLower.includes("broken clouds")) {
        bgImage = "gambar_cuaca/awan pecah.jpg";
    } else if (descLower.includes("awan tersebar") || descLower.includes("scattered clouds")) {
        bgImage = "gambar_cuaca/awan tersebar.jpg";
    } else if ((weatherId >= 801 && weatherId <= 804) || mainWeather === "Clouds") {
        bgImage = isNight ? "gambar_cuaca/clouds_night.jpg" : "gambar_cuaca/clouds.jpg";
    } else if (mainWeather === "Clear") {
        bgImage = isNight ? "gambar_cuaca/clear_night.jpg" : "gambar_cuaca/clear.jpg";
    } else if (["Mist", "Fog", "Haze"].includes(mainWeather)) {
        bgImage = "gambar_cuaca/mist.jpg";
    } else if (mainWeather === "Snow") {
        bgImage = "gambar_cuaca/snow.jpg";
    }

    const headerPhoto = document.querySelector(".weather-header-photo");
    if (headerPhoto) {
        headerPhoto.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.65)), url('${bgImage}')`;
        headerPhoto.style.backgroundSize = "cover";
        headerPhoto.style.backgroundPosition = "center";
    }
}

function renderCurrentWeather(data) {
    const update = new Date().toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' });
    const unitSymbol = unit === "metric" ? "°C" : "°F";
    
    const windSpeed = unit === "metric" ? `${data.wind.speed} m/s` : `${data.wind.speed} mph`;
    const windDeg = data.wind.deg ? getWindDirection(data.wind.deg) : "";
    const dewPoint = Math.round(data.main.temp - ((100 - data.main.humidity) / 5));

    const mainWeather = data.weather[0].main;
    const weatherId = data.weather[0].id;
    const iconCode = data.weather[0].icon;
    const description = data.weather[0].description;

    const cityName = data.name || currentCity || "Kota";
    const countryCode = data.sys && data.sys.country ? `, ${data.sys.country}` : "";

    document.getElementById("result").innerHTML = `
        <div class="weather-card-combined">
            <div class="weather-header-photo">
                <div class="card-top-info">
                    <div class="location-title">📍 ${cityName}${countryCode}</div>
                    <div class="update-time">Diperbarui pukul ${update}</div>
                </div>
                <div class="card-bottom-info">
                    <h1 class="temp-text">${Math.round(data.main.temp)}${unitSymbol}</h1>
                    <div class="weather-desc-text">
                        <span class="desc-main">${description}</span>
                        <span class="feels-text">Terasa seperti ${Math.round(data.main.feels_like)}${unitSymbol}</span>
                    </div>
                </div>
            </div>

            <div class="details-grid-box">
                <div class="detail-card">
                    <i class="fa-solid fa-wind icon-detail"></i>
                    <span class="label">Wind</span>
                    <strong class="value">${windSpeed} ${windDeg}</strong>
                </div>
                <div class="detail-card">
                    <i class="fa-solid fa-droplet icon-detail"></i>
                    <span class="label">Humidity</span>
                    <strong class="value">${data.main.humidity}%</strong>
                </div>
                <div class="detail-card">
                    <i class="fa-solid fa-eye icon-detail"></i>
                    <span class="label">Visibility</span>
                    <strong class="value">${(data.visibility / 1000).toFixed(1)} km</strong>
                </div>
                <div class="detail-card">
                    <i class="fa-solid fa-gauge icon-detail"></i>
                    <span class="label">Pressure</span>
                    <strong class="value">${data.main.pressure} hPa</strong>
                </div>
                <div class="detail-card">
                    <i class="fa-solid fa-sun icon-detail"></i>
                    <span class="label">UV Index</span>
                    <strong class="value">3 UV</strong>
                </div>
                <div class="detail-card">
                    <i class="fa-solid fa-water icon-detail"></i>
                    <span class="label">Dew Point</span>
                    <strong class="value">${dewPoint}${unitSymbol}</strong>
                </div>
            </div>
        </div>
    `;

    updateWeatherBackground(mainWeather, iconCode, weatherId, description);
}

function getWindDirection(deg) {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return directions[Math.round(deg / 45) % 8];
}