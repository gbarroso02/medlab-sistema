document.addEventListener('DOMContentLoaded', async function() {
    
    const API_URL = 'https://medlab-servidor.onrender.com';

    // --- ESTADO DA APLICAÇÃO ---
    let insumos = [];
    let unidades = [];
    let associacoesAtuais = {};
    let unidadeParaManipular = null;

    // --- SELETORES DO DOM ---
    const formInsumoConfig = document.getElementById('form-insumo-config');
    const inputNomeInsumoConfig = document.getElementById('nome-insumo-config');
    const selectUnidadeMedidaConfig = document.getElementById('unidade-medida-config');
    const inputValorCompraConfig = document.getElementById('valor-compra-config');
    const selectTipoValorCompraConfig = document.getElementById('tipo-valor-compra-config');
    const divEmbalagemDetailsConfig = document.getElementById('embalagem-details-config');
    const inputItensPorEmbalagemConfig = document.getElementById('itens-por-embalagem-config');
    const inputQtdEstoqueMatrizConfig = document.getElementById('qtd-estoque-matriz-config');
    const inputQtdMinimaInsumoConfig = document.getElementById('qtd-minima-insumo-config');
    const listaInsumosUIConfig = document.getElementById('lista-ultimos-insumos-config');

    const formUnidadeConfig = document.getElementById('form-unidade-config');
    const inputNomeUnidadeConfig = document.getElementById('nome-unidade-config');
    const inputLoginUnidadeConfig = document.getElementById('login-unidade-config');
    const inputSenhaUnidadeConfig = document.getElementById('senha-unidade-config');
    const selectTipoAcessoConfig = document.getElementById('tipo-acesso-config');
    const listaUnidadesUIConfig = document.getElementById('lista-unidades-config');
    
    const selectUnidadeConfig = document.getElementById('select-unidade-config');
    const checkboxesInsumosContainerConfig = document.getElementById('checkboxes-insumos-config');
    const btnSalvarAssociacaoConfig = document.getElementById('salvar-insumos-unidade-config');

    const editUnidadeModalConfig = document.getElementById('edit-unidade-modal-config');
    const deleteUnidadeConfirmModalConfig = document.getElementById('delete-unidade-confirm-modal-config');

    // --- FUNÇÕES DE DADOS ---
    async function carregarDadosIniciais() {
        try {
            const [resInsumos, resUsuarios] = await Promise.all([
                fetch(`${API_URL}/api/insumos`),
                fetch(`${API_URL}/api/usuarios`)
            ]);
            const dataInsumos = await resInsumos.json();
            const dataUsuarios = await resUsuarios.json();
            if (dataInsumos.success) insumos = dataInsumos.data;
            if (dataUsuarios.success) unidades = dataUsuarios.data;
        } catch (error) {
            showNotification('Erro de Conexão', 'Não foi possível carregar os dados do servidor.', false);
        }
    }
    
    async function carregarAssociacoesDaUnidade(unidadeId) {
        if (!unidadeId) {
            associacoesAtuais = {};
            renderizarCheckboxesInsumosConfig();
            return;
        }
        try {
            const res = await fetch(`${API_URL}/api/unidade/${unidadeId}/insumos`);
            const data = await res.json();
            if (data.success) {
                associacoesAtuais[unidadeId] = data.data;
            } else {
                associacoesAtuais[unidadeId] = [];
            }
        } catch (error) {
            associacoesAtuais[unidadeId] = [];
            showNotification('Erro', 'Não foi possível carregar os insumos desta unidade.', false);
        }
        renderizarCheckboxesInsumosConfig();
    }

    // --- LÓGICA DE EVENTOS ---
    if (selectTipoValorCompraConfig) {
        selectTipoValorCompraConfig.addEventListener('change', function() {
            if (this.value !== 'unidade_medida_principal') {
                divEmbalagemDetailsConfig.classList.remove('hidden');
                inputItensPorEmbalagemConfig.required = true;
            } else {
                divEmbalagemDetailsConfig.classList.add('hidden');
                inputItensPorEmbalagemConfig.required = false;
                inputItensPorEmbalagemConfig.value = '';
            }
        });
    }

    if (formInsumoConfig) {
        formInsumoConfig.addEventListener('submit', async function(event) {
            event.preventDefault();
            const novoInsumoData = {
                nome: inputNomeInsumoConfig.value.trim(),
                unidadeMedida: selectUnidadeMedidaConfig.value,
                valorCompra: parseFloat(inputValorCompraConfig.value),
                tipoValorCompra: selectTipoValorCompraConfig.value,
                itensPorEmbalagem: parseInt(inputItensPorEmbalagemConfig.value) || 1,
                qtdEstoqueMatriz: parseInt(inputQtdEstoqueMatrizConfig.value) || 0,
                qtdMinima: parseInt(inputQtdMinimaInsumoConfig.value) || 0
            };
            try {
                const response = await fetch(`${API_URL}/api/insumos`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(novoInsumoData)
                });
                const result = await response.json();
                if (result.success) {
                    showNotification('Sucesso!', 'Insumo adicionado.');
                    
                    const unidadeIdSelecionada = selectUnidadeConfig.value;

                    await carregarDadosIniciais();
                    renderizarListaUnidadesConfig();
                    renderizarUltimosInsumosConfig();
                    
                    selectUnidadeConfig.value = unidadeIdSelecionada;
                    
                    if (unidadeIdSelecionada) {
                        await carregarAssociacoesDaUnidade(unidadeIdSelecionada);
                    } else {
                        renderizarCheckboxesInsumosConfig();
                    }
                    
                    formInsumoConfig.reset();
                    divEmbalagemDetailsConfig.classList.add('hidden');
                } else { 
                    showNotification('Erro!', result.message, false); 
                }
            } catch (error) { 
                showNotification('Erro de Conexão', 'Não foi possível salvar o insumo.', false); 
            }
        });
    }

    if (formUnidadeConfig) {
        formUnidadeConfig.addEventListener('submit', async function(event) {
            event.preventDefault();
            const novaUnidadeData = {
                nome: inputNomeUnidadeConfig.value.trim(),
                login: inputLoginUnidadeConfig.value.trim(),
                senha: inputSenhaUnidadeConfig.value,
                tipoAcesso: selectTipoAcessoConfig.value
            };
            if (!novaUnidadeData.nome || !novaUnidadeData.login || !novaUnidadeData.senha || !novaUnidadeData.tipoAcesso) {
                 return showNotification('Erro!', 'Todos os campos são obrigatórios.', false);
            }
            try {
                const response = await fetch(`${API_URL}/api/usuarios`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(novaUnidadeData)
                });
                const result = await response.json();
                if (result.success) {
                    showNotification('Sucesso!', 'Usuário/Unidade adicionado.');
                    await inicializar();
                    formUnidadeConfig.reset();
                } else { showNotification('Erro!', result.message, false); }
            } catch (error) { showNotification('Erro de Conexão', 'Não foi possível salvar a unidade.', false); }
        });
    }

    if (listaUnidadesUIConfig) {
        listaUnidadesUIConfig.addEventListener('click', async function(event) {
            const editButton = event.target.closest('.edit-btn');
            const deleteButton = event.target.closest('.delete-btn');

            if (editButton) {
                const usuarioId = editButton.dataset.id;
                unidadeParaManipular = unidades.find(u => u.id == usuarioId);
                if (unidadeParaManipular) {
                    document.getElementById('edit-unidade-id-config').value = unidadeParaManipular.id;
                    document.getElementById('edit-unidade-nome-config').value = unidadeParaManipular.nome;
                    document.getElementById('edit-unidade-login-config').value = unidadeParaManipular.username;
                    document.getElementById('edit-tipo-acesso-config').value = unidadeParaManipular.tipo_acesso;
                    document.getElementById('edit-unidade-senha-config').value = '';
                    editUnidadeModalConfig.classList.remove('hidden');
                }
            }
            
            if (deleteButton) {
                const usuarioId = deleteButton.dataset.id;
                unidadeParaManipular = unidades.find(u => u.id == usuarioId);
                if(unidadeParaManipular) {
                    document.getElementById('delete-unidade-nome-confirm-config').textContent = unidadeParaManipular.nome;
                    deleteUnidadeConfirmModalConfig.classList.remove('hidden');
                }
            }
        });
    }
    
    if (selectUnidadeConfig) {
        selectUnidadeConfig.addEventListener('change', (e) => carregarAssociacoesDaUnidade(e.target.value));
    }
    
    if (btnSalvarAssociacaoConfig) {
        btnSalvarAssociacaoConfig.addEventListener('click', async function() {
            const unidadeId = selectUnidadeConfig.value;
            if (!unidadeId) return showNotification('Atenção!', 'Selecione uma unidade.', false);
            const novasAssociacoes = [];
            document.querySelectorAll('#checkboxes-insumos-config .insumo-checkbox:checked').forEach(cb => {
                const container = cb.closest('.insumo-item-config');
                const inputMinimo = container.querySelector('.input-minimo-unidade');
                novasAssociacoes.push({ insumoId: cb.dataset.insumoId, minimo: parseInt(inputMinimo.value) || 0 });
            });
            try {
                const response = await fetch(`${API_URL}/api/unidade-insumos`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ unidadeId, associacoes: novasAssociacoes })
                });
                const result = await response.json();
                if (result.success) {
                    showNotification('Sucesso!', 'Associações salvas com sucesso!');
                    await carregarAssociacoesDaUnidade(unidadeId);
                } else { showNotification('Erro!', result.message, false); }
            } catch (error) { showNotification('Erro de Conexão', 'Não foi possível salvar as associações.', false); }
        });
    }

    // --- FUNÇÕES DE RENDERIZAÇÃO ---
    function renderizarUltimosInsumosConfig() {
        if (!listaInsumosUIConfig) return;
        listaInsumosUIConfig.innerHTML = '';
        if (insumos.length === 0) {
            listaInsumosUIConfig.innerHTML = '<li class="text-gray-500 italic">Nenhum insumo cadastrado.</li>';
            return;
        }
        insumos.slice(-5).reverse().forEach(insumo => {
            const li = document.createElement('li');
            li.className = 'p-3 bg-gray-50 rounded-md shadow-sm';
            li.innerHTML = `<span class="font-medium text-gray-800">${insumo.nome}</span>`;
            listaInsumosUIConfig.appendChild(li);
        });
    }

    function renderizarListaUnidadesConfig() {
        if(!listaUnidadesUIConfig || !selectUnidadeConfig) return;
        listaUnidadesUIConfig.innerHTML = '';
        selectUnidadeConfig.innerHTML = '<option value="">-- Selecione uma Unidade --</option>'; 
        unidades.sort((a, b) => a.nome.localeCompare(b.nome)).forEach(unidade => {
            const li = document.createElement('li');
            li.className = 'p-3 bg-gray-50 rounded-md shadow-sm flex justify-between items-center';
            const tipo = unidade.tipo_acesso.includes('admin') ? 'Admin' : 'Unidade';
            
            li.innerHTML = `<div><span class="font-medium text-gray-800">${unidade.nome}</span><span class="block list-item-detail">Login: ${unidade.username} | Tipo: ${tipo}</span></div>
                            <div class="space-x-2">
                                <button data-id="${unidade.id}" class="action-btn edit-btn bg-blue-500 hover:bg-blue-600 text-white py-1 px-2 rounded" title="Editar"><i class="fas fa-edit"></i></button>
                                <button data-id="${unidade.id}" data-nome="${unidade.nome}" class="action-btn delete-btn" title="Excluir"><i class="fas fa-trash-alt"></i></button>
                            </div>`;

            listaUnidadesUIConfig.appendChild(li);
            if (tipo === 'Unidade') {
                const option = document.createElement('option'); 
                option.value = unidade.id;
                option.textContent = unidade.nome; 
                selectUnidadeConfig.appendChild(option);
            }
        });
    }

    function renderizarCheckboxesInsumosConfig() {
        checkboxesInsumosContainerConfig.innerHTML = '';
        const unidadeId = selectUnidadeConfig.value;
        if (!unidadeId) {
            checkboxesInsumosContainerConfig.innerHTML = '<p class="text-gray-500 italic">Selecione uma unidade.</p>';
            return;
        }
        const insumosAssociados = associacoesAtuais[unidadeId] || [];
        insumos.sort((a,b) => a.nome.localeCompare(b.nome)).forEach(insumo => {
            
            // CORREÇÃO APLICADA AQUI
            // O backend retorna 'id', mas o código procurava por 'insumo_id'.
            const associacaoExistente = insumosAssociados.find(a => a.id == insumo.id);
            
            const isChecked = !!associacaoExistente;
            const minimoValor = associacaoExistente ? associacaoExistente.estoque_minimo_unidade : 0;

            const itemDiv = document.createElement('div');
            itemDiv.className = 'insumo-item-config';
            itemDiv.innerHTML = `
                <input type="checkbox" data-insumo-id="${insumo.id}" class="h-4 w-4 insumo-checkbox" ${isChecked ? 'checked' : ''}>
                <label class="text-sm text-gray-700 cursor-pointer">${insumo.nome}</label>
                <input type="number" placeholder="Mín." value="${minimoValor}" class="input-minimo-unidade border rounded-md p-1" ${!isChecked ? 'disabled' : ''}>
            `;
            itemDiv.querySelector('.insumo-checkbox').addEventListener('change', (e) => {
                itemDiv.querySelector('.input-minimo-unidade').disabled = !e.target.checked;
            });
            checkboxesInsumosContainerConfig.appendChild(itemDiv);
        });
    }
    
    async function inicializar() {
        await carregarDadosIniciais();
        renderizarListaUnidadesConfig();
        renderizarUltimosInsumosConfig();
        renderizarCheckboxesInsumosConfig();
    }
    
    document.getElementById('form-edit-unidade-config')?.addEventListener('submit', async function(e) {
        e.preventDefault();
        const id = document.getElementById('edit-unidade-id-config').value;
        const dadosAtualizados = {
            nome: document.getElementById('edit-unidade-nome-config').value,
            username: document.getElementById('edit-unidade-login-config').value,
            tipoAcesso: document.getElementById('edit-tipo-acesso-config').value,
            senha: document.getElementById('edit-unidade-senha-config').value
        };
        if (!dadosAtualizados.senha) delete dadosAtualizados.senha;

        try {
            const response = await fetch(`${API_URL}/api/usuarios/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dadosAtualizados)
            });
            const result = await response.json();
            if(result.success) {
                showNotification('Sucesso', 'Usuário atualizado!');
                editUnidadeModalConfig.classList.add('hidden');
                await inicializar();
            } else {
                showNotification('Erro', result.message, false);
            }
        } catch(error) {
            showNotification('Erro de Conexão', 'Não foi possível atualizar o usuário.', false);
        }
    });

    document.getElementById('confirm-delete-unidade-btn-config')?.addEventListener('click', async function() {
        if (!unidadeParaManipular) return;
        try {
            const response = await fetch(`${API_URL}/api/usuarios/${unidadeParaManipular.id}`, { method: 'DELETE' });
            const result = await response.json();
            if (result.success) {
                showNotification('Sucesso!', 'Usuário excluído.');
                deleteUnidadeConfirmModalConfig.classList.add('hidden');
                await inicializar();
            } else { showNotification('Erro!', result.message, false); }
        } catch (error) { showNotification('Erro de Conexão', 'Não foi possível apagar a unidade.', false); }
    });

    document.getElementById('cancel-edit-unidade-btn-config')?.addEventListener('click', () => editUnidadeModalConfig.classList.add('hidden'));
    document.getElementById('cancel-delete-unidade-btn-config')?.addEventListener('click', () => deleteUnidadeConfirmModalConfig.classList.add('hidden'));

    inicializar();
});