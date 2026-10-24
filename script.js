// CONSTANTES
  // armazenar endereço API
const GEOCODING_API_URL = "https://geocoding-api.open-meteo.com/v1/search";

const WEATHER_API_URL = "https://api.open-meteo.com/v1/forecast";

const HISTORY_STORAGE_KEY = "weather-recent-cities";

const THEME_STORAGE_KEY = "weather-theme";

const FIRST_HISTORICAL_YEAR = 1940;

const HISTORICAL_API_URL = "https://archive-api.open-meteo.com/v1/archive";



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

  // Tema escuro
const themeToggle = document.getElementById("theme-toggle");

  // Histórico climático - controle de intervalo
const startYearSelect = document.getElementById("start-year");
const endYearSelect = document.getElementById("end-year");
const historicalStatus = document.getElementById("historical-status");

const loadHistoryButton = document.getElementById("load-history");
const historicalSummary = document.getElementById("historical-summary");

    // Graficos climáticos
const climateCharts = document.getElementById("climate-charts");


// ESTADOS
  // Recuperar dados armazenados - cidades anteriores pesquisadas
let recentCities = JSON.parse(
    localStorage.getItem(HISTORY_STORAGE_KEY) || "[]"
);

  //  Tema escuro
let currentTheme = localStorage.getItem(THEME_STORAGE_KEY) === "dark"
    ? "dark"
    : "light";

  // Histórico climático
let selectedCity = null;
let startYear = null;
let endYear = null;

let historicalData = null;

    // Grafico climatico
let climateChartInstances = [];



// FUNCOES
  // Historico climatico - criar as opções de ano para ambos os campos
function populateYearSelects() {
    const lastCompleteYear = new Date().getFullYear() - 1;

    for (
        let year = lastCompleteYear;
        year >= FIRST_HISTORICAL_YEAR;
        year--
    ) {
        const startOption = document.createElement("option");
        const endOption = document.createElement("option");

        startOption.value = year;
        startOption.textContent = year;

        endOption.value = year;
        endOption.textContent = year;

        startYearSelect.appendChild(startOption);
        endYearSelect.appendChild(endOption);
    }
}

function updateHistoricalSelection() {
    historicalData = null;
    historicalSummary.hidden = true;
    destroyClimateCharts();

    if (!selectedCity) {
        historicalStatus.textContent = "Selecione uma cidade para a análise.";
        return;
    }

    if (startYear === null || endYear === null) {
        historicalStatus.textContent = "Selecione o ano inicial e o ano final.";
        return;
    }

    if (startYear > endYear) {
        historicalStatus.textContent = "O ano inicial não pode ser maior que o ano final.";
        return;
    }

    const totalYears = endYear - startYear + 1;

    historicalStatus.textContent = 
        `Período selecionado: ${selectedCity.name}, ${selectedCity.country} — ${startYear} a ${endYear} (${totalYears} anos).`;
}

function handlePeriodChange() {
    startYear = startYearSelect.value
        ? Number(startYearSelect.value)
        : null;

    endYear = endYearSelect.value
        ? Number(endYearSelect.value)
        : null;
    
    updateHistoricalSelection();
}


  // Aplicar e alterar tema
function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;

    const isDark = theme === "dark";

    themeToggle.textContent = isDark ? "Modo claro" : "Modo escuro";
    themeToggle.setAttribute(
        "aria-label",
        isDark ? "Ativar modo claro" : "Ativar modo escuro"
    );
    themeToggle.setAttribute("aria-pressed", String(isDark));

    if (historicalData && climateChartInstances.length > 0) {
        renderClimateCharts(historicalData);
    }
}

function toggleTheme() {
    currentTheme = currentTheme === "light" ? "dark" : "light";

    localStorage.setItem(THEME_STORAGE_KEY, currentTheme);
    applyTheme(currentTheme);
}


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


async function searchHistoricalWeather(city, firstYear, lastYear) {  //consultar a API histórica
    const variables = "temperature_2m_mean,precipitation_sum";

    const startDate = `${firstYear}-01-01`;
    const endDate = `${lastYear}-12-31`;

    const url = `${HISTORICAL_API_URL}?latitude=${city.latitude}&longitude=${city.longitude}&start_date=${startDate}&end_date=${endDate}&daily=${variables}&timezone=auto&models=era5`;
    const response = await fetch(url);

    if (!response.ok) {
    throw new Error(`Falha na consulta histórica: HTTP ${response.status}`);
    }
    
    const data = await response.json();

    if (!data.daily) {
        throw new Error("A API não retornou dados diários.");
    }

    return data.daily;
}

