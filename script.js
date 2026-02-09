// LISTA DE ARQUIVOS JSON
const arquivos = [
    "prova_1_questoes.json", "prova_2_questoes.json", "prova_3_questoes.json",
    "prova_4_questoes.json", "prova_5_questoes.json", "prova_6_questoes.json",
    "prova_7_questoes.json", "prova_8_questoes.json", "prova_9_questoes.json",
    "prova_10_questoes.json", "prova_11_questoes.json", "prova_12_questoes.json",
    "prova_13_questoes.json", "prova_14_questoes.json"
];

let bancoCompleto = [];
let appCarregado = false;
let questoesDaProva = []; 
let indiceAtual = 0;
let acertos = 0;
let erros = 0;
let historicoRespostas = {}; 
let modoAutomaticoAtivo = false; 
let tipoProvaAtual = ""; 
let intervaloContagem = null; 
let tempoRestante = 3;

window.onload = async () => {
    await carregarBancoDeDados();
    gerarBotoesProvas();
    verificarSaveGame();
    if (!localStorage.getItem('timer_dica_visto')) {
        const tooltip = document.getElementById('tooltip-timer');
        if (tooltip) {
            tooltip.style.display = 'block';
            setTimeout(() => {
                tooltip.style.opacity = '0';
                setTimeout(() => tooltip.style.display = 'none', 500);
            }, 8000);
        }
    }
};

async function carregarBancoDeDados() {
    try {
        for (const nome of arquivos) {
            const res = await fetch("./" + nome);
            if (!res.ok) continue;
            const dados = await res.json();
            bancoCompleto = [...bancoCompleto, ...dados];
        }
        bancoCompleto.sort((a, b) => a.id - b.id);
        appCarregado = true;
    } catch (e) {
        console.error(e);
        document.getElementById('grid-provas').innerHTML = "<p style='color:red'>Erro ao carregar dados.</p>";
    }
}

function gerarBotoesProvas() {
    const grid = document.getElementById('grid-provas');
    grid.innerHTML = "";
    for (let i = 1; i <= 14; i++) {
        const btn = document.createElement('button');
        btn.className = 'btn-prova';
        const inicio = (i - 1) * 40 + 1;
        const fim = i * 40;
        btn.innerHTML = `<strong>Prova ${i}</strong><br><small>Q. ${inicio} - ${fim}</small>`;
        btn.onclick = () => iniciarProva('prova_' + i);
        grid.appendChild(btn);
    }
}

function verificarSaveGame() {
    const save = localStorage.getItem('quiz_offshore_save');
    const btn = document.getElementById('btn-continuar');
    if (save) {
        const dados = JSON.parse(save);
        btn.style.display = 'flex';
        let label = "Simulado";
        if (dados.tipo.startsWith('prova_')) {
            const n = dados.tipo.split('_')[1];
            label = `Prova ${n}`;
        }
        
        let proximoIndice = dados.indice;
        if (dados.idsQuestao && dados.historico) {
            const idxNaoRespondido = dados.idsQuestao.findIndex(id => !dados.historico[id]);
            if (idxNaoRespondido !== -1) proximoIndice = idxNaoRespondido;
            else proximoIndice = dados.idsQuestao.length - 1;
        }
        let idReal = "?";
        if(dados.idsQuestao && dados.idsQuestao[proximoIndice]) {
            idReal = dados.idsQuestao[proximoIndice].id || dados.idsQuestao[proximoIndice];
        }
        document.getElementById('info-save').innerText = `${label} • Retomar no PDF #${idReal}`;
    } else {
        btn.style.display = 'none';
    }
}

function iniciarProva(tipo) {
    if (!appCarregado) return;
    indiceAtual = 0;
    acertos = 0;
    erros = 0;
    historicoRespostas = {};
    tipoProvaAtual = tipo;

    if (tipo === 'completa') questoesDaProva = [...bancoCompleto];
    else if (tipo === 'aleatoria') questoesDaProva = [...bancoCompleto].sort(() => Math.random() - 0.5).slice(0, 40);
    else if (tipo.startsWith('prova_')) {
        const numProva = parseInt(tipo.split('_')[1]);
        const inicio = (numProva - 1) * 40;
        const fim = inicio + 40;
        questoesDaProva = bancoCompleto.slice(inicio, fim);
    }
    abrirTelaQuiz();
    mostrarQuestao();
}

