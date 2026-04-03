import { supabase } from './config.js';
import { drawChart } from './chart.js';
import {
    loadMetadata, getElections, getStructuralTables,
    loadScatterData, getPartyColumns, getIndicatorColumns
} from './dataLoader.js';

// ========== SEITEN-REGISTRIERUNG ==========
const pages = {
    home: renderHome,
    analyse: renderAnalyse,
    matrix: renderMatrix,
    blog: renderBlog,
    faq: renderFaq,
    kontakt: renderKontakt
};

// ========== SEITEN-RENDERER ==========
async function renderHome() {
    const contentDiv = document.getElementById('content');
    contentDiv.innerHTML = `
        <div class="page-container">
            <h1>Welcome to VoteMetrics</h1>
            <button class="cta-button" id="go-to-analyse">Analysis →</button>
        </div>
    `;
    document.getElementById('go-to-analyse')?.addEventListener('click', () => {
        document.querySelector('a[data-page="analyse"]').click();
    });
}

async function renderAnalyse() {
    console.log("1. renderAnalyse gestartet");
    await loadMetadata();

    const contentDiv = document.getElementById('content');
    contentDiv.innerHTML = `
        <div class="page-container">
            <h1>Correlation Analysis</h1>
            <p>Select country, election, party and indicator to visualize relationships.</p>
            
            <div class="controls">
                <div class="control-group">
                    <label>🌍 Country / Election:</label>
                    <select id="election-select"></select>
                </div>
                <div class="control-group">
                    <label>📂 Data Category:</label>
                    <select id="category-select"></select>
                </div>
                <div class="control-group">
                    <label>🎯 Party:</label>
                    <select id="party-select"></select>
                </div>
                <div class="control-group">
                    <label>📊 Indicator:</label>
                    <select id="indicator-select"></select>
                </div>
            </div>
            
            <div class="chart-container" style="height: 500px;">
                <canvas id="correlationChart"></canvas>
            </div>
        </div>
    `;

    // Dropdowns initialisieren (OHNE automatisches Laden)
    await initAnalyseDropdowns(true);  // true = skip initial load

    // ========== VORAUSGEWÄHLTE WERTE AUS MATRIX ÜBERNEHMEN ==========
    if (window.selectedParty && window.selectedIndicator) {
        console.log("Vorausgewählte Werte gefunden:", window.selectedParty, window.selectedIndicator);

        // Election auswählen
        const electionSelect = document.getElementById('election-select');
        if (window.selectedElection) {
            for (let i = 0; i < electionSelect.options.length; i++) {
                if (electionSelect.options[i].value === window.selectedElection) {
                    electionSelect.selectedIndex = i;
                    await updateCategories();
                    break;
                }
            }
        }

        // Kategorie auswählen
        const categorySelect = document.getElementById('category-select');
        if (window.selectedTable) {
            for (let i = 0; i < categorySelect.options.length; i++) {
                if (categorySelect.options[i].value === window.selectedTable) {
                    categorySelect.selectedIndex = i;
                    await updateIndicators();
                    break;
                }
            }
        }

        // Partei auswählen
        const partySelect = document.getElementById('party-select');
        for (let i = 0; i < partySelect.options.length; i++) {
            if (partySelect.options[i].value === window.selectedParty) {
                partySelect.selectedIndex = i;
                break;
            }
        }

        // Indikator auswählen
        const indicatorSelect = document.getElementById('indicator-select');
        for (let i = 0; i < indicatorSelect.options.length; i++) {
            if (indicatorSelect.options[i].value === window.selectedIndicator) {
                indicatorSelect.selectedIndex = i;
                break;
            }
        }

        // Jetzt erst den Chart laden
        await loadChart();

        // Auswahl zurücksetzen
        window.selectedParty = null;
        window.selectedIndicator = null;
        window.selectedTable = null;
        window.selectedElection = null;
    } else {
        // Keine vorausgewählten Werte → Standard-Chart laden
        await loadChart();
    }
}

