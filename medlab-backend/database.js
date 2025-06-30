const sqlite3 = require('sqlite3').verbose();
const DB_SOURCE = "medlab.db";

const db = new sqlite3.Database(DB_SOURCE, (err) => {
    if (err) {
        console.error(err.message);
        throw err;
    } else {
        console.log('Conectado ao banco de dados SQLite.');
        db.serialize(() => {
            db.run(`CREATE TABLE IF NOT EXISTS usuarios (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT, username TEXT UNIQUE, password TEXT, tipo_acesso TEXT)`);
            
            db.run(`CREATE TABLE IF NOT EXISTS insumos (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT UNIQUE, unidade_medida TEXT, valor_compra REAL, tipo_valor_compra TEXT, itens_por_embalagem INTEGER, quantidade_estoque_matriz INTEGER, quantidade_minima INTEGER)`);
            
            // CORREÇÃO: Adicionada a coluna "unidade_medida" no final da tabela solicitacoes
            db.run(`CREATE TABLE IF NOT EXISTS solicitacoes (id INTEGER PRIMARY KEY AUTOINCREMENT, unidade_login TEXT, unidade_nome TEXT, insumo_nome TEXT, data TEXT, status TEXT, quantidade_solicitada INTEGER, quantidade_confirmada_admin INTEGER, unidade_medida TEXT)`);
            
            db.run(`CREATE TABLE IF NOT EXISTS unidade_insumos (unidade_id INTEGER, insumo_id INTEGER, estoque_local INTEGER DEFAULT 0, estoque_minimo_unidade INTEGER DEFAULT 0, PRIMARY KEY (unidade_id, insumo_id), FOREIGN KEY (unidade_id) REFERENCES usuarios (id) ON DELETE CASCADE, FOREIGN KEY (insumo_id) REFERENCES insumos (id) ON DELETE CASCADE)`);
            
            const insertUser = 'INSERT OR IGNORE INTO usuarios (nome, username, password, tipo_acesso) VALUES (?,?,?,?)';
            db.run(insertUser, ["Administrador Principal", "jgadm", "2501jg", "admin_total"]);
        });
    }
});

module.exports = db;