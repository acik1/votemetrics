import { supabase } from './config.js';

let electionsMetadata = [];
let structuralTables = [];

export async function loadMetadata() {
    const { data: elections } = await supabase.from('elections_metadata').select('*');
    const { data: tables } = await supabase.from('structural_tables').select('*');
    
    electionsMetadata = elections || [];
    structuralTables = tables || [];
    
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
    
    if (!election || !structuralTable) {
        throw new Error('Metadaten nicht gefunden');
    }
    
    // Strukturdaten aus der ausgewählten Tabelle
    const { data: structuralData, error: sError } = await supabase
        .from(tableName)
        .select(`${structuralTable.join_column}, ${indicatorKey}`);
    
    if (sError) throw sError;
    
    // Wahlergebnisse
    const { data: electionData, error: eError } = await supabase
        .from(election.election_table)
        .select(`${election.join_column_election}, ${partyKey}`);
    
    if (eError) throw eError;
    
    // Kombinieren
    return structuralData
        .map(struct => {
            const row = electionData.find(e => e[election.join_column_election] === struct[structuralTable.join_column]);
            if (!row) return null;
            const x = parseFloat(struct[indicatorKey]);
            const y = parseFloat(row[partyKey]);
            if (isNaN(x) || isNaN(y)) return null;
            return { x, y };
        })
        .filter(d => d !== null);
}

export async function getPartyColumns(electionId) {
    const election = electionsMetadata.find(e => e.id === electionId);
    if (!election) return [];
    
    const { data } = await supabase
        .from(election.election_table)
        .select('*')
        .limit(1);
    
    if (!data || data.length === 0) return [];
    
    const excludeColumns = [
        'id', election.join_column_election, 'oevk_old', 'oevk_formula', 
        'oevk_geometry', 'seat_name', 'total_voters', 'turnout', 
        'valid_votes_constituency', 'turnout_pct', 'valid_votes_pct_constituency',
        'valid_votes_list', 'valid_votes_pct_list'
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