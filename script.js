// CONSTANTES
  // armazenar endereço API
const GEOCODING_API_URL = "https://geocoding-api.open-meteo.com/v1/search";

const WEATHER_API_URL = "https://api.open-meteo.com/v1/forecast";

const HISTORY_STORAGE_KEY = "weather-recent-cities";


// SELETORES DOM
   // consulte clima cidade
const citySearchForm = document.getElementById("city-search-form");
const cityInput = document.getElementById("city-input");

  // API geocoding
const searchStatus = document.getElementById("search-status");
console.log("searchStatus:", searchStatus)

const cityResultsList = document.getElementById("city-results-list");

  // API meteorologia
const weatherStatus = document.getElementById("weather-status");
const weatherCard = document.querySelector(".weather-card");
const weatherCity = document.getElementById("weather-city");
const weatherTemperature = document.getElementById("weather-temperature");
const weatherDescription = document.getElementById("weather-description");
const weatherHumidity = document.getElementById("weather-humidity");
const weatherWind = document.getElementById("weather-wind");


   // Acessar a mensagem de status dos conteiners (5 dias)
const forecastStatus = document.getElementById("forecast-status");
const forecastList = document.getElementById("forecast-list");


  // Registro de 5 cidades e armazenamento
const historyStatus = document.getElementById("history-status");
const recentCitiesList = document.getElementById("recent-cities-list");



// ESTADOS
  // Recuperar dados armazenados - cidades anteriores pesquisadas
let recentCities = JSON.parse(
    localStorage.getItem(HISTORY_STORAGE_KEY) || "[]"
);



// FUNCOES
  // consultar API e retornar as localidades encontradas
async function searchCities(cityName) {
    const url = `${GEOCODING_API_URL}?name=${encodeURIComponent(cityName)}&count=5&language=pt`;

    const response = await fetch(url);

    if(!response.ok) {
        throw new Error("Falha na consulta da cidade.");
    }

    const data = await response.json();

    return data.results || [];
}


  // consultar clima atual
async function searchCurrentWeather(city) {
    const variables = "temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code";

    const url = `${WEATHER_API_URL}?latitude=${city.latitude}&longitude=${city.longitude}&current=${variables}&timezone=auto`;

    const response = await fetch(url);

    if (!response.ok) {
        throw Error("Falha na consulta meteorológica.");
    }

    const data = await response.json();

    return data.current;
}

  // previsão 5 dias
async function searchDailyForecast(city) {
    const variables = "temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code";

    const url = `${WEATHER_API_URL}?latitude=${city.latitude}&longitude=${city.longitude}&daily=${variables}&timezone=auto&forecast_days=5`;

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error("Falha na consulta da previsão.");
    }

    const data = await response.json();
    return data.daily;
}


function getWeatherDescription(code) {
    if (code === 0) return "Céu limpo";
    if (code >= 1 && code <= 3) return "Parcialmente nublado";
    if (code === 45 || code === 48) return "Nevoeiro";
    if (code >= 51 && code <= 67) return "Chuva ou garoa";
    if (code >= 71 && code <= 77) return "Neve";
    if (code >= 80 && code <= 82) return "Pancadas de chuva";
    if (code >= 95 && code <= 99) return "Trovoada";

    return "Condição não identificada"
}

function renderCurrentWeather(city, weather) {
    weatherCity.textContent = `${city.name}, ${city.country}`;
    weatherTemperature.textContent = `${weather.temperature_2m} °C`;
    weatherDescription.textContent = getWeatherDescription(weather.weather_code);
    weatherHumidity.textContent = `Umidade: ${weather.relative_humidity_2m}%`;
    weatherWind.textContent = `Vento: ${weather.wind_speed_10m} km/h`;

    weatherCard.hidden = false;
}

  // renderizar cartões 5 dias de previsão
function renderDailyForecast(daily) {
    forecastList.replaceChildren();

    daily.time.forEach((date, index) => {
        const card = document.createElement("article");
        const title = document.createElement("h3");
        const temperature = document.createElement("p");
        const precipitation = document.createElement("p");
        const description = document.createElement("p");

        card.classList.add("forecast-card");
        temperature.classList.add("forecast-temperature");
        title.textContent = date.split("-").reverse().join("/");
        temperature.textContent = `Máx: ${daily.temperature_2m_max[index]} °C | Mín: ${daily.temperature_2m_min[index]} °C`;
        precipitation.textContent = `Precipitação: ${daily.precipitation_sum[index]} mm`;
        description.textContent = getWeatherDescription(daily.weather_code[index]);

        card.appendChild(title);
        card.appendChild(temperature);
        card.appendChild(precipitation);
        card.appendChild(description);

        forecastList.appendChild(card);
    });
}

