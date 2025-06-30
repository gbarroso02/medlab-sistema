const express = require('express');
const cors = require('cors');
const db = require('./database.js');

const app = express();
const PORT = 3000;

const corsOptions = {
  origin: [
    'http://127.0.0.1:5500',
    'http://localhost:5500'
  ],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

// --- ENDPOINTS DE USUÁRIOS ---
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get('SELECT * FROM usuarios WHERE username = ?', [username], (err, row) => {
        if (err) return res.status(500).json({ success: false, message: 'Erro no servidor.' });
        if (row && password === row.password) {
            res.json({ success: true, data: { id: row.id, login: row.username, nome: row.nome, tipoAcesso: row.tipo_acesso } });
        } else {
            res.status(401).json({ success: false, message: 'Usuário ou senha inválidos.' });
        }
    });
});

app.get('/api/usuarios', (req, res) => {
    db.all("SELECT id, nome, username, tipo_acesso FROM usuarios ORDER BY nome", [], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: 'Erro ao buscar usuários.' });
        res.json({ success: true, data: rows });
    });
});

app.post('/api/usuarios', (req, res) => {
    const { nome, login, senha, tipoAcesso } = req.body;
    const sql = `INSERT INTO usuarios (nome, username, password, tipo_acesso) VALUES (?, ?, ?, ?)`;
    db.run(sql, [nome, login, senha, tipoAcesso], function(err) {
        if (err) return res.status(400).json({ success: false, message: 'Erro ao salvar usuário. O login já pode existir.' });
        res.json({ success: true, message: 'Usuário/Unidade adicionado!', data: { id: this.lastID, nome: nome, username: login, tipo_acesso: tipoAcesso } });
    });
});

app.put('/api/usuarios/:id', (req, res) => {
    const { nome, username, tipoAcesso, senha } = req.body;
    const id = req.params.id;

    if (senha && senha.length > 0) {
        const sql = `UPDATE usuarios SET nome = ?, username = ?, tipo_acesso = ?, password = ? WHERE id = ?`;
        db.run(sql, [nome, username, tipoAcesso, senha, id], function(err) {
            if (err) return res.status(400).json({ success: false, message: 'Erro ao atualizar usuário.' });
            res.json({ success: true, message: 'Usuário atualizado com sucesso!' });
        });
    } else {
        const sql = `UPDATE usuarios SET nome = ?, username = ?, tipo_acesso = ? WHERE id = ?`;
        db.run(sql, [nome, username, tipoAcesso, id], function(err) {
            if (err) return res.status(400).json({ success: false, message: 'Erro ao atualizar usuário.' });
            res.json({ success: true, message: 'Usuário atualizado com sucesso!' });
        });
    }
});

app.delete('/api/usuarios/:id', (req, res) => {
    db.serialize(() => {
        db.run('DELETE FROM unidade_insumos WHERE unidade_id = ?', req.params.id, (err) => {
            if (err) return res.status(500).json({ success: false, message: 'Erro ao limpar associações do usuário.' });
        });
        db.run('DELETE FROM usuarios WHERE id = ?', req.params.id, function(err) {
            if (err) return res.status(500).json({ success: false, message: 'Erro ao apagar usuário.' });
            if (this.changes === 0) return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
            res.json({ success: true, message: 'Usuário apagado com sucesso!' });
        });
    });
});


// --- ENDPOINTS DE INSUMOS ---
app.get('/api/insumos', (req, res) => {
    db.all("SELECT * FROM insumos ORDER BY nome", [], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: 'Erro ao buscar insumos.' });
        res.json({ success: true, data: rows });
    });
});

