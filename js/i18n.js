let currentLang = 'de'; // Standard: Deutsch
let translations = {};

// Sprachdatei laden
export async function loadLanguage(lang) {
    currentLang = lang;
    const response = await fetch(`/locales/${lang}.json`);
    translations = await response.json();
    document.documentElement.lang = lang;
    return translations;
}

// Übersetzung holen
export function t(key) {
    return translations[key] || key;
}

// Aktuelle Sprache
export function getCurrentLang() {
    return currentLang;
}

// Sprachauswahl ins HTML einfügen
export function renderLanguageSwitcher() {
    const nav = document.querySelector('nav');
    const switcher = document.createElement('div');
    switcher.className = 'language-switcher';
    switcher.innerHTML = `
        <select id="lang-select">
            <option value="de" ${currentLang === 'de' ? 'selected' : ''}>🇩🇪 Deutsch</option>
            <option value="en" ${currentLang === 'en' ? 'selected' : ''}>🇬🇧 English</option>
            <option value="hu" ${currentLang === 'hu' ? 'selected' : ''}>🇭🇺 Magyar</option>
        </select>
    `;
    nav.appendChild(switcher);
    
    document.getElementById('lang-select').addEventListener('change', async (e) => {
        await loadLanguage(e.target.value);
        // Seite neu rendern
        const currentPage = document.querySelector('nav a.active')?.dataset.page || 'home';
        // Hier musst du die render-Funktionen aus main.js aufrufen
        window.renderPage(currentPage);
    });
}