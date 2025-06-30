document.addEventListener('DOMContentLoaded', async function() {
    
    const API_URL = 'https://medlab-servidor.onrender.com/';

    // --- SELETORES E ESTADO ---
    const nomeUnidadeLogadaSpan = document.getElementById('nome-unidade-logada');
    const logoutButton = document.getElementById('logout-button');
    const stockUnidadeContainer = document.getElementById('stock-unidade-container');
    const formSolicitarInsumo = document.getElementById('form-solicitar-insumo');
    const listaInsumosParaSolicitacaoUI = document.getElementById('lista-insumos-para-solicitacao');
    const listaMinhasSolicitacoesUI = document.getElementById('lista-minhas-solicitacoes');
    
    let insumosDaUnidade = [];
    let minhasSolicitacoes = [];
    
    const unidadeLogada = JSON.parse(localStorage.getItem('unidadeLogada'));

    if (!unidadeLogada || !unidadeLogada.id) {
        window.location.href = 'unidade_login.html';
        return;
    }
    nomeUnidadeLogadaSpan.textContent = unidadeLogada.nome;

    // --- FUNÇÕES DE DADOS ---
    async function carregarDadosDoPainel() {
        try {
            const [resInsumos, resSolicitacoes] = await Promise.all([
                fetch(`${API_URL}/api/unidade/${unidadeLogada.id}/insumos`),
                fetch(`${API_URL}/api/solicitacoes/${unidadeLogada.login}`)
            ]);

            const resultInsumos = await resInsumos.json();
            const resultSolicitacoes = await resSolicitacoes.json();

            if (resultInsumos.success) insumosDaUnidade = resultInsumos.data;
            if (resultSolicitacoes.success) minhasSolicitacoes = resultSolicitacoes.data;
            
            renderizarStockUnidade();
            renderizarInsumosParaSolicitacao();
            renderizarMinhasSolicitacoes();

        } catch (error) {
            console.error("Erro ao carregar dados do painel:", error);
            showNotification('Erro de Conexão', 'Não foi possível carregar os dados do painel.', false);
        }
    }

    // --- LÓGICA DE EVENTOS ---
    if (stockUnidadeContainer) {
        stockUnidadeContainer.addEventListener('click', async function(event) {
            const updateButton = event.target.closest('.atualizar-stock-btn');
            if (updateButton) {
                const insumoId = updateButton.dataset.insumoId;
                const inputQtd = updateButton.previousElementSibling;
                const novaQuantidade = parseInt(inputQtd.value, 10);
                if (isNaN(novaQuantidade) || novaQuantidade < 0) {
                    return showNotification('Erro', 'Quantidade inválida.', false);
                }
                try {
                    const response = await fetch(`${API_URL}/api/unidade/estoque`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ unidadeId: unidadeLogada.id, insumoId, novaQuantidade })
                    });
                    const result = await response.json();
                    if (result.success) {
                        showNotification('Sucesso!', 'Estoque atualizado.');
                        const insumoIndex = insumosDaUnidade.findIndex(i => i.id == insumoId);
                        if (insumoIndex > -1) insumosDaUnidade[insumoIndex].estoque_local = novaQuantidade;
                        // Não precisa redesenhar, a confirmação visual é o suficiente por ora.
                    } else {
                        showNotification('Erro!', result.message, false);
                    }
                } catch (error) {
                    showNotification('Erro de Conexão', 'Não foi possível atualizar o estoque.', false);
                }
            }
        });
    }

    if (formSolicitarInsumo) {
        formSolicitarInsumo.addEventListener('submit', async function(event) {
            event.preventDefault();
            const checkboxes = listaInsumosParaSolicitacaoUI.querySelectorAll('input[type="checkbox"]:checked');
            if (checkboxes.length === 0) {
                return showNotification('Nenhum Insumo Selecionado', 'Por favor, selecione ao menos um insumo.', false);
            }
            let solicitacoesFeitas = 0;
            for (const checkbox of checkboxes) {
                const novaSolicitacao = {
                    unidadeLogin: unidadeLogada.login,
                    unidadeNome: unidadeLogada.nome,
                    insumoNome: checkbox.value
                };
                try {
                    const response = await fetch(`${API_URL}/api/solicitacoes`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(novaSolicitacao)
                    });
                    const result = await response.json();
                    if (result.success) {
                        minhasSolicitacoes.unshift(result.data);
                        solicitacoesFeitas++;
                    } else {
                        showNotification('Erro!', `Falha ao solicitar ${novaSolicitacao.insumoNome}.`, false);
                    }
                } catch (error) {
                    showNotification('Erro de Conexão', 'Não foi possível enviar a solicitação.', false);
                }
            }
            if (solicitacoesFeitas > 0) {
                showNotification('Sucesso!', `${solicitacoesFeitas} solicitação(ões) enviada(s).`);
            }
            renderizarMinhasSolicitacoes();
            checkboxes.forEach(cb => cb.checked = false);
        });
    }
    
    if (logoutButton) {
        logoutButton.addEventListener('click', function() {
            localStorage.removeItem('unidadeLogada');
            window.location.href = 'unidade_login.html';
        });
    }
    
    // --- FUNÇÕES DE RENDERIZAÇÃO ---
    function renderizarStockUnidade() {
        stockUnidadeContainer.innerHTML = '';
        if (insumosDaUnidade.length === 0) {
            stockUnidadeContainer.innerHTML = '<p class="text-gray-500 italic">Nenhum insumo associado a esta unidade.</p>';
            return;
        }
        insumosDaUnidade.forEach(insumo => {
            const qtdAtualLocal = insumo.estoque_local;
            const qtdMinimaUnidade = insumo.estoque_minimo_unidade;
            const divInsumo = document.createElement('div');
            divInsumo.className = 'p-3 bg-gray-50 rounded-md shadow-sm flex justify-between items-center';
            divInsumo.innerHTML = `
                <div>
                    <span class="font-medium text-gray-800">${insumo.nome}</span>
                    <span class="block text-sm text-gray-600">Estoque Local: 
                        <strong class="${qtdAtualLocal < qtdMinimaUnidade && qtdMinimaUnidade > 0 ? 'text-red-500 font-bold' : 'text-green-600'}">${qtdAtualLocal}</strong> 
                    </span>
                    <span class="block text-xs text-gray-500">Mínimo p/ Unidade: ${qtdMinimaUnidade}</span>
                </div>
                <div class="flex items-center space-x-2">
                    <input type="number" value="${qtdAtualLocal}" min="0" class="w-20 px-2 py-1 border border-gray-300 rounded-md text-sm">
                    <button class="atualizar-stock-btn text-xs bg-blue-500 hover:bg-blue-600 text-white font-semibold py-1 px-2 rounded-md" data-insumo-id="${insumo.id}">Atualizar</button>
                </div>
            `;
            stockUnidadeContainer.appendChild(divInsumo);
        });
    }
    
    function renderizarInsumosParaSolicitacao() {
        listaInsumosParaSolicitacaoUI.innerHTML = '';
        if (insumosDaUnidade.length === 0) {
            listaInsumosParaSolicitacaoUI.innerHTML = '<p class="text-gray-500 italic text-sm">Nenhum insumo definido para você solicitar.</p>';
            return;
        }
        insumosDaUnidade.forEach(insumo => {
            const insumoId = `solicitar-${insumo.id}`;
            const itemDiv = document.createElement('div');
            itemDiv.className = 'insumo-item-solicitacao'; 
            itemDiv.innerHTML = `<input type="checkbox" id="${insumoId}" name="insumoSolicitado" value="${insumo.nome}" class="h-4 w-4 text-red-600 border-gray-300 rounded">
                                 <label for="${insumoId}" class="ml-3 flex-grow text-sm text-gray-700 cursor-pointer">${insumo.nome}</label>`;
            listaInsumosParaSolicitacaoUI.appendChild(itemDiv);
        });
    }

    function renderizarMinhasSolicitacoes() {
        listaMinhasSolicitacoesUI.innerHTML = '';
        if (minhasSolicitacoes.length === 0) {
            listaMinhasSolicitacoesUI.innerHTML = '<li class="text-gray-500 italic">Nenhuma solicitação feita.</li>';
            return;
        }
        minhasSolicitacoes.slice(0, 10).forEach(sol => {
            const li = document.createElement('li');
            li.className = 'p-2 bg-gray-50 rounded-md text-sm flex justify-between items-center shadow-sm';
            const dataFormatada = new Date(sol.data).toLocaleDateString('pt-BR', {day: '2-digit', month: 'short'});
            let statusClass = 'text-yellow-800 bg-yellow-100';
            if (sol.status === 'Confirmado') statusClass = 'text-green-800 bg-green-100';
            if (sol.status.includes('Cancelada')) statusClass = 'text-gray-800 bg-gray-100';
            li.innerHTML = `<div><strong>${sol.insumo_nome}</strong> <span class="text-xs text-gray-500">(${dataFormatada})</span></div>
                            <span class="font-semibold text-xs px-2 py-0.5 rounded-full ${statusClass}">${sol.status}</span>`;
            listaMinhasSolicitacoesUI.appendChild(li);
        });
    }
    
    // --- INICIALIZAÇÃO ---
    carregarDadosDoPainel();
});