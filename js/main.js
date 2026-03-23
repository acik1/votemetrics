import { supabase } from './config.js';
import { drawChart } from './chart.js';
import {
    loadMetadata, getElections, getStructuralTables,
    loadScatterData, getPartyColumns, getIndicatorColumns
} from './dataLoader.js';
import { t, loadLanguage, renderLanguageSwitcher, getCurrentLang } from './i18n.js';

// ========== SEITEN-REGISTRIERUNG (MUSS VOR NAVIGATION KOMMEN!) ==========
const pages = {
    home: renderHome,
    analyse: renderAnalyse,
    blog: renderBlog,
    faq: renderFaq,
    kontakt: renderKontakt
};

// ========== HELPER ==========
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

    if (!electionSelect) return;

    electionSelect.innerHTML = elections.map(e =>
        `<option value="${e.id}">${e.flag} ${e.country} ${e.year}</option>`
    ).join('');

    electionSelect.addEventListener('change', async () => {
        await updateCategories();
        await updateParties();
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
    await loadChart();
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
    const electionId = document.getElementById('election-select')?.value;
    if (!electionId) return;

    const parties = await getPartyColumns(electionId);
    const partySelect = document.getElementById('party-select');
    if (!partySelect) return;

    partySelect.innerHTML = parties.map(p =>
        `<option value="${p}">${p.replace(/_/g, ' ').toUpperCase()}</option>`
    ).join('');
}

async function updateIndicators() {
    const tableName = document.getElementById('category-select')?.value;
    if (!tableName) return;

    const indicators = await getIndicatorColumns(tableName);
    const indicatorSelect = document.getElementById('indicator-select');
    if (!indicatorSelect) return;

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
            ctx.fillText(t('error_loading') || 'Fehler beim Laden der Daten', 10, 50);
        }
    }
}

function renderBlog() {
    document.getElementById('content').innerHTML = `
        <div class="page-container">
            <h1 data-i18n="blog_title">${t('blog_title')}</h1>
            <p data-i18n="blog_coming">${t('blog_coming')}</p>
            <div class="blog-teaser">
                <h3>Coming soon...</h3>
                <p>Erste Analysen: PKW-Dichte und CDU-Ergebnisse</p>
            </div>
        </div>
    `;
    updatePageText();
}

function renderFaq() {
    document.getElementById('content').innerHTML = `
        <div class="page-container">
            <h1 data-i18n="faq_title">${t('faq_title')}</h1>
            <div class="faq-item">
                <h3 data-i18n="faq_question1">${t('faq_question1')}</h3>
                <p data-i18n="faq_answer1">${t('faq_answer1')}</p>
            </div>
            <div class="faq-item">
                <h3 data-i18n="faq_question2">${t('faq_question2')}</h3>
                <p data-i18n="faq_answer2">${t('faq_answer2')}</p>
            </div>
            <div class="faq-item">
                <h3 data-i18n="faq_question3">${t('faq_question3')}</h3>
                <p data-i18n="faq_answer3">${t('faq_answer3')}</p>
            </div>
        </div>
    `;
    updatePageText();
}

function renderKontakt() {
    document.getElementById('content').innerHTML = `
        <div class="page-container">
            <h1 data-i18n="contact_title">${t('contact_title')}</h1>
            <p data-i18n="contact_text">${t('contact_text')}</p>
            <form id="contact-form">
                <input type="email" placeholder="${t('contact_email_placeholder')}" required>
                <textarea placeholder="${t('contact_message_placeholder')}" rows="5" required></textarea>
                <button type="submit">${t('contact_send')}</button>
            </form>
            <p class="contact-note">${t('contact_email')} <a href="mailto:info@votemetrics.de">info@votemetrics.de</a></p>
        </div>
    `;
    updatePageText();
    document.getElementById('contact-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        alert(t('contact_success'));
        e.target.reset();
    });
}

// ========== NAVIGATION ==========
function initNavigation() {
    // Menü-Texte mit i18n setzen
    const navLinks = document.querySelectorAll('nav a');
    navLinks.forEach(link => {
        const page = link.dataset.page;
        link.setAttribute('data-i18n', `nav_${page}`);
        link.textContent = t(`nav_${page}`);
    });

    // Event-Listener für Navigation
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.dataset.page;
            if (pages[page]) {
                pages[page]();
                // Aktiven Menüpunkt markieren
                navLinks.forEach(a => a.classList.remove('active'));
                link.classList.add('active');
            }
        });
    });
}

// ========== GLOBALE FUNKTION FÜR SPRACHWECHSEL ==========
window.renderPage = (page) => {
    if (pages[page]) pages[page]();
    // Menü-Texte aktualisieren
    const navLinks = document.querySelectorAll('nav a');
    navLinks.forEach(link => {
        const pageName = link.dataset.page;
        link.textContent = t(`nav_${pageName}`);
    });
};

// ========== INIT ==========
async function init() {
    await loadLanguage('de');
    renderLanguageSwitcher();
    initNavigation();
    renderHome();
}

init();