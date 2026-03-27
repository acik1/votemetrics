import { supabase } from './config.js';

let electionsMetadata = [];
let structuralTables = [];

export async function loadMetadata() {
    console.log("🔍 loadMetadata() gestartet");

    // Elections-Metadaten laden
    console.log("📡 Lade elections_metadata...");
    const { data: elections, error: electionsError } = await supabase
        .from('elections_metadata')
        .select('*');

    if (electionsError) {
        console.error("❌ Fehler beim Laden von elections_metadata:", electionsError);
    } else {
        console.log("✅ elections_metadata geladen:", elections?.length || 0, "Einträge");
        console.log("📋 elections_metadata Inhalt:", elections);
    }

    // Structural Tables laden
    console.log("📡 Lade structural_tables...");
    const { data: tables, error: tablesError } = await supabase
        .from('structural_tables')
        .select('*');

    if (tablesError) {
        console.error("❌ Fehler beim Laden von structural_tables:", tablesError);
    } else {
        console.log("✅ structural_tables geladen:", tables?.length || 0, "Einträge");
        console.log("📋 structural_tables Inhalt:", tables);
    }

    electionsMetadata = elections || [];
    structuralTables = tables || [];

    console.log("📦 Gespeichert:", {
        elections: electionsMetadata.length,
        structural: structuralTables.length
    });

    return { elections: electionsMetadata, tables: structuralTables };
}

export function getElections() {
    return electionsMetadata;
}

export function getStructuralTables(electionId) {
    return structuralTables.filter(t => t.election_id === electionId);
}

export async function loadScatterData(electionId, tableName, partyKey, indicatorKey) {
    const election = electionsMetadata.find(e => e.id === electionId);
    const structuralTable = structuralTables.find(t => t.table_name === tableName);

    // Party-Metadaten holen
    const { data: partyMeta } = await supabase
        .from('party_metadata')
        .select('*')
        .eq('election_id', electionId)
        .eq('party_key', partyKey)
        .single();

    // Indicator-Metadaten holen (für Normalisierung)
    const { data: indicatorMeta } = await supabase
        .from('indicators_metadata')
        .select('*')
        .eq('election_id', electionId)
        .eq('table_name', tableName)
        .eq('indicator_key', indicatorKey)
        .single();

    // SQL-Abfrage für Strukturdaten bauen
    let structuralSelect = `${structuralTable.join_column}, ${indicatorKey}`;

    // Wenn Normalisierung nötig, auch Denominator-Spalte abfragen
    if (indicatorMeta?.normalized && indicatorMeta.denominator_column) {
        structuralSelect += `, ${indicatorMeta.denominator_column}`;
    }

    const { data: structuralData, error: sError } = await supabase
        .from(tableName)
        .select(structuralSelect);

    if (sError) throw sError;

    // Wahlergebnisse laden (View mit Prozenten)
    let electionSelect = `${election.join_column_election}, ${partyKey}`;

    const { data: electionData, error: eError } = await supabase
        .from(election.election_table)
        .select(electionSelect);

    if (eError) throw eError;

    // Kombinieren und normalisieren
    const combinedData = structuralData
        .map(struct => {
            const electionRow = electionData.find(e =>
                e[election.join_column_election] === struct[structuralTable.join_column]
            );
            if (!electionRow) return null;

            let x = parseFloat(struct[indicatorKey]);
            if (indicatorMeta?.normalized && indicatorMeta.denominator_column) {
                const denominator = parseFloat(struct[indicatorMeta.denominator_column]);
                if (denominator > 0) {
                    x = (x / denominator) * (indicatorMeta.multiplier || 100);
                }
            }

            let y = parseFloat(electionRow[partyKey]);

            if (isNaN(x) || isNaN(y)) return null;

            // Wahlkreis-Name mitgeben
            return {
                x,
                y,
                constituency: struct[structuralTable.join_column]
            };
        })
        .filter(d => d !== null);

    console.log(`📊 Kombiniert: ${combinedData.length} von ${structuralData?.length} Punkten`);
    return combinedData;
}

export async function getPartyColumns(electionId) {
    const election = electionsMetadata.find(e => e.id === electionId);
    if (!election) return [];

    const { data, error } = await supabase
        .from(election.election_table)
        .select('*')
        .limit(1);

    if (error || !data || data.length === 0) return [];

    // Alle Spalten außer Join-Spalte und Hilfsspalten
    const excludeColumns = [
        election.join_column_election,
        'valid_votes_list',
        'valid_votes_pct_list'
    ];

    return Object.keys(data[0]).filter(key => !excludeColumns.includes(key));
}

export async function getIndicatorColumns(tableName) {
    const { data } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

    if (!data || data.length === 0) return [];

    return Object.keys(data[0]).filter(key => !['id', 'constituency'].includes(key));
}