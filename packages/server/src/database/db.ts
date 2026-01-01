import { Pool } from 'pg';

// O Pool gerencia múltiplas conexões simultâneas de forma eficiente
export const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'zyra',
    password: '101010', // Coloque a senha que você definiu no Postgres
    port: 5432,
    max: 20, // Máximo de conexões simultâneas
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Helper para facilitar queries
export const db = {
    query: (text: string, params?: any[]) => pool.query(text, params),
    
    // Função para transações (importante para crafting e enchants futuramente)
    getClient: () => pool.connect(),
};

// Teste de conexão ao iniciar
pool.on('connect', () => {
    console.log('[Database] Connected to PostgreSQL');
});

pool.on('error', (err) => {
    console.error('[Database] Unexpected error on idle client', err);
});