function processHistoricalData(daily, firstYear, lastYear) {  //transformar registros diários em dados da análise climática
    const annualBuckets = {};
    const monthlyBuckets = {};

    for (let year = firstYear; year <= lastYear; year++) {
        annualBuckets[year] = {
            temperatureSum: 0,
            precipitationSum: 0,
            temperatureCount: 0,
            precipitationCount: 0
        };
    
        for (let month = 1; month <= 12; month++) {
            const key = `${year}-${month}`;
            monthlyBuckets[key] = {
                temperatureSum: 0,
                precipitationSum: 0,
                temperatureCount: 0,
                precipitationCount: 0
            };
        }
    }

    daily.time.forEach((date, index) => {
        const [year, month] = date.split("-").map(Number);
        const temperature = daily.temperature_2m_mean[index];
        const precipitation = daily.precipitation_sum[index];

        const annual = annualBuckets[year];
        const monthly = monthlyBuckets[`${year}-${month}`];

        if (Number.isFinite(temperature)) {
            annual.temperatureSum += temperature;
            annual.temperatureCount++;
            monthly.temperatureSum += temperature;
            monthly.temperatureCount++;
        }

        if (Number.isFinite(precipitation)) {
            annual.precipitationSum += precipitation;
            annual.precipitationCount++;
            monthly.precipitationSum += precipitation;
            monthly.precipitationCount++;
        }
    });

    const annualData = [];
    const monthlyTotals = Array.from({ length: 12 }, () => ({
        temperatureSum: 0,
        temperatureCount: 0,
        precipitationSum: 0,
        precipitationCount: 0
    }));

    for (let year = firstYear; year <= lastYear; year++) {
        const annual = annualBuckets[year];
        const expectedDays = new Date(year, 1, 29).getMonth() === 1 ? 366 : 365;

        // adicao temoraria para correcao de grafico
        console.log("Diagnóstico anual:", {
            year,
            expectedDays,
            precipitationSum: annual.precipitationSum,
            precipitationCount: annual.precipitationCount
        });
        // fim da adicao
        
        annualData.push({
            year,
            temperature: annual.temperatureCount === expectedDays
                ? annual.temperatureSum / annual.temperatureCount
                : null,
            precipitation: annual.precipitationCount === expectedDays
                ? annual.precipitationSum
                : null
        });

        for (let month = 1; month <= 12; month++) {
            const bucket = monthlyBuckets[`${year}-${month}`];
            const daysInMonth = new Date(year, month, 0).getDate();
            const total = monthlyTotals[month - 1];

            if (bucket.temperatureCount === daysInMonth) {
                total.temperatureSum += bucket.temperatureSum;
                total.temperatureCount += bucket.temperatureCount;
            }

            if (bucket.precipitationCount === daysInMonth) {
                total.precipitationSum += bucket.precipitationSum;
                total.precipitationCount++;
            }
        }
    }

    const monthNames = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez"
    ];

    const monthlyData = monthlyTotals.map((total, index) => ({
        month: monthNames[index],
        temperature: total.temperatureCount > 0
            ? total.temperatureSum / total.temperatureCount
            : null,
        precipitation: total.precipitationCount > 0
            ? total.precipitationSum / total.precipitationCount
            : null,
        precipitationYears: total.precipitationCount
    }));

    return {
        annual: annualData,
        monthly: monthlyData
    };
}

        // preparar para receber graficos
function destroyClimateCharts() {
    climateChartInstances.forEach((chart) => {
        chart.destroy();
    });

    climateChartInstances = [];
    climateCharts.hidden = true;
}