async function initAnalyseDropdowns(skipInitialLoad = true) {
    console.log("initAnalyseDropdowns gestartet");
    const elections = getElections();
    const electionSelect = document.getElementById('election-select');

    if (!electionSelect) return;

    electionSelect.innerHTML = elections.map(e =>
        `<option value="${e.id}">${e.flag} ${e.country} ${e.year}</option>`
    ).join('');

    // Event-Listener immer aktiv (damit Änderungen funktionieren)
    electionSelect.addEventListener('change', async () => {
        await updateCategories();
        await updateParties();
        await updateIndicators();
        await loadChart();
    });

    const categorySelect = document.getElementById('category-select');
    const partySelect = document.getElementById('party-select');
    const indicatorSelect = document.getElementById('indicator-select');

    if (categorySelect) categorySelect.addEventListener('change', async () => {
        await updateIndicators();
        await loadChart();
    });
    if (partySelect) partySelect.addEventListener('change', () => loadChart());
    if (indicatorSelect) indicatorSelect.addEventListener('change', () => loadChart());

    await updateCategories();
    await updateParties();
    await updateIndicators();

    // Nur beim ersten Mal NICHT automatisch laden (wenn skipInitialLoad = true)
    if (!skipInitialLoad) {
        await loadChart();
    }
}
async function updateCategories() {
    const electionId = document.getElementById('election-select')?.value;
    if (!electionId) return;

    const tables = getStructuralTables(electionId);
    const categorySelect = document.getElementById('category-select');
    if (!categorySelect) return;

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
        `<option value="${p.column_name}">${p.display_name}</option>`
    ).join('');
}

async function updateIndicators() {
    const tableName = document.getElementById('category-select')?.value;
    if (!tableName) return;

    // Lade die Indikatoren mit ihren Anzeigenamen aus indicators_metadata
    const { data: indicators, error } = await supabase
        .from('indicators_metadata')
        .select('indicator_key, indicator_name, unit')
        .eq('table_name', tableName)
        .order('indicator_name');

    if (error) {
        console.error("Fehler beim Laden der Indikatoren:", error);
        return;
    }

    const indicatorSelect = document.getElementById('indicator-select');
    if (!indicatorSelect) return;

    indicatorSelect.innerHTML = indicators.map(i =>
        `<option value="${i.indicator_key}">${i.indicator_name} (${i.unit})</option>`
    ).join('');
}

async function loadChart() {
    const electionId = document.getElementById('election-select')?.value;
    const tableName = document.getElementById('category-select')?.value;
    const partyKey = document.getElementById('party-select')?.value;
    const indicatorKey = document.getElementById('indicator-select')?.value;

    console.log("🔍 loadChart started");
    console.log("   electionId:", electionId);
    console.log("   tableName:", tableName);
    console.log("   partyKey:", partyKey);
    console.log("   indicatorKey:", indicatorKey);

    if (!electionId || !tableName || !partyKey || !indicatorKey) {
        console.warn("⚠️ Not all dropdowns have values");
        return;
    }

    try {
        const data = await loadScatterData(electionId, tableName, partyKey, indicatorKey);
        console.log("📊 Data from loadScatterData:", data);
        console.log("   Number of data points:", data?.length);

        if (!data || data.length === 0) {
            console.warn("⚠️ No data returned");
            return;
        }

        const partyName = partyKey.replace(/_/g, ' ').toUpperCase();
        const indicatorName = indicatorKey.replace(/_/g, ' ');

        console.log("🎨 Drawing chart with", data.length, "points");
        drawChart(data, partyName, indicatorName, '', '#FDB913');

    } catch (error) {
        console.error('❌ Error loading chart:', error);
    }
}

function renderBlog() {
    document.getElementById('content').innerHTML = `
        <div class="page-container">
            <h1>Blog</h1>
            <p>Soon: articles on interesting correlations and election analyses.</p>
            <div class="blog-teaser">
                <h3>Coming soon...</h3>
                <p>First analysis: Car density and CDU results</p>
            </div>
        </div>
    `;
}

function renderFaq() {
    document.getElementById('content').innerHTML = `
        <div class="page-container">
            <h1>Frequently Asked Questions</h1>
            <div class="faq-item">
                <h3>How are correlations calculated?</h3>
                <p>We use the Pearson correlation coefficient (R) and the coefficient of determination (R²).</p>
            </div>
            <div class="faq-item">
                <h3>Where does the data come from?</h3>
                <p>All data comes from public sources: Federal Returning Officer, Destatis, KSH and other statistical offices.</p>
            </div>
            <div class="faq-item">
                <h3>Can I export the data?</h3>
                <p>In the premium version, export as CSV and PNG is planned.</p>
            </div>
        </div>
    `;
}

