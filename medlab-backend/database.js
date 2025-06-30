// database.js (versão para PostgreSQL)
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL, // Pega a URL da Render
    ssl: {
        rejectUnauthorized: false
    }
});

const initializeDb = async () => {
    try {
        await pool.query(`CREATE TABLE IF NOT EXISTS usuarios (id SERIAL PRIMARY KEY, nome TEXT, username TEXT UNIQUE, password TEXT, tipo_acesso TEXT)`);
        await pool.query(`CREATE TABLE IF NOT EXISTS insumos (id SERIAL PRIMARY KEY, nome TEXT UNIQUE, unidade_medida TEXT, valor_compra REAL, tipo_valor_compra TEXT, itens_por_embalagem INTEGER, quantidade_estoque_matriz INTEGER, quantidade_minima INTEGER)`);
        await pool.query(`CREATE TABLE IF NOT EXISTS solicitacoes (id SERIAL PRIMARY KEY, unidade_login TEXT, unidade_nome TEXT, insumo_nome TEXT, data TEXT, status TEXT, quantidade_solicitada INTEGER, quantidade_confirmada_admin INTEGER, unidade_medida TEXT)`);
        await pool.query(`CREATE TABLE IF NOT EXISTS unidade_insumos (unidade_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE, insumo_id INTEGER REFERENCES insumos(id) ON DELETE CASCADE, estoque_local INTEGER DEFAULT 0, estoque_minimo_unidade INTEGER DEFAULT 0, PRIMARY KEY (unidade_id, insumo_id))`);

        const checkAdmin = await pool.query('SELECT * FROM usuarios WHERE tipo_acesso = $1', ['admin_total']);
        if (checkAdmin.rows.length === 0) {
            await pool.query('INSERT INTO usuarios (nome, username, password, tipo_acesso) VALUES ($1, $2, $3, $4)', ["Administrador Principal", "jgadm", "2501jg", "admin_total"]);
            console.log('Usuário administrador padrão criado.');
        }
        console.log('Banco de dados PostgreSQL conectado e tabelas verificadas.');
    } catch (err) {
        console.error('Erro ao inicializar o banco de dados:', err.stack);
    }
};

initializeDb();

module.exports = pool;