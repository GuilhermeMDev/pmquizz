// CONFIGURAÇÃO DOS ARQUIVOS
const arquivos = [
    "prova_1_questoes.json", "prova_2_questoes.json", "prova_3_questoes.json",
    "prova_4_questoes.json", "prova_5_questoes.json", "prova_6_questoes.json",
    "prova_7_questoes.json", "prova_8_questoes.json", "prova_9_questoes.json",
    "prova_10_questoes.json", "prova_11_questoes.json", "prova_12_questoes.json",
    "prova_13_questoes.json", "prova_14_questoes.json"
];

// ESTADO GLOBAL (Banco de Dados completo na memória)
let bancoCompleto = [];
let appCarregado = false;

// ESTADO DA SESSÃO ATUAL
let questoesDaProva = []; // Apenas as questões selecionadas para agora
let indiceAtual = 0;
let acertos = 0;
let erros = 0;
let historicoRespostas = {}; 
let modoAutomaticoAtivo = false; 
let timerAutomatico = null; 
let tipoProvaAtual = ""; // 'completa', 'prova_1', etc.

// --- INICIALIZAÇÃO ---
window.onload = async () => {
    await carregarBancoDeDados();
    gerarBotoesProvas();
    verificarSaveGame();
};

async function carregarBancoDeDados() {
    try {
        for (const nome of arquivos) {
            const res = await fetch("./" + nome);
            if (!res.ok) continue;
            const dados = await res.json();
            bancoCompleto = [...bancoCompleto, ...dados];
        }
        // Ordena 1 ao 560
        bancoCompleto.sort((a, b) => a.id - b.id);
        appCarregado = true;
        console.log(`Banco carregado: ${bancoCompleto.length} questões.`);
    } catch (e) {
        alert("Erro ao carregar banco de dados. Verifique os arquivos JSON.");
    }
}

function gerarBotoesProvas() {
    const grid = document.getElementById('grid-provas');
    grid.innerHTML = "";
    
    // Gera 14 botões
    for (let i = 1; i <= 14; i++) {
        const btn = document.createElement('button');
        btn.className = 'btn-prova';
        btn.innerHTML = `<strong>Prova ${i}</strong><br><small>Q. ${(i-1)*40 + 1} - ${i*40}</small>`;
        btn.onclick = () => iniciarProva('prova_' + i);
        grid.appendChild(btn);
    }
}

// --- LÓGICA DE MENU E NAVEGAÇÃO ---

function verificarSaveGame() {
    const save = localStorage.getItem('quiz_offshore_save');
    const btn = document.getElementById('btn-continuar');
    
    if (save) {
        const dados = JSON.parse(save);
        btn.style.display = 'flex';
        // Mostra info no botão (ex: Prova 2 - Q. 45)
        const nomeModo = dados.tipo.includes('prova_') ? dados.tipo.replace('prova_', 'Prova ') : 'Simulado';
        document.getElementById('info-save').innerText = `${nomeModo} • Parou na Q. ${dados.indice + 1}`;
    } else {
        btn.style.display = 'none';
    }
}

function iniciarProva(tipo) {
    if (!appCarregado) return;

    // Reseta estado
    indiceAtual = 0;
    acertos = 0;
    erros = 0;
    historicoRespostas = {};
    tipoProvaAtual = tipo;

    // FILTRA AS QUESTÕES BASEADO NO TIPO
    if (tipo === 'completa') {
        questoesDaProva = [...bancoCompleto];
    } 
    else if (tipo === 'aleatoria') {
        // Pega 40 aleatórias
        questoesDaProva = [...bancoCompleto].sort(() => Math.random() - 0.5).slice(0, 40);
    }
    else if (tipo.startsWith('prova_')) {
        const numProva = parseInt(tipo.split('_')[1]);
        const inicio = (numProva - 1) * 40;
        const fim = inicio + 40;
        // Fatia o array original (slice não inclui o fim, então +40 está certo)
        questoesDaProva = bancoCompleto.slice(inicio, fim);
    }

    abrirTelaQuiz();
    mostrarQuestao();
}

function retomarJogo() {
    const save = localStorage.getItem('quiz_offshore_save');
    if (!save) return;

    const dados = JSON.parse(save);
    
    // Restaura o estado
    indiceAtual = dados.indice;
    acertos = dados.acertos;
    erros = dados.erros;
    historicoRespostas = dados.historico;
    tipoProvaAtual = dados.tipo;
    
    // RECONSTRÓI A LISTA DE QUESTÕES
    // Nota: Salvamos os IDs das questões para garantir fidelidade
    if (dados.idsQuestao && dados.idsQuestao.length > 0) {
        questoesDaProva = dados.idsQuestao.map(id => bancoCompleto.find(q => q.id === id)).filter(q => q);
    } else {
        // Fallback para versões antigas ou erro (reinicia modo completo)
        questoesDaProva = [...bancoCompleto];
    }

    abrirTelaQuiz();
    mostrarQuestao();
}

function abrirTelaQuiz() {
    document.getElementById('menu-inicial').classList.add('hidden');
    document.getElementById('tela-quiz').classList.remove('hidden');
    
    // Atualiza placar visualmente
    document.getElementById('acertos').innerText = acertos;
    document.getElementById('erros').innerText = erros;
}

function voltarAoMenu() {
    salvarProgresso(); // Salva antes de sair
    document.getElementById('tela-quiz').classList.add('hidden');
    document.getElementById('menu-inicial').classList.remove('hidden');
    verificarSaveGame(); // Atualiza o botão continuar
}

