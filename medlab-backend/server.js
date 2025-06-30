// server.js (versão para PostgreSQL)
const express = require('express');
const cors = require('cors');
const pool = require('./database.js');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Login
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const result = await pool.query('SELECT * FROM usuarios WHERE username = $1', [username]);
        const user = result.rows[0];
        if (user && password === user.password) {
            res.json({ success: true, data: { id: user.id, login: user.username, nome: user.nome, tipoAcesso: user.tipo_acesso } });
        } else {
            res.status(401).json({ success: false, message: 'Usuário ou senha inválidos.' });
        }
    } catch (err) { res.status(500).json({ success: false, message: 'Erro no servidor.' }) }
});

// Usuários
app.get('/api/usuarios', async (req, res) => {
    try {
        const result = await pool.query("SELECT id, nome, username, tipo_acesso FROM usuarios ORDER BY nome");
        res.json({ success: true, data: result.rows });
    } catch (err) { res.status(500).json({ success: false, message: 'Erro ao buscar usuários.' }) }
});

app.post('/api/usuarios', async (req, res) => {
    try {
        const { nome, login, senha, tipoAcesso } = req.body;
        const result = await pool.query(`INSERT INTO usuarios (nome, username, password, tipo_acesso) VALUES ($1, $2, $3, $4) RETURNING *`, [nome, login, senha, tipoAcesso]);
        res.json({ success: true, message: 'Usuário adicionado!', data: result.rows[0] });
    } catch (err) { res.status(400).json({ success: false, message: 'Erro ao salvar usuário. O login já pode existir.' }) }
});

app.put('/api/usuarios/:id', async (req, res) => {
    try {
        const { nome, username, tipoAcesso, senha } = req.body;
        let result;
        if (senha) {
            result = await pool.query(`UPDATE usuarios SET nome = $1, username = $2, tipo_acesso = $3, password = $4 WHERE id = $5`, [nome, username, tipoAcesso, senha, req.params.id]);
        } else {
            result = await pool.query(`UPDATE usuarios SET nome = $1, username = $2, tipo_acesso = $3 WHERE id = $4`, [nome, username, tipoAcesso, req.params.id]);
        }
        if(result.rowCount === 0) return res.status(404).json({success: false, message: 'Usuário não encontrado.'});
        res.json({ success: true, message: 'Usuário atualizado!' });
    } catch (err) { res.status(400).json({ success: false, message: 'Erro ao atualizar usuário.' }) }
});

app.delete('/api/usuarios/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM usuarios WHERE id = $1', [req.params.id]);
        res.json({ success: true, message: 'Usuário apagado!' });
    } catch (err) { res.status(500).json({ success: false, message: 'Erro ao apagar usuário.' }) }
});


// Insumos
app.get('/api/insumos', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM insumos ORDER BY nome");
        res.json({ success: true, data: result.rows });
    } catch (err) { res.status(500).json({ success: false, message: 'Erro ao buscar insumos.' }) }
});

app.post('/api/insumos', async (req, res) => {
    try {
        const { nome, unidadeMedida, valorCompra, tipoValorCompra, itensPorEmbalagem, qtdEstoqueMatriz, qtdMinima } = req.body;
        const sql = `INSERT INTO insumos (nome, unidade_medida, valor_compra, tipo_valor_compra, itens_por_embalagem, quantidade_estoque_matriz, quantidade_minima) VALUES ($1, $2, $3, $4, $5, $6, $7)`;
        await pool.query(sql, [nome, unidadeMedida, valorCompra, tipoValorCompra, itensPorEmbalagem, qtdEstoqueMatriz, qtdMinima]);
        res.json({ success: true, message: 'Insumo adicionado!' });
    } catch (err) { res.status(400).json({ success: false, message: 'Erro ao salvar insumo.' }) }
});

app.put('/api/insumos/:id/repor', async (req, res) => {
    try {
        const { quantidade, valorPago } = req.body;
        const sql = `UPDATE insumos SET quantidade_estoque_matriz = quantidade_estoque_matriz + $1, valor_compra = $2 WHERE id = $3`;
        await pool.query(sql, [quantidade, valorPago, req.params.id]);
        res.json({success: true, message: 'Estoque e valor atualizados!'});
    } catch(err) { res.status(500).json({success: false, message: 'Erro ao repor estoque.'}) }
});

app.delete('/api/insumos/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM insumos WHERE id = $1', [req.params.id]);
        res.json({ success: true, message: 'Insumo excluído!' });
    } catch (err) { res.status(500).json({ success: false, message: 'Erro ao excluir insumo.' }) }
});


// Solicitações
app.get('/api/solicitacoes', async (req, res) => {
    try {
        const sql = "SELECT s.*, i.id as insumo_id, u.id as unidade_id FROM solicitacoes s LEFT JOIN insumos i ON s.insumo_nome = i.nome LEFT JOIN usuarios u ON s.unidade_login = u.username ORDER BY s.id DESC"
        const result = await pool.query(sql);
        res.json({success: true, data: result.rows});
    } catch(err) { res.status(500).json({success: false, message: 'Erro ao buscar solicitações.'}) }
});

// E todas as outras rotas...
// (Vou colocar o resto das rotas adaptadas aqui)

