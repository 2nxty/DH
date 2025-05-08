let exchangeRate = null;
let chart = null;

const now = new Date();
const year = now.getFullYear();
const month = String(now.getMonth() + 1).padStart(2, '0');
const day = String(now.getDate()).padStart(2, '0');
const dateElement = document.getElementById('date');
const titleElement = document.querySelector('title');
const metaDescription = document.querySelector('meta[name="description"]');
const currentDate = `${day}/${month}/${year}`;
dateElement.textContent = currentDate;

async function fetchPrice() {
    const priceElement = document.getElementById('price');
    
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=brl');
        const data = await response.json();
        
        if (data.tether && data.tether.brl) {
            exchangeRate = data.tether.brl;
            const priceText = `R$${exchangeRate.toFixed(2)}`;
            priceElement.textContent = priceText;
            titleElement.textContent = `Dólar Hoje é ${priceText}`;
            metaDescription.setAttribute('content', `O Valor do Dólar Hoje, ${currentDate}, é de ${priceText}`);
            updateConverter();
        } else {
            priceElement.textContent = 'Erro ao carregar preço';
            titleElement.textContent = 'Dólar Hoje - Erro';
            metaDescription.setAttribute('content', `O Valor do Dólar Hoje, ${currentDate}, não pôde ser carregado`);
        }
    } catch (error) {
        priceElement.textContent = 'Erro ao conectar à API';
        titleElement.textContent = 'Dólar Hoje - Erro';
        metaDescription.setAttribute('content', `O Valor do Dólar Hoje, ${currentDate}, não pôde ser carregado`);
        console.error('Erro:', error);
    }
}

async function fetchChartData() {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/coins/tether/market_chart?vs_currency=brl&days=7');
        const data = await response.json();
        
        if (data.prices) {
            const labels = data.prices.map(price => {
                const date = new Date(price[0]);
                return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            });
            const prices = data.prices.map(price => price[1]);
            
            if (chart) {
                chart.destroy();
            }

            const ctx = document.getElementById('priceChart').getContext('2d');
            chart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Preço USD (BRL)',
                        data: prices,
                        borderColor: '#6495ed',
                        backgroundColor: 'rgba(100, 149, 237, 0.2)',
                        fill: true,
                        tension: 0.2,
                        pointRadius: 0
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return `R$ ${context.parsed.y.toFixed(2)}`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: { display: true, title: { display: true, text: 'Data', color: '#e0e7ff' }, ticks: { color: '#e0e7ff' } },
                        y: {
                            display: true,
                            title: { display: true, text: 'Valor', color: '#e0e7ff' },
                            ticks: {
                                color: '#e0e7ff',
                                callback: function(value) {
                                    return `R$ ${value.toFixed(2)}`;
                                }
                            }
                        }
                    }
                }
            });
        }
    } catch (error) {
        console.error('Erro ao carregar dados do gráfico:', error);
    }
}

function updateConverter() {
    const usdInput = document.getElementById('usd-input');
    const brlInput = document.getElementById('brl-input');

    if (!exchangeRate) return;

    usdInput.addEventListener('input', () => {
        const usdValue = parseFloat(usdInput.value) || 0;
        brlInput.value = (usdValue * exchangeRate).toFixed(2);
    });

    brlInput.addEventListener('input', () => {
        const brlValue = parseFloat(brlInput.value) || 0;
        usdInput.value = (brlValue / exchangeRate).toFixed(2);
    });
}

// Carrega o preço e o gráfico ao iniciar a página
fetchPrice();
fetchChartData();

// Atualiza o preço automaticamente a cada 120 segundos
setInterval(fetchPrice, 120000);