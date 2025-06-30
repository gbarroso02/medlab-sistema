document.addEventListener('DOMContentLoaded', async function() {
    
    const API_URL = 'https://medlab-servidor.onrender.com';

    // --- ESTADO DA APLICAÇÃO ---
    let insumos = [];
    let unidades = [];
    let solicitacoes = [];
    let filtroDataSolicitacoes = 'todos';
    let filtroUnidadeDashboard = 'todas';
    let stockUnidadesChart = null;

    // --- SELETORES DO DOM ---
    const tabelaEstoqueMatrizUI = document.getElementById('tabela-estoque-matriz');
    const tabelaSolicitacoesUI = document.getElementById('tabela-solicitacoes');
    const filtrosSolicitacoesContainer = document.getElementById('filtros-solicitacoes-container');
    const totalInsumosMatrizSpan = document.getElementById('total-insumos-matriz');
    const totalUnidadesCadastradasSpan = document.getElementById('total-unidades-cadastradas');
    const solicitacoesPendentesSpan = document.getElementById('solicitacoes-pendentes');
    const listaInsumosMaisSolicitadosUI = document.getElementById('lista-insumos-mais-solicitados');
    const valorGastoUnidadeDashboardSpan = document.getElementById('valor-gasto-unidade-dashboard');
    const infoValorGastoUnidadeSpan = document.getElementById('info-valor-gasto-unidade');
    const graficoStockUnidadesCanvas = document.getElementById('grafico-stock-unidades');
    const selectFiltroUnidadeDashboard = document.getElementById('select-filtro-unidade-dashboard');
    const btnAtualizarVisualizacao = document.getElementById('btn-atualizar-visualizacao');

    // Modals
    const reporEstoqueModal = document.getElementById('repor-estoque-modal');
    const deleteInsumoConfirmModal = document.getElementById('delete-insumo-confirm-modal');
    let insumoParaExcluirId = null;

    // --- FUNÇÕES DE DADOS ---
    async function carregarDadosIniciais() {
        showNotification('Carregando...', 'Buscando dados atualizados do servidor.', true, true);
        try {
            const [resInsumos, resUsuarios, resSolicitacoes] = await Promise.all([
                fetch(`${API_URL}/api/insumos`),
                fetch(`${API_URL}/api/usuarios`),
                fetch(`${API_URL}/api/solicitacoes`)
            ]);

            const dataInsumos = await resInsumos.json();
            const dataUsuarios = await resUsuarios.json();
            const dataSolicitacoes = await resSolicitacoes.json();

            if (dataInsumos.success) insumos = dataInsumos.data;
            if (dataUsuarios.success) unidades = dataUsuarios.data.filter(u => u.tipo_acesso === 'unidade_restrita');
            if (dataSolicitacoes.success) solicitacoes = dataSolicitacoes.data;

            closeNotification();

        } catch (error) {
            console.error("Erro ao carregar dados:", error);
            showNotification('Erro de Conexão', 'Não foi possível carregar os dados do painel.', false);
        }
    }

    // --- FUNÇÕES DE RENDERIZAÇÃO ---
    function renderizarTabelaEstoqueMatriz() {
        if (!tabelaEstoqueMatrizUI) return;
        tabelaEstoqueMatrizUI.innerHTML = '';
        if (insumos.length === 0) {
            tabelaEstoqueMatrizUI.innerHTML = '<tr><td colspan="7" class="px-4 py-3 text-center italic text-gray-500">Nenhum insumo cadastrado.</td></tr>';
            return;
        }

        insumos.sort((a,b) => a.nome.localeCompare(b.nome)).forEach(insumo => {
            const tr = document.createElement('tr');
            const statusClass = insumo.quantidade_estoque_matriz < insumo.quantidade_minima ? 'estoque-baixo' : 'estoque-ok';
            const statusTexto = insumo.quantidade_estoque_matriz < insumo.quantidade_minima ? 'BAIXO' : 'OK';
            let valorCompraDisplay = `R$ ${parseFloat(insumo.valor_compra || 0).toFixed(2)}`;
            if (insumo.tipo_valor_compra !== 'unidade_medida_principal' && insumo.itens_por_embalagem > 1) { 
                valorCompraDisplay += ` / ${insumo.tipo_valor_compra} (cont. ${insumo.itens_por_embalagem} ${insumo.unidade_medida})`;
            } else {
                valorCompraDisplay += ` / ${insumo.unidade_medida}`;
            }

            tr.innerHTML = `
                <td class="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">${insumo.nome}</td>
                <td class="px-3 py-2 whitespace-nowrap text-xs text-gray-600">${insumo.unidade_medida}</td>
                <td class="px-3 py-2 whitespace-nowrap text-xs text-gray-600">${valorCompraDisplay}</td>
                <td class="px-3 py-2 whitespace-nowrap text-sm text-center">${insumo.quantidade_estoque_matriz}</td>
                <td class="px-3 py-2 whitespace-nowrap text-sm text-center">${insumo.quantidade_minima}</td>
                <td class="px-3 py-2 whitespace-nowrap text-xs font-semibold text-center ${statusClass}">${statusTexto}</td>
                <td class="px-3 py-2 whitespace-nowrap text-sm space-x-1">
                    <button class="action-btn add-qty-btn" data-insumo-id="${insumo.id}" data-insumo-nome="${insumo.nome}" title="Repor Estoque"><i class="fas fa-plus"></i> Repor</button>
                    <button class="action-btn delete-btn bg-red-600 hover:bg-red-700 text-white text-xs py-1 px-2 rounded" data-insumo-id="${insumo.id}" data-insumo-nome="${insumo.nome}" title="Excluir Insumo"><i class="fas fa-trash-alt"></i></button>
                </td>
            `;
            tabelaEstoqueMatrizUI.appendChild(tr);
        });
    }
    
    function renderizarTabelaSolicitacoes() {
        if (!tabelaSolicitacoesUI) return;
        tabelaSolicitacoesUI.innerHTML = '';
        const solicitacoesFiltradas = solicitacoes.filter(s => isDateInRange(s.data, filtroDataSolicitacoes));

        if (solicitacoesFiltradas.length === 0) {
            tabelaSolicitacoesUI.innerHTML = '<tr><td colspan="8" class="px-2 py-4 text-center italic text-gray-500">Nenhuma solicitação encontrada.</td></tr>';
            return;
        }

        solicitacoesFiltradas.sort((a,b) => new Date(b.data) - new Date(a.data)).forEach(sol => {
            const tr = document.createElement('tr');
            const dataFormatada = new Date(sol.data).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'});
            let statusClass = 'status-pendente';
            if (sol.status === 'Confirmado') statusClass = 'status-confirmado';
            if (sol.status && (sol.status.includes('Cancelada') || sol.status.includes('Excluído'))) statusClass = 'status-cancelado';

            let acaoHTML = '';
            let qtdPedidaDisplay = sol.quantidade_solicitada;
            const insumoRelacionado = insumos.find(i => i.nome === sol.insumo_nome);

            if (sol.status === 'Pendente') {
                if (sol.quantidade_solicitada === 0) {
                    qtdPedidaDisplay = '<span class="italic text-xs text-gray-500">A definir</span>';
                    acaoHTML = `<div class="flex items-center space-x-1"><input type="number" min="1" placeholder="Qtd." class="input-qtd-admin border rounded-md p-1 text-xs" data-solicitacao-id="${sol.id}"><button data-id="${sol.id}" data-action="definir" class="confirmar-solicitacao-btn text-xs bg-green-500 hover:bg-green-600 text-white font-semibold py-1 px-2 rounded-md">OK</button></div>`;
                } else {
                    acaoHTML = `<button data-id="${sol.id}" data-action="confirmar" class="confirmar-solicitacao-btn text-xs bg-green-500 hover:bg-green-600 text-white font-semibold py-1 px-2 rounded-md">Confirmar</button>`;
                }
            } else {
                qtdPedidaDisplay = sol.quantidade_confirmada_admin ?? sol.quantidade_solicitada;
                acaoHTML = `<span class="text-xs text-gray-500 italic">Processado</span>`;
            }

            tr.innerHTML = `
                <td class="py-2 px-1 text-xs text-gray-600">${sol.id}</td>
                <td class="py-2 px-1 text-sm font-medium text-gray-800">${sol.unidade_nome}</td>
                <td class="py-2 px-1 text-sm text-gray-700">${sol.insumo_nome}</td>
                <td class="py-2 px-1 text-sm text-center text-gray-700">${qtdPedidaDisplay}</td>
                <td class="py-2 px-1 text-xs text-gray-600">${insumoRelacionado?.unidade_medida || ''}</td>
                <td class="py-2 px-1 text-sm text-gray-600">${dataFormatada}</td>
                <td class="py-2 px-1 text-xs font-semibold"><span class="px-2 py-1 rounded-full ${statusClass}">${sol.status.toUpperCase()}</span></td>
                <td class="py-2 px-1 text-sm">${acaoHTML}</td>
            `;
            tabelaSolicitacoesUI.appendChild(tr);
        });
    }

    function isDateInRange(isoDateString, range) {
        if (range === 'todos') return true;
        const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
        const dataSolicitacao = new Date(isoDateString); dataSolicitacao.setHours(0, 0, 0, 0);
        let dataLimite;
        switch (range) {
            case 'hoje': return dataSolicitacao.getTime() === hoje.getTime();
            case '7dias': dataLimite = new Date(hoje); dataLimite.setDate(hoje.getDate() - 6); return dataSolicitacao >= dataLimite;
            case '15dias': dataLimite = new Date(hoje); dataLimite.setDate(hoje.getDate() - 14); return dataSolicitacao >= dataLimite;
            case '1mes': dataLimite = new Date(hoje); dataLimite.setMonth(hoje.getMonth() - 1); return dataSolicitacao >= dataLimite;
            default: return true; 
        }
    }

    function calcularCustoUnitario(insumo) {
        if (!insumo || typeof insumo.valor_compra !== 'number') return 0;
        if (insumo.tipo_valor_compra !== 'unidade_medida_principal' && insumo.itens_por_embalagem > 0) {
            return insumo.valor_compra / insumo.itens_por_embalagem;
        }
        return insumo.valor_compra;
    }

    async function atualizarDashboard() {
        if (!totalInsumosMatrizSpan) return;
        totalInsumosMatrizSpan.textContent = insumos.reduce((acc, curr) => acc + (curr.quantidade_estoque_matriz || 0), 0);
        totalUnidadesCadastradasSpan.textContent = unidades.length;
        solicitacoesPendentesSpan.textContent = solicitacoes.filter(s => s.status === 'Pendente').length;
        
        const contagemInsumos = {};
        solicitacoes.filter(s => s.status === 'Confirmado').forEach(s => {
            const qtd = s.quantidade_confirmada_admin ?? s.quantidade_solicitada;
            contagemInsumos[s.insumo_nome] = (contagemInsumos[s.insumo_nome] || 0) + qtd;
        });
        const maisSolicitados = Object.entries(contagemInsumos).sort(([,a],[,b]) => b-a).slice(0, 5);
        listaInsumosMaisSolicitadosUI.innerHTML = '';
        if (maisSolicitados.length > 0) {
            maisSolicitados.forEach(([nome, qtd]) => {
                const li = document.createElement('li');
                li.className = 'flex justify-between';
                li.innerHTML = `<span>${nome}</span> <span class="font-semibold">${qtd} un.</span>`;
                listaInsumosMaisSolicitadosUI.appendChild(li);
            });
        } else {
            listaInsumosMaisSolicitadosUI.innerHTML = '<li class="italic text-gray-500">Nenhuma solicitação confirmada.</li>';
        }

        let valorGastoTotal = 0;
        const solicitacoesFiltradasUnidade = filtroUnidadeDashboard === 'todas'
            ? solicitacoes
            : solicitacoes.filter(s => s.unidade_id == filtroUnidadeDashboard);

        solicitacoesFiltradasUnidade.filter(s => s.status === 'Confirmado').forEach(s => {
            const insumo = insumos.find(i => i.id === s.insumo_id);
            if (insumo) {
                const custoUnitario = calcularCustoUnitario(insumo);
                const qtd = s.quantidade_confirmada_admin ?? s.quantidade_solicitada;
                valorGastoTotal += qtd * custoUnitario;
            }
        });
        valorGastoUnidadeDashboardSpan.textContent = `R$ ${valorGastoTotal.toFixed(2)}`;
        const unidadeSelecionada = unidades.find(u => u.id == filtroUnidadeDashboard);
        infoValorGastoUnidadeSpan.textContent = filtroUnidadeDashboard === 'todas'
            ? "(Considera todas as unidades)"
            : `(Solicitações confirmadas para ${unidadeSelecionada?.nome})`;

        await renderizarGraficoStockUnidades();
    }

    function popularFiltroUnidadeDashboard() {
        if (!selectFiltroUnidadeDashboard) return;
        selectFiltroUnidadeDashboard.innerHTML = '<option value="todas">Visão Geral (Todas Unidades)</option>';
        unidades.forEach(unidade => {
            const option = document.createElement('option');
            option.value = unidade.id; 
            option.textContent = unidade.nome;
            selectFiltroUnidadeDashboard.appendChild(option);
        });
    }

    async function renderizarGraficoStockUnidades() {
        if (!graficoStockUnidadesCanvas) return;
        const ctx = graficoStockUnidadesCanvas.getContext('2d');
        
        const backgroundColors = ['rgba(217, 35, 37, 0.7)', 'rgba(59, 130, 246, 0.7)', 'rgba(16, 185, 129, 0.7)', 'rgba(236, 72, 153, 0.7)', 'rgba(139, 92, 246, 0.7)'];
    
        let labelsUnidades = [];
        let dataTotalItens = [];
    
        try {
            const res = await fetch(`${API_URL}/api/unidades/estoques`);
            const result = await res.json();
            
            if (result.success) {
                let unidadesParaGrafico = result.data;
    
                if (filtroUnidadeDashboard !== 'todas') {
                    const unidadeSelecionada = unidades.find(u => u.id == filtroUnidadeDashboard);
                    if (unidadeSelecionada) {
                        unidadesParaGrafico = result.data.filter(d => d.nome === unidadeSelecionada.nome);
                    }
                }
    
                unidadesParaGrafico.forEach(unidade => {
                    labelsUnidades.push(unidade.nome);
                    dataTotalItens.push(unidade.total_estoque);
                });
            }
        } catch(error) {
            console.error("Erro ao buscar dados para o gráfico:", error);
        }
    
        if (stockUnidadesChart) stockUnidadesChart.destroy();
        if (labelsUnidades.length === 0) {
            ctx.clearRect(0, 0, graficoStockUnidadesCanvas.width, graficoStockUnidadesCanvas.height);
            ctx.font = "14px Inter";
            ctx.textAlign = "center";
            ctx.fillStyle = "#6b7280";
            ctx.fillText("Nenhuma unidade com estoque para exibir.", graficoStockUnidadesCanvas.width / 2, 50);
            return;
        }
    
        stockUnidadesChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labelsUnidades,
                datasets: [{
                    label: 'Total de Itens no Estoque',
                    data: dataTotalItens,
                    backgroundColor: backgroundColors,
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false }}}
        });
    }

    // --- LÓGICA DE EVENTOS ---
    if (filtrosSolicitacoesContainer) {
        filtrosSolicitacoesContainer.addEventListener('click', function(event) {
            const botao = event.target.closest('.filtro-solicitacao-btn');
            if(botao){
                filtrosSolicitacoesContainer.querySelectorAll('.filtro-solicitacao-btn').forEach(btn => btn.classList.remove('active'));
                botao.classList.add('active');
                filtroDataSolicitacoes = botao.dataset.range;
                renderizarTabelaSolicitacoes();
            }
        });
    }

    if (tabelaSolicitacoesUI) {
        tabelaSolicitacoesUI.addEventListener('click', async function(event) {
            const botaoConfirmar = event.target.closest('.confirmar-solicitacao-btn');
            if (!botaoConfirmar) return;

            const solicitacaoId = botaoConfirmar.dataset.id;
            const solicitacao = solicitacoes.find(s => s.id == solicitacaoId);
            let quantidadeConfirmada;
            
            if (botaoConfirmar.dataset.action === 'definir') {
                const inputQtd = document.querySelector(`input[data-solicitacao-id="${solicitacaoId}"]`);
                quantidadeConfirmada = parseInt(inputQtd.value, 10);
                if (isNaN(quantidadeConfirmada) || quantidadeConfirmada <= 0) {
                    return showNotification('Erro', 'Por favor, insira uma quantidade válida.', false);
                }
            } else {
                quantidadeConfirmada = solicitacao.quantidade_solicitada;
            }

            try {
                const response = await fetch(`${API_URL}/api/solicitacoes/${solicitacaoId}/confirmar`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ quantidadeConfirmadaAdmin: quantidadeConfirmada })
                });
                const result = await response.json();
                if (result.success) {
                    showNotification('Sucesso!', 'Solicitação confirmada.');
                    await inicializarPainelPrincipal();
                } else { 
                    showNotification('Erro', result.message || 'Não foi possível confirmar a solicitação.', false); 
                }
            } catch (error) { 
                showNotification('Erro de Conexão', 'Falha ao comunicar com o servidor.', false);
            }
        });
    }

    if (tabelaEstoqueMatrizUI) {
        tabelaEstoqueMatrizUI.addEventListener('click', function(e){
            const reporBtn = e.target.closest('.add-qty-btn');
            const deleteBtn = e.target.closest('.delete-btn');

            if (reporBtn) {
                document.getElementById('repor-insumo-nome').textContent = reporBtn.dataset.insumoNome;
                document.getElementById('repor-insumo-id-hidden').value = reporBtn.dataset.insumoId;
                reporEstoqueModal.classList.remove('hidden');
            }
            if (deleteBtn) {
                insumoParaExcluirId = deleteBtn.dataset.insumoId;
                document.getElementById('delete-insumo-nome-confirm').textContent = deleteBtn.dataset.insumoNome;
                deleteInsumoConfirmModal.classList.remove('hidden');
            }
        });
    }

    document.getElementById('form-repor-estoque')?.addEventListener('submit', async function(e) {
        e.preventDefault();
        const insumoId = document.getElementById('repor-insumo-id-hidden').value;
        const quantidade = parseInt(document.getElementById('repor-qtd-comprada').value, 10);
        const valorPago = parseFloat(document.getElementById('repor-valor-pago').value);

        if (isNaN(quantidade) || quantidade <= 0) {
            return showNotification('Erro', 'Insira uma quantidade válida.', false);
        }
        if (isNaN(valorPago) || valorPago < 0) {
            return showNotification('Erro', 'Insira um valor de compra válido.', false);
        }
        
        try {
            const response = await fetch(`${API_URL}/api/insumos/${insumoId}/repor`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    quantidade: quantidade,
                    valorPago: valorPago 
                })
            });
            const result = await response.json();
            if (result.success) {
                showNotification('Sucesso', 'Estoque e valor atualizados!');
                reporEstoqueModal.classList.add('hidden');
                document.getElementById('form-repor-estoque').reset();
                await inicializarPainelPrincipal();
            } else {
                showNotification('Erro', result.message, false);
            }
        } catch (error) {
            showNotification('Erro de Conexão', 'Não foi possível repor o estoque.', false);
        }
    });
    
    document.getElementById('confirm-delete-insumo-btn')?.addEventListener('click', async function() {
        if (!insumoParaExcluirId) return;
        try {
            const response = await fetch(`${API_URL}/api/insumos/${insumoParaExcluirId}`, { method: 'DELETE' });
            const result = await response.json();
            if (result.success) {
                showNotification('Sucesso', 'Insumo excluído.');
                deleteInsumoConfirmModal.classList.add('hidden');
                insumoParaExcluirId = null;
                await inicializarPainelPrincipal();
            } else {
                showNotification('Erro', result.message, false);
            }
        } catch (error) {
            showNotification('Erro de Conexão', 'Não foi possível excluir o insumo.', false);
        }
    });

    document.getElementById('cancel-repor-estoque-btn')?.addEventListener('click', () => {
        reporEstoqueModal.classList.add('hidden');
        document.getElementById('form-repor-estoque').reset();
    });
    document.getElementById('cancel-delete-insumo-btn')?.addEventListener('click', () => deleteInsumoConfirmModal.classList.add('hidden'));
    selectFiltroUnidadeDashboard?.addEventListener('change', (e) => {
        filtroUnidadeDashboard = e.target.value;
        atualizarDashboard();
    });
    btnAtualizarVisualizacao?.addEventListener('click', inicializarPainelPrincipal);

    // --- INICIALIZAÇÃO ---
    async function inicializarPainelPrincipal() {
        await carregarDadosIniciais();
        popularFiltroUnidadeDashboard();
        await atualizarDashboard();
        renderizarTabelaEstoqueMatriz();
        renderizarTabelaSolicitacoes();
    }

    inicializarPainelPrincipal();
});