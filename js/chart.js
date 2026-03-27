// chart.js
let correlationChart = null;

export function calculateCorrelation(x, y) {
    const n = x.length;
    if (n === 0) return 0;
    const meanX = x.reduce((a, b) => a + b, 0) / n;
    const meanY = y.reduce((a, b) => a + b, 0) / n;
    let sumXY = 0, sumX2 = 0, sumY2 = 0;
    for (let i = 0; i < n; i++) {
        const xDiff = x[i] - meanX;
        const yDiff = y[i] - meanY;
        sumXY += xDiff * yDiff;
        sumX2 += xDiff * xDiff;
        sumY2 += yDiff * yDiff;
    }
    if (sumX2 === 0 || sumY2 === 0) return 0;
    return sumXY / Math.sqrt(sumX2 * sumY2);
}

// Wartet, bis Chart.js geladen ist
async function waitForChart() {
    // Prüfe, ob Chart.js bereits global verfügbar ist
    if (window.Chart) return window.Chart;

    console.log("Warte auf Chart.js...");

    // Maximal 10 Sekunden warten (100 Versuche à 100ms)
    for (let i = 0; i < 100; i++) {
        await new Promise(resolve => setTimeout(resolve, 100));
        if (window.Chart) {
            console.log("Chart.js gefunden!");
            return window.Chart;
        }
    }

    throw new Error("Chart.js konnte nicht geladen werden");
}

export async function drawChart(data, partyName, indicatorName, indicatorUnit, partyColor) {
    console.log("drawChart aufgerufen mit", data?.length, "Punkten");

    const canvas = document.getElementById("correlationChart");
    if (!canvas) {
        console.error("Canvas nicht gefunden");
        return;
    }

    const ctx = canvas.getContext("2d");
    if (correlationChart) correlationChart.destroy();

    if (!data || data.length === 0) {
        console.warn("Keine Daten zum Zeichnen");
        return;
    }

    const xValues = data.map(d => d.x);
    const yValues = data.map(d => d.y);
    const rValue = calculateCorrelation(xValues, yValues);
    const rSquared = (rValue * rValue).toFixed(3);

    try {
        // Warte auf Chart.js
        const ChartJS = await waitForChart();

        console.log("Chart wird erstellt mit", data.length, "Punkten");

        correlationChart = new Chart(ctx, {
            type: "scatter",
            data: {
                datasets: [{
                    label: `${partyName} vs. ${indicatorName}`,
                    data: data,
                    backgroundColor: `${partyColor}CC`,
                    borderColor: partyColor,
                    pointRadius: 5,
                    pointHoverRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: { display: true, text: `Korrelation: ${partyName} vs. ${indicatorName}` },
                    subtitle: { display: true, text: `R = ${rValue.toFixed(3)} | R² = ${rSquared}`, position: 'top', align: 'end' },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                const point = context.raw;
                                return [
                                    `${point.constituency || 'Unbekannt'}`,
                                    `${partyName}: ${point.y.toFixed(1)}%`,
                                    `${indicatorName}: ${point.x.toFixed(1)} ${indicatorUnit}`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: { title: { display: true, text: `${indicatorName} (${indicatorUnit})` } },
                    y: { title: { display: true, text: `${partyName} (%)` }, beginAtZero: true }
                }
            }
        });
        console.log("Chart erfolgreich erstellt");
    } catch (error) {
        console.error("Fehler beim Erstellen des Charts:", error);
    }
}