app.post('/api/insumos', (req, res) => {
    const { nome, unidadeMedida, valorCompra, tipoValorCompra, itensPorEmbalagem, qtdEstoqueMatriz, qtdMinima } = req.body;
    const sql = `INSERT INTO insumos (nome, unidade_medida, valor_compra, tipo_valor_compra, itens_por_embalagem, quantidade_estoque_matriz, quantidade_minima) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    const params = [nome, unidadeMedida, valorCompra, tipoValorCompra, itensPorEmbalagem, qtdEstoqueMatriz, qtdMinima];
    db.run(sql, params, function(err) {
        if (err) return res.status(400).json({ success: false, message: 'Erro ao salvar insumo. O nome já pode existir.' });
        res.json({ success: true, message: 'Insumo adicionado!' });
    });
});

app.put('/api/insumos/:id/repor', (req, res) => {
    const { quantidade, valorPago } = req.body;
    const sql = `UPDATE insumos 
                 SET quantidade_estoque_matriz = quantidade_estoque_matriz + ?, 
                     valor_compra = ? 
                 WHERE id = ?`;
                 
    db.run(sql, [quantidade, valorPago, req.params.id], function(err) {
        if(err) return res.status(500).json({success: false, message: 'Erro ao repor estoque e valor.'});
        res.json({success: true, message: 'Estoque e valor atualizados!'});
    });
});

app.delete('/api/insumos/:id', (req, res) => {
    db.run('DELETE FROM insumos WHERE id = ?', req.params.id, function(err) {
        if (err) return res.status(500).json({ success: false, message: 'Erro ao excluir insumo.' });
        if (this.changes === 0) return res.status(404).json({ success: false, message: 'Insumo não encontrado.' });
        res.json({ success: true, message: 'Insumo excluído com sucesso!' });
    });
});

// --- ENDPOINTS DE SOLICITAÇÕES ---
app.get('/api/solicitacoes', (req, res) => {
    const sql = "SELECT s.*, i.id as insumo_id, u.id as unidade_id FROM solicitacoes s LEFT JOIN insumos i ON s.insumo_nome = i.nome LEFT JOIN usuarios u ON s.unidade_login = u.username ORDER BY s.id DESC"
    db.all(sql, [], (err, rows) => {
        if(err) return res.status(500).json({success: false, message: 'Erro ao buscar solicitações.'});
        res.json({success: true, data: rows});
    });
});

app.get('/api/solicitacoes/:login', (req, res) => {
    db.all("SELECT * FROM solicitacoes WHERE unidade_login = ? ORDER BY id DESC", [req.params.login], (err, rows) => {
        if(err) return res.status(500).json({success: false, message: 'Erro ao buscar solicitações da unidade.'});
        res.json({success: true, data: rows});
    });
});

app.post('/api/solicitacoes', (req, res) => {
    const { unidadeLogin, unidadeNome, insumoNome } = req.body;
    db.get('SELECT unidade_medida FROM insumos WHERE nome = ?', [insumoNome], (err, insumo) => {
        if (err || !insumo) return res.status(400).json({ success: false, message: 'Insumo não encontrado.' });
        
        const sql = `INSERT INTO solicitacoes (unidade_login, unidade_nome, insumo_nome, data, status, quantidade_solicitada, unidade_medida) VALUES (?, ?, ?, ?, ?, ?, ?)`;
        db.run(sql, [unidadeLogin, unidadeNome, insumoNome, new Date().toISOString(), "Pendente", 0, insumo.unidade_medida], function(err) {
            if (err) return res.status(400).json({ success: false, message: 'Erro ao criar solicitação.' });
            db.get("SELECT * FROM solicitacoes WHERE id = ?", [this.lastID], (err, row) => {
                res.json({ success: true, message: 'Solicitação criada!', data: row });
            });
        });
    });
});

app.put('/api/solicitacoes/:id/confirmar', (req, res) => {
    const { quantidadeConfirmadaAdmin } = req.body;
    const solicitacaoId = req.params.id;

    db.get("SELECT * FROM solicitacoes WHERE id = ?", [solicitacaoId], (err, solicitacao) => {
        if (err || !solicitacao) return res.status(404).json({ success: false, message: 'Solicitação não encontrada.' });
        if (solicitacao.status !== 'Pendente') return res.status(400).json({ success: false, message: 'Esta solicitação já foi processada.' });

        db.get("SELECT id FROM insumos WHERE nome = ?", [solicitacao.insumo_nome], (err, insumo) => {
            if (err || !insumo) return res.status(404).json({ success: false, message: 'Insumo não encontrado.' });
            const insumoId = insumo.id;

            db.get("SELECT id FROM usuarios WHERE username = ?", [solicitacao.unidade_login], (err, unidade) => {
                if (err || !unidade) return res.status(404).json({ success: false, message: 'Unidade não encontrada.' });
                const unidadeId = unidade.id;

                db.get("SELECT quantidade_estoque_matriz FROM insumos WHERE id = ?", [insumoId], (err, insumoMatriz) => {
                    if (insumoMatriz.quantidade_estoque_matriz < quantidadeConfirmadaAdmin) {
                        return res.status(400).json({ success: false, message: `Estoque na matriz insuficiente. Disponível: ${insumoMatriz.quantidade_estoque_matriz}` });
                    }

                    db.serialize(() => {
                        db.run("BEGIN TRANSACTION");
                        db.run("UPDATE insumos SET quantidade_estoque_matriz = quantidade_estoque_matriz - ? WHERE id = ?", [quantidadeConfirmadaAdmin, insumoId]);
                        db.run("UPDATE unidade_insumos SET estoque_local = estoque_local + ? WHERE unidade_id = ? AND insumo_id = ?", [quantidadeConfirmadaAdmin, unidadeId, insumoId]);
                        db.run("UPDATE solicitacoes SET status = 'Confirmado', quantidade_confirmada_admin = ? WHERE id = ?", [quantidadeConfirmadaAdmin, solicitacaoId]);
                        db.run("COMMIT", (err) => {
                            if (err) {
                                db.run("ROLLBACK");
                                return res.status(500).json({ success: false, message: 'Falha na transação, alterações desfeitas.' });
                            }
                            res.json({ success: true, message: 'Solicitação confirmada e estoques atualizados!' });
                        });
                    });
                });
            });
        });
    });
});

// --- ENDPOINTS DE GESTÃO DA UNIDADE ---
app.get('/api/unidade/:id/insumos', (req, res) => {
    const sql = `SELECT i.id, i.nome, ui.estoque_local, ui.estoque_minimo_unidade FROM insumos i JOIN unidade_insumos ui ON i.id = ui.insumo_id WHERE ui.unidade_id = ? ORDER BY i.nome`;
    db.all(sql, [req.params.id], (err, rows) => {
        if(err) return res.status(500).json({success: false, message: 'Erro ao buscar dados da unidade.'});
        res.json({success: true, data: rows });
    });
});

app.get('/api/unidades/estoques', (req, res) => {
    const sql = `
        SELECT u.nome, SUM(ui.estoque_local) as total_estoque
        FROM usuarios u
        JOIN unidade_insumos ui ON u.id = ui.unidade_id
        WHERE u.tipo_acesso = 'unidade_restrita'
        GROUP BY u.id
        ORDER BY u.nome;
    `;
    db.all(sql, [], (err, rows) => {
        if(err) return res.status(500).json({success: false, message: 'Erro ao buscar estoques das unidades.'});
        res.json({success: true, data: rows });
    });
});

app.post('/api/unidade-insumos', (req, res) => {
    const { unidadeId, associacoes } = req.body;
    db.serialize(() => {
        db.run('DELETE FROM unidade_insumos WHERE unidade_id = ?', [unidadeId], (err) => {
            if (err) return res.status(500).json({ success: false, message: 'Erro ao limpar associações antigas.'});
            
            if (associacoes && associacoes.length > 0) {
                const stmt = db.prepare('INSERT INTO unidade_insumos (unidade_id, insumo_id, estoque_minimo_unidade) VALUES (?, ?, ?)');
                associacoes.forEach(a => stmt.run(unidadeId, a.insumoId, a.minimo));
                stmt.finalize((err) => {
                    if (err) return res.status(500).json({ success: false, message: 'Erro ao salvar novas associações.'});
                    res.json({ success: true, message: 'Associações salvas com sucesso!' });
                });
            } else {
                res.json({ success: true, message: 'Associações salvas com sucesso!' });
            }
        });
    });
});

app.put('/api/unidade/estoque', (req, res) => {
    const { unidadeId, insumoId, novaQuantidade } = req.body;
    const sql = `UPDATE unidade_insumos SET estoque_local = ? WHERE unidade_id = ? AND insumo_id = ?`;
    db.run(sql, [novaQuantidade, unidadeId, insumoId], function(err) {
        if(err) return res.status(500).json({success: false, message: 'Erro ao atualizar estoque.'});
        res.json({success: true, message: 'Estoque atualizado!'});
    });
});


app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}.`);
});