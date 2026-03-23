import { supabase } from './config.js';
import { drawChart } from './chart.js';
import {
    loadMetadata, getElections, getStructuralTables,
    loadScatterData, getPartyColumns, getIndicatorColumns
} from './dataLoader.js';
import { t, loadLanguage, renderLanguageSwitcher, getCurrentLang } from './i18n.js';

function updatePageText() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.textContent = t(key);
    });
}

// ========== SEITEN-RENDERER ==========
async function renderHome() {
    const contentDiv = document.getElementById('content');
    contentDiv.innerHTML = `
        <div class="page-container">
            <h1 data-i18n="home_welcome">${t('home_welcome')}</h1>
            <p data-i18n="home_subtitle">${t('home_subtitle')}</p>
            <div class="feature-grid">
                <div class="feature-card">
                    <h3 data-i18n="feature_correlations">${t('feature_correlations')}</h3>
                    <p data-i18n="feature_correlations_text">${t('feature_correlations_text')}</p>
                </div>
                <div class="feature-card">
                    <h3 data-i18n="feature_countries">${t('feature_countries')}</h3>
                    <p data-i18n="feature_countries_text">${t('feature_countries_text')}</p>
                </div>
                <div class="feature-card">
                    <h3 data-i18n="feature_live">${t('feature_live')}</h3>
                    <p data-i18n="feature_live_text">${t('feature_live_text')}</p>
                </div>
            </div>
            <button class="cta-button" id="go-to-analyse">${t('nav_analyse')} →</button>
        </div>
    `;
    updatePageText();
    document.getElementById('go-to-analyse')?.addEventListener('click', () => {
        document.querySelector('a[data-page="analyse"]').click();
    });

}

async function renderAnalyse() {
    await loadMetadata();

    const contentDiv = document.getElementById('content');
    contentDiv.innerHTML = `
        <div class="page-container">
            <h1 data-i18n="analyse_title">${t('analyse_title')}</h1>
            <p data-i18n="analyse_subtitle">${t('analyse_subtitle')}</p>
            
            <div class="controls">
                <div class="control-group">
                    <label data-i18n="label_election">${t('label_election')}:</label>
                    <select id="election-select"></select>
                </div>
                <div class="control-group">
                    <label data-i18n="label_category">${t('label_category')}:</label>
                    <select id="category-select"></select>
                </div>
                <div class="control-group">
                    <label data-i18n="label_party">${t('label_party')}:</label>
                    <select id="party-select"></select>
                </div>
                <div class="control-group">
                    <label data-i18n="label_indicator">${t('label_indicator')}:</label>
                    <select id="indicator-select"></select>
                </div>
            </div>
            
            <div class="chart-container">
                <canvas id="correlationChart"></canvas>
            </div>
        </div>
    `;
    updatePageText();
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

    `;
}

function renderFaq() {
    document.getElementById('content').innerHTML = `

    `;
}

function renderKontakt() {
    document.getElementById('content').innerHTML = `

    `;

}

// ========== NAVIGATION ==========
function initNavigation() {
    const navLinks = document.querySelectorAll('nav a');
    navLinks.forEach(link => {
        const page = link.dataset.page;
        link.setAttribute('data-i18n', `nav_${page}`);
        link.textContent = t(`nav_${page}`);
    });

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
window.renderPage = (page) => {
    if (page === 'home') renderHome();
    else if (page === 'analyse') renderAnalyse();
    else if (page === 'blog') renderBlog();
    else if (page === 'faq') renderFaq();
    else if (page === 'kontakt') renderKontakt();
};

async function init() {
    await loadLanguage('de');
    renderLanguageSwitcher();
    initNavigation();
    renderHome();
}

init();