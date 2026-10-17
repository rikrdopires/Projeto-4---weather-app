// CONSTANTES

console.log("teste: js carregado")
// SELETORES DOM
   // consulte clima cidade
const citySearchForm = document.getElementById("city-search-form");
const cityInput = document.getElementById("city-input");


// ESTADOS


// FUNCOES
  // ler e validar nome da cidade quando o formulário for enviado
function handleCitySearch(event) {
    event.preventDefaut();

    console.log("teste: disparo")

    const cityName = cityInput.value.trim();

    if (!cityName) {
        console.log("Digite um nome de cidade válido.");
        return;
    }

    console.log("Cidade pesquisada: ", cityName)
}

// EVENTOS
  // executar função de pesquisar cidade
citySearchForm.addEventListener("submit", handleCitySearch);


// INICIALIZACAO