app.post('/api/solicitacoes', async (req, res) => {
    try {
        const { unidadeLogin, unidadeNome, insumoNome } = req.body;
        const insumoRes = await pool.query('SELECT unidade_medida FROM insumos WHERE nome = $1', [insumoNome]);
        if (insumoRes.rows.length === 0) return res.status(400).json({ success: false, message: 'Insumo não encontrado.' });

        const sql = `INSERT INTO solicitacoes (unidade_login, unidade_nome, insumo_nome, data, status, quantidade_solicitada, unidade_medida) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`;
        const result = await pool.query(sql, [unidadeLogin, unidadeNome, insumoNome, new Date().toISOString(), "Pendente", 0, insumoRes.rows[0].unidade_medida]);
        res.json({ success: true, message: 'Solicitação criada!', data: result.rows[0] });
    } catch (err) { res.status(400).json({ success: false, message: 'Erro ao criar solicitação.'}) }
});

app.put('/api/solicitacoes/:id/confirmar', async (req, res) => {
    const client = await pool.connect();
    try {
        const { quantidadeConfirmadaAdmin } = req.body;
        await client.query('BEGIN');

        const solRes = await client.query("SELECT * FROM solicitacoes WHERE id = $1 FOR UPDATE", [req.params.id]);
        const solicitacao = solRes.rows[0];
        if (!solicitacao) throw new Error('Solicitação não encontrada.');
        if (solicitacao.status !== 'Pendente') throw new Error('Solicitação já processada.');

        const insumoRes = await client.query("SELECT * FROM insumos WHERE nome = $1 FOR UPDATE", [solicitacao.insumo_nome]);
        const insumo = insumoRes.rows[0];
        if (!insumo) throw new Error('Insumo não encontrado.');
        if (insumo.quantidade_estoque_matriz < quantidadeConfirmadaAdmin) throw new Error(`Estoque insuficiente. Disponível: ${insumo.quantidade_estoque_matriz}`);

        const unidadeRes = await client.query("SELECT id FROM usuarios WHERE username = $1", [solicitacao.unidade_login]);
        const unidadeId = unidadeRes.rows[0].id;

        await client.query("UPDATE insumos SET quantidade_estoque_matriz = quantidade_estoque_matriz - $1 WHERE id = $2", [quantidadeConfirmadaAdmin, insumo.id]);
        await client.query("UPDATE unidade_insumos SET estoque_local = estoque_local + $1 WHERE unidade_id = $2 AND insumo_id = $3", [quantidadeConfirmadaAdmin, unidadeId, insumo.id]);
        await client.query("UPDATE solicitacoes SET status = 'Confirmado', quantidade_confirmada_admin = $1 WHERE id = $2", [quantidadeConfirmadaAdmin, req.params.id]);

        await client.query('COMMIT');
        res.json({ success: true, message: 'Solicitação confirmada e estoques atualizados!' });
    } catch(err) {
        await client.query('ROLLBACK');
        res.status(400).json({ success: false, message: err.message });
    } finally {
        client.release();
    }
});

// Gestão da Unidade
app.get('/api/unidade/:id/insumos', async (req, res) => {
    try {
        const sql = `SELECT i.id, i.nome, ui.estoque_local, ui.estoque_minimo_unidade FROM insumos i JOIN unidade_insumos ui ON i.id = ui.insumo_id WHERE ui.unidade_id = $1 ORDER BY i.nome`;
        const result = await pool.query(sql, [req.params.id]);
        res.json({success: true, data: result.rows });
    } catch(err) { res.status(500).json({success: false, message: 'Erro ao buscar dados da unidade.'}) }
});

app.get('/api/unidades/estoques', async (req, res) => {
    try {
        const sql = `SELECT u.nome, COALESCE(SUM(ui.estoque_local), 0) as total_estoque FROM usuarios u LEFT JOIN unidade_insumos ui ON u.id = ui.unidade_id WHERE u.tipo_acesso = 'unidade_restrita' GROUP BY u.id ORDER BY u.nome`;
        const result = await pool.query(sql);
        res.json({success: true, data: result.rows });
    } catch (err) { res.status(500).json({success: false, message: 'Erro ao buscar estoques.'}) }
});

app.post('/api/unidade-insumos', async (req, res) => {
    const client = await pool.connect();
    try {
        const { unidadeId, associacoes } = req.body;
        await client.query('BEGIN');
        await client.query('DELETE FROM unidade_insumos WHERE unidade_id = $1', [unidadeId]);
        if (associacoes && associacoes.length > 0) {
            for(const a of associacoes) {
                await client.query('INSERT INTO unidade_insumos (unidade_id, insumo_id, estoque_minimo_unidade) VALUES ($1, $2, $3)', [unidadeId, a.insumoId, a.minimo]);
            }
        }
        await client.query('COMMIT');
        res.json({ success: true, message: 'Associações salvas com sucesso!' });
    } catch(err) {
        await client.query('ROLLBACK');
        res.status(500).json({success: false, message: 'Erro ao salvar associações.'});
    } finally {
        client.release();
    }
});

app.put('/api/unidade/estoque', async (req, res) => {
    try {
        const { unidadeId, insumoId, novaQuantidade } = req.body;
        const sql = `UPDATE unidade_insumos SET estoque_local = $1 WHERE unidade_id = $2 AND insumo_id = $3`;
        await pool.query(sql, [novaQuantidade, unidadeId, insumoId]);
        res.json({success: true, message: 'Estoque atualizado!'});
    } catch (err) { res.status(500).json({success: false, message: 'Erro ao atualizar estoque.'}) }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando na porta ${PORT}.`);
});