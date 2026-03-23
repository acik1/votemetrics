import { supabase } from './config.js';
import { drawChart } from './chart.js';
import { 
    loadMetadata, getElections, getStructuralTables, 
    loadScatterData, getPartyColumns, getIndicatorColumns 
} from './dataLoader.js';

// ========== SEITEN-RENDERER ==========
async function renderHome() {
    const contentDiv = document.getElementById('content');
    contentDiv.innerHTML = `
        <div class="page-container">
            <h1>Welcome to VoteMetrics</h1>
            <p>Explore correlations between election results and social/economic indicators.</p>

    `;

}

async function renderAnalyse() {
    await loadMetadata();
    
    const contentDiv = document.getElementById('content');
    contentDiv.innerHTML = `
        <div class="page-container">
            <h1>Korrelationsanalyse</h1>
            
            <div class="controls">
                <div class="control-group">
                    <label>🌍 Land / Wahl:</label>
                    <select id="election-select"></select>
                </div>
                <div class="control-group">
                    <label>📂 Datenbereich:</label>
                    <select id="category-select"></select>
                </div>
                <div class="control-group">
                    <label>🎯 Partei:</label>
                    <select id="party-select"></select>
                </div>
                <div class="control-group">
                    <label>📊 Indikator:</label>
                    <select id="indicator-select"></select>
                </div>
            </div>
            
            <div class="chart-container">
                <canvas id="correlationChart"></canvas>
            </div>
        </div>
    `;
    
    await initAnalyseDropdowns();
}

async function initAnalyseDropdowns() {
    const elections = getElections();
    const electionSelect = document.getElementById('election-select');
    
    electionSelect.innerHTML = elections.map(e => 
        `<option value="${e.id}">${e.flag} ${e.country} ${e.year}</option>`
    ).join('');
    
    electionSelect.addEventListener('change', async () => {
        await updateCategories();
        await updateParties();
        await loadChart();
    });
    
    document.getElementById('category-select').addEventListener('change', async () => {
        await updateIndicators();
        await loadChart();
    });
    document.getElementById('party-select').addEventListener('change', () => loadChart());
    document.getElementById('indicator-select').addEventListener('change', () => loadChart());
    
    await updateCategories();
    await updateParties();
    await updateIndicators();
    await loadChart();
}

async function updateCategories() {
    const electionId = document.getElementById('election-select').value;
    const tables = getStructuralTables(electionId);
    const categorySelect = document.getElementById('category-select');
    
    categorySelect.innerHTML = tables.map(t => 
        `<option value="${t.table_name}">${t.category}</option>`
    ).join('');
    
    await updateIndicators();
}

async function updateParties() {
    const electionId = document.getElementById('election-select').value;
    const parties = await getPartyColumns(electionId);
    const partySelect = document.getElementById('party-select');
    
    partySelect.innerHTML = parties.map(p => 
        `<option value="${p}">${p.replace(/_/g, ' ').toUpperCase()}</option>`
    ).join('');
}

async function updateIndicators() {
    const tableName = document.getElementById('category-select').value;
    if (!tableName) return;
    
    const indicators = await getIndicatorColumns(tableName);
    const indicatorSelect = document.getElementById('indicator-select');
    
    indicatorSelect.innerHTML = indicators.map(i => 
        `<option value="${i}">${i.replace(/_/g, ' ')}</option>`
    ).join('');
}

async function loadChart() {
    const electionId = document.getElementById('election-select')?.value;
    const tableName = document.getElementById('category-select')?.value;
    const partyKey = document.getElementById('party-select')?.value;
    const indicatorKey = document.getElementById('indicator-select')?.value;
    
    if (!electionId || !tableName || !partyKey || !indicatorKey) return;
    
    try {
        const data = await loadScatterData(electionId, tableName, partyKey, indicatorKey);
        
        const partyName = partyKey.replace(/_/g, ' ').toUpperCase();
        const indicatorName = indicatorKey.replace(/_/g, ' ');
        
        drawChart(data, partyName, indicatorName, '', '#FDB913');
    } catch (error) {
        console.error('Fehler beim Laden:', error);
        const canvas = document.getElementById('correlationChart');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'red';
            ctx.font = '14px Arial';
            ctx.fillText('Fehler beim Laden der Daten', 10, 50);
        }
    }
}

function renderBlog() {
    document.getElementById('content').innerHTML = `
        <div class="page-container">
            <h1>Blog</h1>
            <p>Hier erscheinen bald Artikel zu spannenden Korrelationen und Wahlanalysen.</p>
            <div class="blog-teaser">
                <h3>Coming soon...</h3>
                <p>Erste Analysen: PKW-Dichte und CDU-Ergebnisse</p>
            </div>
        </div>
    `;
}

function renderFaq() {
    document.getElementById('content').innerHTML = `
        <div class="page-container">
            <h1>FAQ</h1>
            <div class="faq-item">
                <h3>Wie werden die Korrelationen berechnet?</h3>
                <p>Wir verwenden den Pearson-Korrelationskoeffizienten (R) und das Bestimmtheitsmaß (R²).</p>
            </div>
            <div class="faq-item">
                <h3>Woher kommen die Daten?</h3>
                <p>Alle Daten stammen von öffentlichen Quellen: Bundeswahlleiter, Destatis, KSH und anderen statistischen Ämtern.</p>
            </div>
            <div class="faq-item">
                <h3>Kann ich die Daten exportieren?</h3>
                <p>In der Premium-Version ist der Export als CSV und PNG geplant.</p>
            </div>
        </div>
    `;
}

function renderKontakt() {
    document.getElementById('content').innerHTML = `
        <div class="page-container">
            <h1>Kontakt</h1>
            <p>Du hast Fragen, Feedback oder willst neue Daten beisteuern?</p>
            <form id="contact-form">
                <input type="email" placeholder="Deine E-Mail" required>
                <textarea placeholder="Deine Nachricht" rows="5" required></textarea>
                <button type="submit">Absenden</button>
            </form>
            <p class="contact-note">Oder schreib direkt an: <a href="mailto:info@votemetrics.de">info@votemetrics.de</a></p>
        </div>
    `;
    document.getElementById('contact-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        alert('Danke! Wir melden uns bald.');
        e.target.reset();
    });
}

// ========== NAVIGATION ==========
function initNavigation() {
    const pages = {
        home: renderHome,
        analyse: renderAnalyse,
        blog: renderBlog,
        faq: renderFaq,
        kontakt: renderKontakt
    };
    
    document.querySelectorAll('nav a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.dataset.page;
            if (pages[page]) {
                pages[page]();
                document.querySelectorAll('nav a').forEach(a => a.classList.remove('active'));
                link.classList.add('active');
            }
        });
    });
    
    renderHome();
}

initNavigation();