function renderKontakt() {
    document.getElementById('content').innerHTML = `
        <div class="page-container">
            <h1>Contact</h1>
            <p>Questions, feedback, or want to contribute data?</p>
            <form id="contact-form">
                <input type="email" placeholder="Your email" required>
                <textarea placeholder="Your message" rows="5" required></textarea>
                <button type="submit">Send</button>
            </form>
            <p class="contact-note">Or write directly to: <a href="mailto:info@votemetrics.de">info@votemetrics.de</a></p>
        </div>
    `;
    document.getElementById('contact-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        alert('Thank you! We will get back to you soon.');
        e.target.reset();
    });
}

// ========== MATRIX ==========

async function renderMatrix() {
    await loadMetadata();

    const contentDiv = document.getElementById('content');
    contentDiv.innerHTML = `
        <div class="page-container">
            <h1>Correlation Matrix</h1>
            <p>Click on a cell to open the scatter plot.</p>
            
            <div class="controls">
                <div class="control-group">
                    <label>🇭🇺 Election:</label>
                    <select id="matrix-election-select"></select>
                </div>
            </div>
            
            <div id="matrix-container" style="overflow-x: auto;">
                <div class="loader"></div>
            </div>
        </div>
    `;

    const electionSelect = document.getElementById('matrix-election-select');
    const elections = getElections();
    electionSelect.innerHTML = elections.map(e =>
        `<option value="${e.id}">${e.flag} ${e.country} ${e.year}</option>`
    ).join('');

    electionSelect.addEventListener('change', () => loadMatrix());

    await loadMatrix();
}
async function loadMatrix() {
    const electionId = document.getElementById('matrix-election-select').value;
    if (!electionId) return;

    try {
        // 1. Korrelationen laden
        const { data: correlations, error: corrError } = await supabase
            .from('correlations_matrix')
            .select('*')
            .eq('election_id', electionId);

        if (corrError) throw corrError;

        if (!correlations || correlations.length === 0) {
            document.getElementById('matrix-container').innerHTML =
                '<p>No correlations found. Please run the Python script first.</p>';
            return;
        }

        // 2. Metadaten für schöne Anzeigenamen laden
        const { data: indicatorsMeta } = await supabase
            .from('indicators_metadata')
            .select('indicator_key, indicator_name, unit')
            .eq('election_id', electionId);

        const indicatorNameMap = new Map();
        const indicatorUnitMap = new Map();
        indicatorsMeta?.forEach(meta => {
            indicatorNameMap.set(meta.indicator_key, meta.indicator_name);
            indicatorUnitMap.set(meta.indicator_key, meta.unit);
        });

        // 3. Election-Tabelle für Parteien-Reihenfolge laden
        const { data: electionMeta } = await supabase
            .from('elections_metadata')
            .select('election_table')
            .eq('id', electionId)
            .single();

        const { data: electionSample } = await supabase
            .from(electionMeta.election_table)
            .select('*')
            .limit(1);

        // Parteien in originaler Reihenfolge
        const allColumns = Object.keys(electionSample[0]);
        const parties = allColumns.filter(col =>
            col.endsWith('_list') &&
            !['valid_votes_list', 'valid_votes_pct_list'].includes(col)
        );

        // 4. Party-Metadaten für schöne Namen laden
        const { data: partyMeta } = await supabase
            .from('party_metadata')
            .select('column_name, display_name')
            .eq('election_id', electionId);

        const partyNameMap = new Map();
        partyMeta?.forEach(p => {
            partyNameMap.set(p.column_name, p.display_name);
        });

        // 5. Indikatoren aus Korrelationen
        const indicators = [...new Map(correlations.map(c => [c.indicator_key, c.indicator_key])).keys()];

        // Sortierzustand
        let currentSortColumn = null;
        let currentSortDirection = 'desc';

        function renderMatrix() {
            let sortedIndicators = [...indicators];

            if (currentSortColumn) {
                sortedIndicators.sort((a, b) => {
                    const corrA = correlations.find(c =>
                        c.party_key === currentSortColumn && c.indicator_key === a);
                    const corrB = correlations.find(c =>
                        c.party_key === currentSortColumn && c.indicator_key === b);
                    const rA = corrA?.r_value || 0;
                    const rB = corrB?.r_value || 0;

                    if (currentSortDirection === 'asc') {
                        return Math.abs(rA) - Math.abs(rB);
                    } else {
                        return Math.abs(rB) - Math.abs(rA);
                    }
                });
            }

            let html = '<table class="correlation-matrix"><thead><tr><th></th>';

            parties.forEach(party => {
                // Schöner Name aus party_metadata, fallback auf Original
                const partyDisplay = partyNameMap.get(party) || party;
                const sortIndicator = (currentSortColumn === party)
                    ? (currentSortDirection === 'asc' ? ' ↑' : ' ↓')
                    : '';
                html += `<th data-party="${party}" class="sortable-header">${partyDisplay}${sortIndicator}</th>`;
            });
            html += '<tr></thead><tbody>';

            sortedIndicators.forEach(indicator => {
                const displayName = indicatorNameMap.get(indicator) || indicator.replace(/_/g, ' ');
                const unit = indicatorUnitMap.get(indicator) || '';
                const displayText = unit ? `${displayName} (${unit})` : displayName;

                html += `<tr><td style="font-weight: bold;">${displayText}</td>`;

                parties.forEach(party => {
                    const corr = correlations.find(c =>
                        c.party_key === party &&
                        c.indicator_key === indicator
                    );
                    const r = corr?.r_value || 0;
                    const absR = Math.abs(r);
                    let intensity = 0;
                    let color = 'rgba(236, 236, 236, 0.5)';  // Neutral

                    if (absR >= 0.15) {
                        intensity = Math.min((absR - 0.15) / 0.85, 1) * 0.7 + 0.2;
                        color = r > 0
                            ? `rgba(75, 192, 192, ${intensity})`
                            : `rgba(255, 99, 132, ${intensity})`;
                    }
                    const displayR = r.toFixed(2);

                    html += `<td class="matrix-cell" 
                        style="background-color: ${color}; cursor: pointer;"
                        data-party="${party}"
                        data-indicator="${indicator}"
                        data-table="${corr?.table_name || ''}"
                        title="R = ${displayR} (${corr?.sample_size || 0} cases)">
                        ${displayR}
                     </td>`;
                });
                html += '</tr>';
            });

            html += '</tbody></table>';
            document.getElementById('matrix-container').innerHTML = html;

            // Event-Listener
            document.querySelectorAll('.matrix-cell').forEach(cell => {
                cell.addEventListener('click', () => {
                    window.selectedParty = cell.dataset.party;
                    window.selectedIndicator = cell.dataset.indicator;
                    window.selectedTable = cell.dataset.table;
                    window.selectedElection = electionId;
                    document.querySelector('a[data-page="analyse"]').click();
                });
            });

            document.querySelectorAll('.sortable-header').forEach(header => {
                header.addEventListener('click', () => {
                    const clickedParty = header.dataset.party;
                    if (currentSortColumn === clickedParty) {
                        currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
                    } else {
                        currentSortColumn = clickedParty;
                        currentSortDirection = 'desc';
                    }
                    renderMatrix();
                });
            });
        }

        renderMatrix();

    } catch (error) {
        console.error("Error in loadMatrix:", error);
        document.getElementById('matrix-container').innerHTML =
            `<p style="color: red;">Error: ${error.message}</p>`;
    }
}

// ========== NAVIGATION ==========
function initNavigation() {
    const navLinks = document.querySelectorAll('nav a');
    const navTexts = {
        home: 'Home',
        analyse: 'Analysis',
        matrix: 'Matrix',
        blog: 'Blog',
        faq: 'FAQ',
        kontakt: 'Contact'
    };

    navLinks.forEach(link => {
        const page = link.dataset.page;
        link.textContent = navTexts[page] || page;
    });

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.dataset.page;
            if (pages[page]) {
                pages[page]();
                navLinks.forEach(a => a.classList.remove('active'));
                link.classList.add('active');
            }
        });
    });
}

// ========== INIT ==========
async function init() {
    initNavigation();
    renderHome();
}

init();