// --- MOTOR DO JOGO ---

function mostrarQuestao() {
    clearTimeout(timerAutomatico);

    if (indiceAtual >= questoesDaProva.length) {
        finalizarQuiz();
        return;
    }

    const q = questoesDaProva[indiceAtual];
    const estado = historicoRespostas[q.id];

    // Atualiza Interface
    document.getElementById('progresso-txt').innerText = `PDF #${q.id} (Seq: ${indiceAtual + 1}/${questoesDaProva.length})`;
    document.getElementById('pergunta-texto').innerText = q.pergunta;
    
    const feedbackDiv = document.getElementById('feedback');
    feedbackDiv.style.display = 'none';
    feedbackDiv.innerHTML = "";
    
    const container = document.getElementById('opcoes-container');
    container.innerHTML = ""; 

    if (q.opcoes) {
        q.opcoes.forEach(opcao => {
            const btn = document.createElement('button');
            btn.className = 'opcao';
            btn.innerText = opcao;
            
            if (estado && estado.respondida) {
                btn.disabled = true;
                const letraOp = opcao.trim().charAt(0).toUpperCase();
                const letraResp = q.resposta.trim().toUpperCase();
                
                if (letraOp === letraResp) btn.classList.add('resposta-certa');
                if (!estado.acertou && letraOp === estado.escolha) btn.classList.add('resposta-errada');
            } else {
                btn.onclick = () => verificarResposta(opcao, q.resposta, btn, q.id);
            }
            container.appendChild(btn);
        });
    }

    if (estado && estado.respondida) {
        exibirFeedbackVisual(estado.acertou, q.resposta);
    }
    
    // Salva automaticamente a cada questão mostrada (para gravar o índice)
    salvarProgresso();
}

function verificarResposta(escolhida, gabarito, botao, idQuestao) {
    if (historicoRespostas[idQuestao]) return;

    const botoes = document.querySelectorAll('.opcao');
    botoes.forEach(b => b.disabled = true); 

    const letraEscolhida = escolhida.trim().charAt(0).toUpperCase();
    const letraCorreta = gabarito ? gabarito.trim().toUpperCase() : "?";
    const acertou = (letraEscolhida === letraCorreta);

    historicoRespostas[idQuestao] = {
        respondida: true,
        acertou: acertou,
        escolha: letraEscolhida
    };

    if (acertou) {
        acertos++;
        document.getElementById('acertos').innerText = acertos;
        botao.classList.add('resposta-certa');
    } else {
        erros++;
        document.getElementById('erros').innerText = erros;
        botao.classList.add('resposta-errada');
        botoes.forEach(b => {
            if (b.innerText.trim().charAt(0).toUpperCase() === letraCorreta) {
                b.classList.add('resposta-certa');
            }
        });
    }

    exibirFeedbackVisual(acertou, letraCorreta);
    salvarProgresso(); // Salva o resultado

    if (modoAutomaticoAtivo) {
        timerAutomatico = setTimeout(() => navegar(1), 4000); 
    }
}

function exibirFeedbackVisual(acertou, letraCorreta) {
    const feedbackDiv = document.getElementById('feedback');
    feedbackDiv.style.display = 'block';
    feedbackDiv.innerHTML = acertou 
        ? "<span style='color: #81c784'>Correto! ✅</span>" 
        : `<span style='color: #e57373'>Errou! A correta é <strong>${letraCorreta}</strong></span>`;
}

function navegar(direcao) {
    clearTimeout(timerAutomatico);
    const novoIndice = indiceAtual + direcao;
    if (novoIndice >= 0 && novoIndice < questoesDaProva.length) {
        indiceAtual = novoIndice;
        mostrarQuestao();
    }
}

function alternarTimer() {
    modoAutomaticoAtivo = !modoAutomaticoAtivo;
    const btn = document.getElementById('btn-timer');
    btn.className = modoAutomaticoAtivo ? "nav-btn timer-on" : "nav-btn timer-off";
    btn.innerHTML = modoAutomaticoAtivo ? "⏰ 4s" : "⏰ Off";
}

// --- PERSISTÊNCIA (SALVAR/CARREGAR) ---

function salvarProgresso() {
    const dados = {
        tipo: tipoProvaAtual,
        indice: indiceAtual,
        acertos: acertos,
        erros: erros,
        historico: historicoRespostas,
        // Salvamos os IDs da prova atual para poder reconstruir a mesma lista depois
        idsQuestao: questoesDaProva.map(q => q.id),
        data: new Date().getTime()
    };
    localStorage.setItem('quiz_offshore_save', JSON.stringify(dados));
}

function finalizarQuiz() {
    document.getElementById('quiz-container').innerHTML = `
        <h2 style="text-align: center; margin-bottom: 30px;">Fim do Simulado!</h2>
        <div style="display: flex; justify-content: center; gap: 40px; margin-bottom: 40px;">
            <div style="text-align: center;">
                <div style="font-size: 50px; color: #81c784;">${acertos}</div>
                <div style="color: #aaa;">ACERTOS</div>
            </div>
            <div style="text-align: center;">
                <div style="font-size: 50px; color: #e57373;">${erros}</div>
                <div style="color: #aaa;">ERROS</div>
            </div>
        </div>
        <button onclick="location.reload()" class="opcao" style="text-align: center; background: #444;">Voltar ao Início</button>
    `;
    document.querySelector('.nav-bar').style.display = 'none';
    // Limpa o save ao finalizar, para não ficar preso num loop de fim
    localStorage.removeItem('quiz_offshore_save');
}