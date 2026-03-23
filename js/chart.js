// js/chart.js
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

export function drawChart(data, partyName, indicatorName, indicatorUnit, partyColor) {
    const canvas = document.getElementById("correlationChart");
    if (!canvas) return;
    
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
                title: {
                    display: true,
                    text: `Korrelation: ${partyName} vs. ${indicatorName}`,
                    font: { size: 16 }
                },
                subtitle: {
                    display: true,
                    text: `R = ${rValue.toFixed(3)} | R² = ${rSquared}`,
                    position: 'top',
                    align: 'end',
                    color: 'rgba(0, 0, 0, 0.7)',
                    font: { size: 14, weight: 'bold' }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${partyName}: ${context.parsed.y.toFixed(1)}%, ${indicatorName}: ${context.parsed.x.toFixed(1)} ${indicatorUnit}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: `${indicatorName} (${indicatorUnit})`
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: `${partyName} (%)`
                    },
                    beginAtZero: true
                }
            }
        }
    });
}