async function loadDailyForecast(city) {
    forecastList.replaceChildren();
    forecastStatus.textContent = "Consultando previsão...";

    try {
        const daily = await searchDailyForecast(city);

        renderDailyForecast(daily);
        forecastStatus.textContent = "";

    } catch (error) {
        forecastStatus.textContent = "Não foi possível consultar a previsão.";
        console.error(error);
    }
}

  // Salvar histórico das cidades
function saveRecentCity(city) {
    recentCities = recentCities.filter((savedCity) => {
        return savedCity.id !== city.id;
    });

    recentCities.unshift(city);
    recentCities = recentCities.slice(0, 5);

    localStorage.setItem(
        HISTORY_STORAGE_KEY,
        JSON.stringify(recentCities)
    );

    renderRecentCities();
}

function renderRecentCities() {
    recentCitiesList.replaceChildren();

    if (recentCities.length === 0) {
        historyStatus.textContent = "Nenhuma cidade consultada recentemente.";
        return;
    }

    historyStatus.textContent = "";

    recentCities.forEach((city) => {
        const listItem = document.createElement("li");
        const button = document. createElement("button");

        button.type = "button";
        button.classList.add("recent-city-button");
        button.textContent = `${city.name}, ${city.country}`;
        button.addEventListener("click", () => {
            handleCitySelection(city);
        });

        listItem.appendChild(button);
        recentCitiesList.appendChild(listItem);
    });
}


  //integrar os clickes
async function handleCitySelection(city) {
    loadDailyForecast (city);
    weatherCard.hidden = true;
    weatherStatus.textContent = `Consultando o clima de ${city.name}...`;

    try {
        const weather = await searchCurrentWeather(city);

        renderCurrentWeather(city, weather);
        saveRecentCity(city);
        weatherStatus.textContent = "";

    } catch (error) {
        weatherStatus.textContent = "Não foi possível consultar o clima.";
        console.error(error);
    }
}


  // criar dinamicamente elementos HTML para cada cidade encontrada
function renderCities(cities) {
    cityResultsList.replaceChildren();

    cities.forEach((city) => {
        const listItem = document.createElement("li");
        const cityButton = document.createElement("button")
        const cityTitle = document.createElement("strong");
        const cityDetails = document.createElement("span");
        const coordinates = document.createElement("span");

        listItem.classList.add("city-result");
        cityButton.type = "button";

        cityTitle.textContent = city.name;

        cityDetails.textContent = [
            city.admin1,
            city.country
        ].filter(Boolean).join(", ");

        coordinates.textContent = `Lat: ${city.latitude} | Lon: ${city.longitude}`;

        cityButton.appendChild(cityTitle);
        cityButton.appendChild(cityDetails);
        cityButton.appendChild(coordinates);

        cityButton.addEventListener("click", () => {
            handleCitySelection(city);
        });

        listItem.appendChild(cityButton);
        cityResultsList.appendChild(listItem);
    });
}


  // ler e validar nome da cidade quando o formulário for enviado
async function handleCitySearch(event) {
    event.preventDefault();

    const cityName = cityInput.value.trim();

    if (!cityName) {
        searchStatus.textContent = "Digite um nome de cidade válido.";
        return;
    }

    cityResultsList.replaceChildren();
    searchStatus.textContent = "Pesquisando cidades...";

    const searchButton = citySearchForm.querySelector("button");
    searchButton.disabled = true;

    try {
        const cities = await searchCities(cityName);

        if (cities.length === 0) {
            searchStatus.textContent = "Nenhuma cidade encontrada.";
            return;
        }

        renderCities(cities);
        searchStatus.textContent = `${cities.length} localidade(s) encontrada(s).`;

    } catch (error) {
        searchStatus.textContent = "Erro ao consultar cidades. Tente novamente.";
        console.error(error);

    } finally {
        searchButton.disabled = false;
    }
}





// EVENTOS
  // executar função de pesquisar cidade
citySearchForm.addEventListener("submit", handleCitySearch);


// INICIALIZACAO
renderRecentCities();