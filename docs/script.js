let exchangeRate = null;
let chart = null;

// ── Date ──────────────────────────────────────────────────────
const now = new Date();
const currentDate = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
document.getElementById('date').textContent = currentDate;

// ── Helpers ───────────────────────────────────────────────────
function fmt(value, decimals = 2) {
    return `R$\u00a0${value.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

function setError(id) {
    const el = document.getElementById(id);
    if (el) el.textContent = '—';
}

// ── Main price fetch (CoinGecko: USDT, BTC, ETH) ─────────────
async function fetchCryptoPrice() {
    const priceEl   = document.getElementById('price');
    const btcEl     = document.getElementById('btc-price');
    const ethEl     = document.getElementById('eth-price');

    try {
        const res  = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=tether,bitcoin,ethereum&vs_currencies=brl');
        const data = await res.json();

        // USD (USDT proxy)
        if (data.tether?.brl) {
            exchangeRate = data.tether.brl;
            const priceText = fmt(exchangeRate);
            priceEl.textContent = priceText;
            document.title = `Dólar Hoje é ${priceText}`;
            document.querySelector('meta[name="description"]')
                .setAttribute('content', `O Valor do Dólar Hoje, ${currentDate}, é de ${priceText}`);
            updateConverter();
        } else {
            setError('price');
        }

        // BTC
        if (data.bitcoin?.brl) {
            btcEl.textContent = fmt(data.bitcoin.brl, 0);
        } else { setError('btc-price'); }

        // ETH
        if (data.ethereum?.brl) {
            ethEl.textContent = fmt(data.ethereum.brl, 0);
        } else { setError('eth-price'); }

    } catch (err) {
        ['price', 'btc-price', 'eth-price'].forEach(setError);
        console.error('Crypto fetch error:', err);
    }
}

// ── FX fetch (EUR, CAD via exchangerate-api free endpoint) ────
async function fetchFxRates() {
    const eurEl = document.getElementById('eur-price');
    const cadEl = document.getElementById('cad-price');

    try {
        // Using exchangerate-api open endpoint (no key needed for BRL base)
        const res  = await fetch('https://api.exchangerate-api.com/v4/latest/BRL');
        const data = await res.json();

        if (data.rates) {
            const brlPerEur = data.rates.EUR ? (1 / data.rates.EUR) : null;
            const brlPerCad = data.rates.CAD ? (1 / data.rates.CAD) : null;

            if (brlPerEur) eurEl.textContent = fmt(brlPerEur);
            else setError('eur-price');

            if (brlPerCad) cadEl.textContent = fmt(brlPerCad);
            else setError('cad-price');
        }
    } catch (err) {
        setError('eur-price');
        setError('cad-price');
        console.error('FX fetch error:', err);
    }
}

// ── Chart (7-day USD/BRL via USDT) ───────────────────────────
async function fetchChartData() {
    try {
        const res  = await fetch('https://api.coingecko.com/api/v3/coins/tether/market_chart?vs_currency=brl&days=7');
        const data = await res.json();

        if (!data.prices) return;

        const labels = data.prices.map(p =>
            new Date(p[0]).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
        );
        const prices = data.prices.map(p => p[1]);

        if (chart) chart.destroy();

        const ctx = document.getElementById('priceChart').getContext('2d');

        // Gradient fill
        const gradient = ctx.createLinearGradient(0, 0, 0, 220);
        gradient.addColorStop(0, 'rgba(0,212,170,0.18)');
        gradient.addColorStop(1, 'rgba(0,212,170,0)');

        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'USD/BRL',
                    data: prices,
                    borderColor: '#00d4aa',
                    borderWidth: 1.5,
                    backgroundColor: gradient,
                    fill: true,
                    tension: 0.35,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    pointHoverBackgroundColor: '#00d4aa',
                }]
            },
            options: {
                responsive: true,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#18181d',
                        borderColor: 'rgba(255,255,255,0.08)',
                        borderWidth: 1,
                        titleColor: '#9090a8',
                        bodyColor: '#00d4aa',
                        titleFont: { family: 'DM Mono', size: 10 },
                        bodyFont:  { family: 'DM Mono', size: 14, weight: '500' },
                        padding: 12,
                        callbacks: {
                            label: ctx => `R$ ${ctx.parsed.y.toFixed(2)}`
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
                        ticks: {
                            color: '#4a4a5e',
                            font: { family: 'DM Mono', size: 10 },
                            maxTicksLimit: 7,
                        },
                        border: { display: false }
                    },
                    y: {
                        position: 'right',
                        grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
                        ticks: {
                            color: '#4a4a5e',
                            font: { family: 'DM Mono', size: 10 },
                            callback: v => `R$${v.toFixed(2)}`
                        },
                        border: { display: false }
                    }
                }
            }
        });
    } catch (err) {
        console.error('Chart fetch error:', err);
    }
}

// ── Converter ─────────────────────────────────────────────────
function updateConverter() {
    if (!exchangeRate) return;
    const usdInput = document.getElementById('usd-input');
    const brlInput = document.getElementById('brl-input');

    // Prevent duplicate listeners
    const usdClone = usdInput.cloneNode(true);
    const brlClone = brlInput.cloneNode(true);
    usdInput.replaceWith(usdClone);
    brlInput.replaceWith(brlClone);

    document.getElementById('usd-input').addEventListener('input', e => {
        const v = parseFloat(e.target.value) || 0;
        document.getElementById('brl-input').value = (v * exchangeRate).toFixed(2);
    });

    document.getElementById('brl-input').addEventListener('input', e => {
        const v = parseFloat(e.target.value) || 0;
        document.getElementById('usd-input').value = (v / exchangeRate).toFixed(2);
    });
}

// ── Init ──────────────────────────────────────────────────────
fetchCryptoPrice();
fetchFxRates();
fetchChartData();

setInterval(fetchCryptoPrice, 120_000);
setInterval(fetchFxRates,     120_000);