function retomarJogo() {
    const save = localStorage.getItem('quiz_offshore_save');
    if (!save) return;
    const dados = JSON.parse(save);
    acertos = dados.acertos;
    erros = dados.erros;
    historicoRespostas = dados.historico;
    tipoProvaAtual = dados.tipo;
    
    if (dados.idsQuestao && dados.idsQuestao.length > 0) {
        questoesDaProva = dados.idsQuestao.map(id => bancoCompleto.find(q => q.id === id)).filter(q => q);
    } else {
        questoesDaProva = [...bancoCompleto];
    }

    let indiceInteligente = 0;
    const primeiroNaoRespondido = questoesDaProva.findIndex(q => !historicoRespostas[q.id]);
    if (primeiroNaoRespondido !== -1) indiceInteligente = primeiroNaoRespondido;
    else indiceInteligente = questoesDaProva.length - 1;
    
    indiceAtual = indiceInteligente;
    abrirTelaQuiz();
    mostrarQuestao();
}

function abrirTelaQuiz() {
    document.getElementById('menu-inicial').classList.add('hidden');
    document.getElementById('tela-quiz').classList.remove('hidden'); 
    document.getElementById('tela-quiz').style.display = 'flex';
    document.getElementById('acertos').innerText = acertos;
    document.getElementById('erros').innerText = erros;
    document.getElementById('relatorio-final').innerHTML = "";
    document.getElementById('pergunta-texto').style.display = 'block';
    document.getElementById('opcoes-container').style.display = 'block';
    document.getElementById('feedback').style.display = 'none';
    document.querySelector('.nav-bar').style.display = 'flex';
    document.querySelector('.header-stats').style.display = 'flex';
    document.querySelector('.top-bar').style.display = 'flex'; // Garante que a barra de entregar aparece
}

function voltarAoMenu() {
    salvarProgresso(); 
    document.getElementById('tela-quiz').classList.add('hidden');
    document.getElementById('menu-inicial').classList.remove('hidden');
    verificarSaveGame(); 
}

function mostrarQuestao() {
    pararContagem(); 

    // Verifica se acabou (índice fora do array)
    if (indiceAtual >= questoesDaProva.length) {
        finalizarQuiz();
        return;
    }

    const q = questoesDaProva[indiceAtual];
    const estado = historicoRespostas[q.id];

    let tituloPrincipal = "Simulado";
    if (tipoProvaAtual.startsWith('prova_')) {
        const num = parseInt(tipoProvaAtual.split('_')[1]);
        tituloPrincipal = `Prova ${num}`; 
    } else if (tipoProvaAtual === 'aleatoria') {
        tituloPrincipal = "Modo Aleatório";
    } else {
        tituloPrincipal = "Simulado Completo";
    }

    document.getElementById('txt-prova').innerText = tituloPrincipal;
    document.getElementById('txt-seq').innerText = `Ref. PDF #${q.id} • (${indiceAtual + 1} de ${questoesDaProva.length})`;

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
    salvarProgresso();
}

function verificarResposta(escolhida, gabarito, botao, idQuestao) {
    if (historicoRespostas[idQuestao]) return;

    const botoes = document.querySelectorAll('.opcao');
    botoes.forEach(b => b.disabled = true); 

    const letraEscolhida = escolhida.trim().charAt(0).toUpperCase();
    const letraCorreta = gabarito ? gabarito.trim().toUpperCase() : "?";
    const acertou = (letraEscolhida === letraCorreta);

    historicoRespostas[idQuestao] = { respondida: true, acertou: acertou, escolha: letraEscolhida };

    if (acertou) {
        acertos++;
        document.getElementById('acertos').innerText = acertos;
        botao.classList.add('resposta-certa');
    } else {
        erros++;
        document.getElementById('erros').innerText = erros;
        botao.classList.add('resposta-errada');
        botoes.forEach(b => {
            if (b.innerText.trim().charAt(0).toUpperCase() === letraCorreta) b.classList.add('resposta-certa');
        });
    }

    exibirFeedbackVisual(acertou, letraCorreta);
    salvarProgresso(); 

    if (modoAutomaticoAtivo) {
        iniciarContagemRegressiva();
    }
}