function createClimateChart(canvasId, type, labels, values, title, unit) {
    const isDark = currentTheme === "dark";

    const textColor = isDark ? "#f9fafb" : "#1d2939";
    const gridColor = isDark ? "#475569" : "#e2e8f0";

    const chartColor = type === "line" ? "#f59e0b" : "#38bdf8";

    const chart = new Chart(document.getElementById(canvasId), {
        type: type,
        data: {
            labels: labels,
            datasets: [{
                label: title,
                data: values,
                borderColor: chartColor,
                backgroundColor: chartColor,
                borderWidth: 2,
                tension: 0.25,
                spanGaps: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,

            plugins: {
                legend: {
                    labels: {
                        color: textColor
                    }
                },

                tooltip: {
                    callbacks: {
                        label: (context) => {
                            return `${title}: ${context.parsed.y} ${unit}`;
                        }
                    }
                }
            },

            scales: {
                x: {
                    ticks: {
                        color: textColor,
                        maxRotation: 45
                    },
                    grid: {
                        color: gridColor
                    }
                },
                y: {
                    beginAtZero: type === "bar",
                    ticks: {
                        color: textColor
                    },
                    grid: {
                        color: gridColor
                    },
                    title: {
                        display: true,
                        text: unit,
                        color: textColor
                    }
                }
            }
        }
    });

    climateChartInstances.push(chart);
}


function renderClimateCharts(data) {
    destroyClimateCharts();

    climateCharts.hidden = false;

    const years = data.annual.map((item) => item.year);
    const months = data.monthly.map((item) => item.month);

    createClimateChart(
        "annual-temperature-chart",
        "line",
        years,
        data.annual.map((item) => item.temperature),
        "Temperatura média anual",
        "°C"
    );

    createClimateChart(
        "annual-precipitation-chart",
        "bar",
        years,
        data.annual.map((item) => item.precipitation),
        "Precipitação anual",
        "mm"
    );

    createClimateChart(
        "monthly-temperature-chart",
        "line",
        months,
        data.monthly.map((item) => item.temperature),
        "Temperatura média mensal",
        "°C"
    );

    createClimateChart(
        "monthly-precipitation-chart",
        "bar",
        months,
        data.monthly.map((item) => item.precipitation),
        "Precipitação média mensal",
        "mm"
    );
}



function renderHistoricalSummary(data) {
    historicalSummary.replaceChildren();

    const title = document.createElement("h3");
    const annualInfo = document.createElement("p");
    const monthlyInfo = document.createElement("p");

    const validTemperatureYears = data.annual.filter(
        (item) => item.temperature !== null
    ).length;

    const validPrecipitationYears = data.annual.filter(
        (item) => item.precipitation !== null
    ).length;

    title.textContent = "Dados históricos preparados";

    annualInfo.textContent =
        `Análise anual: ${validTemperatureYears} anos com temperatura e ${validPrecipitationYears} anos com precipitação completas.`;
    
    monthlyInfo.textContent =
        "Análise mensal: 12 meses organizados para cálculo das médias do período.";
    historicalSummary.appendChild(title);
    historicalSummary.appendChild(annualInfo);
    historicalSummary.appendChild(monthlyInfo);

    historicalSummary.hidden = false;
}

async function handleHistoricalSearch() {
    if (!selectedCity || startYear === null || endYear === null) {
        historicalStatus.textContent = "Selecione uma cidade e o período.";
        return;
    }

    if (startYear > endYear) {
        historicalStatus.textContent = "O ano inicial não pode ser maior que o final.";
        return;
    }

    loadHistoryButton.disabled = true;
    historicalSummary.hidden = true;
    historicalData = null;
    historicalStatus.textContent = "Consultando dados históricos...";

    try {
        const daily = await searchHistoricalWeather(
            selectedCity,
            startYear,
            endYear
        );
        historicalData = processHistoricalData(
            daily,
            startYear,
            endYear
        );

        renderHistoricalSummary(historicalData);
        renderClimateCharts(historicalData);
        historicalStatus.textContent = "Consulta concluída.";

        console.table(historicalData.annual);
        console.table(historicalData.monthly);
    } catch (error) {
        historicalStatus.textContent = "Erro ao consultar o histórico climático.";
        console.error(error);
    } finally {
        loadHistoryButton.disabled = false;
    }

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
    selectedCity = city;
    updateHistoricalSelection();
    
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

 // alternancia de tema
themeToggle.addEventListener("click", toggleTheme);

  // Historico climatico - validar selecao de dadas
startYearSelect.addEventListener("change", handlePeriodChange);
endYearSelect.addEventListener("change", handlePeriodChange);

loadHistoryButton.addEventListener("click", handleHistoricalSearch);


// INICIALIZACAO
renderRecentCities();

applyTheme(currentTheme);

populateYearSelects();