function iniciarContagemRegressiva() {
    tempoRestante = 3; 
    atualizarTextoTimer(tempoRestante);
    if (intervaloContagem) clearInterval(intervaloContagem);
    intervaloContagem = setInterval(() => {
        tempoRestante--;
        atualizarTextoTimer(tempoRestante);
        if (tempoRestante <= 0) {
            clearInterval(intervaloContagem);
            navegar(1); // Chama navegar, que agora sabe finalizar
        }
    }, 1000); 
}

function pararContagem() {
    if (intervaloContagem) clearInterval(intervaloContagem);
    const txt = document.getElementById('txt-timer');
    txt.innerText = modoAutomaticoAtivo ? "⏰ 3s" : "⏰ Off";
}

function atualizarTextoTimer(segundos) {
    const txt = document.getElementById('txt-timer');
    txt.innerText = `⏰ ${segundos}...`;
}

// --- FUNÇÃO NAVEGAR CORRIGIDA ---
function navegar(direcao) {
    pararContagem(); 
    const novoIndice = indiceAtual + direcao;

    // Se o usuário está na última questão e avança, FINALIZA O QUIZ
    if (novoIndice >= questoesDaProva.length) {
        finalizarQuiz();
        return;
    }

    // Navegação normal (dentro dos limites)
    if (novoIndice >= 0) {
        indiceAtual = novoIndice;
        mostrarQuestao();
    }
}

function alternarTimer() {
    modoAutomaticoAtivo = !modoAutomaticoAtivo;
    const btn = document.getElementById('btn-timer');
    const txt = document.getElementById('txt-timer');
    const tooltip = document.getElementById('tooltip-timer');
    
    if(tooltip) tooltip.style.display = 'none';
    localStorage.setItem('timer_dica_visto', 'true');

    if (modoAutomaticoAtivo) {
        btn.className = "nav-btn timer-on";
        txt.innerText = "⏰ 3s"; 
    } else {
        btn.className = "nav-btn timer-off";
        txt.innerText = "⏰ Off";
        pararContagem(); 
    }
}

function exibirFeedbackVisual(acertou, letraCorreta) {
    const feedbackDiv = document.getElementById('feedback');
    feedbackDiv.style.display = 'block';
    feedbackDiv.innerHTML = acertou 
        ? "<span style='color: #81c784'>Correto! ✅</span>" 
        : `<span style='color: #e57373'>Errou! A correta é <strong>${letraCorreta}</strong></span>`;
}

function salvarProgresso() {
    const dados = {
        tipo: tipoProvaAtual,
        indice: indiceAtual,
        acertos: acertos,
        erros: erros,
        historico: historicoRespostas,
        idsQuestao: questoesDaProva.map(q => q.id),
        data: new Date().getTime()
    };
    localStorage.setItem('quiz_offshore_save', JSON.stringify(dados));
}

function finalizarQuiz() {
    // Esconde elementos
    document.getElementById('pergunta-texto').style.display = 'none';
    document.getElementById('opcoes-container').style.display = 'none';
    document.getElementById('feedback').style.display = 'none';
    document.querySelector('.nav-bar').style.display = 'none';
    document.querySelector('.top-bar').style.display = 'none'; // Esconde barra de entregar

    let relatorioHTML = `
        <h2 style="text-align: center; margin-bottom: 20px; color:white;">Relatório de Desempenho</h2>
        <div class="grid-relatorio">
    `;

    questoesDaProva.forEach(q => {
        const hist = historicoRespostas[q.id];
        let classe = "resumo-neutro";
        let texto = `${q.id} - ?`;
        let gabaritoInfo = "";

        if (hist) {
            if (hist.acertou) {
                classe = "resumo-certo";
                texto = `${q.id} - ${hist.escolha}`;
            } else {
                classe = "resumo-errado";
                texto = `${q.id} - ${hist.escolha}`;
                gabaritoInfo = `<div class="txt-gabarito">Gab: ${q.resposta}</div>`;
            }
        } else {
             texto = `${q.id} - Pular`;
        }

        relatorioHTML += `
            <div class="card-resumo ${classe}">
                <div style="font-size: 16px;">${texto}</div>
                ${gabaritoInfo}
            </div>
        `;
    });

    relatorioHTML += `</div>`;
    relatorioHTML += `
        <button onclick="location.reload()" class="opcao" style="text-align: center; background: #444; margin-top: 20px;">
            Voltar ao Menu
        </button>
    `;

    document.getElementById('relatorio-final').innerHTML = relatorioHTML;
    localStorage.removeItem('quiz_offshore_save');
}