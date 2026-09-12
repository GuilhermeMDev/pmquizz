// LISTA DE ARQUIVOS JSON (11 PROVAS)
const arquivos = [
    "prova_1_questoes.json", "prova_2_questoes.json", "prova_3_questoes.json",
    "prova_4_questoes.json", "prova_5_questoes.json", "prova_6_questoes.json",
    "prova_7_questoes.json", "prova_8_questoes.json", "prova_9_questoes.json",
    "prova_10_questoes.json", "prova_11_questoes.json"
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

// --- SUPORTE A TECLADO (SETAS) ---
document.addEventListener('keydown', (e) => {
    const quizDiv = document.getElementById('tela-quiz');
    if (quizDiv && !quizDiv.classList.contains('hidden')) {
        if (e.key === 'ArrowRight') navegar(1);
        if (e.key === 'ArrowLeft') navegar(-1);
    }
});

// --- TEMA ---
const themeToggleBtn = document.getElementById('theme-toggle');

function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        if(themeToggleBtn) themeToggleBtn.textContent = '☀️';
    } else {
        document.body.classList.remove('light-theme');
        if(themeToggleBtn) themeToggleBtn.textContent = '🌙';
    }
}

if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('light-theme');
        if (document.body.classList.contains('light-theme')) {
            localStorage.setItem('theme', 'light');
            themeToggleBtn.textContent = '☀️';
        } else {
            localStorage.setItem('theme', 'dark');
            themeToggleBtn.textContent = '🌙';
        }
    });
}

// --- ACORDEÃO (Toggle Provas 1 a 11) ---
function toggleProvas() {
    const container = document.getElementById('container-provas');
    const btn = document.getElementById('accordion-btn');
    
    if (container.classList.contains('hidden')) {
        container.classList.remove('hidden');
        btn.classList.add('active');
        btn.innerText = "📂 Selecionar Prova (1 a 11) ▲";
    } else {
        container.classList.add('hidden');
        btn.classList.remove('active');
        btn.innerText = "📂 Selecionar Prova (1 a 11) ▼";
    }
}

window.onload = async () => {
    initTheme();
    await carregarBancoDeDados();
    gerarBotoesProvas();
    verificarSaveGame();
    atualizarContadorErrosUI();
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
        bancoCompleto = [];
        for (const nome of arquivos) {
            const match = nome.match(/prova_(\d+)_questoes\.json/);
            const numProva = match ? parseInt(match[1]) : 1;

            const res = await fetch("./" + nome);
            if (!res.ok) {
                console.error(`Falha ao carregar ${nome}`);
                continue;
            }
            const dados = await res.json();
            
            const formatados = dados.map((q, idx) => {
                const questaoId = q.id || (idx + 1);
                return {
                    ...q,
                    id: questaoId,
                    prova: numProva,
                    uid: `p${numProva}_q${questaoId}`,
                    pergunta: q.texto || q.pergunta || "",
                    opcoes: q.alternativas || q.opcoes || []
                };
            });

            bancoCompleto = [...bancoCompleto, ...formatados];
        }

        // Ordena por prova e depois por id da questão
        bancoCompleto.sort((a, b) => {
            if (a.prova !== b.prova) return a.prova - b.prova;
            return a.id - b.id;
        });

        appCarregado = true;
    } catch (e) {
        console.error(e);
        const grid = document.getElementById('grid-provas');
        if(grid) grid.innerHTML = "<p style='color:red'>Erro ao carregar dados. Verifique o console.</p>";
    }
}

function gerarBotoesProvas() {
    const grid = document.getElementById('grid-provas');
    if (!grid) return;
    grid.innerHTML = "";
    
    for (let i = 1; i <= 11; i++) {
        const btn = document.createElement('button');
        btn.className = 'btn-prova';
        btn.innerHTML = `<strong>Prova ${i}</strong><br><small>40 Questões</small>`;
        btn.onclick = () => iniciarProva('prova_' + i);
        grid.appendChild(btn);
    }
}

function verificarSaveGame() {
    const save = localStorage.getItem('quiz_pm_save');
    const btn = document.getElementById('btn-continuar');
    if (save) {
        const dados = JSON.parse(save);
        btn.style.display = 'flex';
        
        let label = "Prova";
        if (dados.tipo && dados.tipo.startsWith('prova_')) {
            const n = dados.tipo.split('_')[1];
            label = `Prova ${n}`;
        } else if (dados.tipo === 'erros') {
            label = "Revisão de Erros";
        }
        
        // Encontra a primeira questão não respondida
        let proximoIndice = dados.indice || 0;
        if (dados.idsQuestao && dados.historico) {
            const idxNaoRespondido = dados.idsQuestao.findIndex(uid => !dados.historico[uid]);
            if (idxNaoRespondido !== -1) proximoIndice = idxNaoRespondido;
            else proximoIndice = dados.idsQuestao.length - 1;
        }
        
        const questaoAtual = bancoCompleto.find(q => dados.idsQuestao && q.uid === dados.idsQuestao[proximoIndice]);
        let refTexto = questaoAtual ? `Q. ${questaoAtual.id}` : `Q. ${proximoIndice + 1}`;
        
        const posicaoNaProva = proximoIndice + 1;
        const totalQuestoes = dados.idsQuestao ? dados.idsQuestao.length : "?";
        
        document.getElementById('info-save').innerText = `${label} • ${posicaoNaProva}/${totalQuestoes} • ${refTexto}`;
    } else {
        btn.style.display = 'none';
    }
}

function iniciarProva(tipo) {
    if (!appCarregado) return;
    
    localStorage.removeItem('quiz_pm_save');

    indiceAtual = 0;
    acertos = 0;
    erros = 0;
    historicoRespostas = {};
    tipoProvaAtual = tipo;

    if (tipo === 'erros') {
        const uidsErros = JSON.parse(localStorage.getItem('quiz_pm_erros')) || [];
        
        if (uidsErros.length === 0) {
            alert("Parabéns! Você não tem erros acumulados para revisar.");
            return;
        }

        questoesDaProva = bancoCompleto.filter(q => uidsErros.includes(q.uid));
        questoesDaProva.sort((a, b) => {
            if (a.prova !== b.prova) return a.prova - b.prova;
            return a.id - b.id;
        });
        // Sem limite — mostra TODOS os erros
    }
    else if (tipo.startsWith('prova_')) {
        const numProva = parseInt(tipo.split('_')[1]);
        questoesDaProva = bancoCompleto.filter(q => q.prova === numProva);
    }

    if (questoesDaProva.length === 0) {
        alert("Erro ao carregar questões. Verifique os arquivos.");
        return;
    }

    abrirTelaQuiz();
    mostrarQuestao();
}

function retomarJogo() {
    const save = localStorage.getItem('quiz_pm_save');
    if (!save) return;
    const dados = JSON.parse(save);
    acertos = dados.acertos;
    erros = dados.erros;
    historicoRespostas = dados.historico;
    tipoProvaAtual = dados.tipo;
    
    if (dados.idsQuestao && dados.idsQuestao.length > 0) {
        questoesDaProva = dados.idsQuestao.map(uid => bancoCompleto.find(q => q.uid === uid)).filter(q => q);
    } else {
        questoesDaProva = [...bancoCompleto];
    }

    let indiceInteligente = 0;
    const primeiroNaoRespondido = questoesDaProva.findIndex(q => !historicoRespostas[q.uid]);
    if (primeiroNaoRespondido !== -1) indiceInteligente = primeiroNaoRespondido;
    else indiceInteligente = questoesDaProva.length - 1;
    
    indiceAtual = indiceInteligente;
    
    abrirTelaQuiz();
    mostrarQuestao();
}

function abrirTelaQuiz() {
    document.getElementById('menu-inicial').classList.add('hidden');
    
    if (themeToggleBtn) themeToggleBtn.style.display = 'none';

    const footer = document.querySelector('footer');
    if (footer) footer.style.display = 'none';
    
    document.getElementById('tela-quiz').classList.remove('hidden'); 
    document.getElementById('tela-quiz').style.display = 'flex';
    document.getElementById('acertos').innerText = acertos;
    document.getElementById('erros').innerText = erros;
    document.getElementById('relatorio-final').innerHTML = "";
    document.getElementById('pergunta-texto').style.display = 'block';
    const containerImg = document.getElementById('container-imagem');
    if (containerImg) containerImg.style.display = 'none';
    const containerDica = document.getElementById('container-dica');
    if (containerDica) containerDica.style.display = 'none';
    document.getElementById('opcoes-container').style.display = 'block';
    document.getElementById('feedback').style.display = 'none';
    document.querySelector('.nav-bar').style.display = 'flex';
    document.querySelector('.top-bar').style.display = 'flex';
    document.querySelector('.header-stats').style.display = 'flex';
}

function voltarAoMenu() {
    salvarProgresso(); 
    
    if (themeToggleBtn) themeToggleBtn.style.display = 'flex';

    document.getElementById('tela-quiz').classList.add('hidden');
    document.getElementById('menu-inicial').classList.remove('hidden');
    const footer = document.querySelector('footer');
    if (footer) footer.style.display = 'block';
    verificarSaveGame(); 
}

function mostrarQuestao() {
    pararContagem(); 

    if (indiceAtual >= questoesDaProva.length) {
        finalizarQuiz();
        return;
    }

    const q = questoesDaProva[indiceAtual];
    const estado = historicoRespostas[q.uid];

    let tituloPrincipal = "Simulado";
    let subtituloSeq = `Ref. PDF #${q.id} • (${indiceAtual + 1} de ${questoesDaProva.length})`;

    if (tipoProvaAtual.startsWith('prova_')) {
        const num = parseInt(tipoProvaAtual.split('_')[1]);
        tituloPrincipal = `Prova ${num}`; 
        subtituloSeq = `Questão ${q.id} de ${questoesDaProva.length}`;
    } else if (tipoProvaAtual === 'erros') {
        tituloPrincipal = "Revisão de Erros"; 
        subtituloSeq = `Prova ${q.prova} • Questão ${q.id} • (${indiceAtual + 1} de ${questoesDaProva.length})`;
    }

    document.getElementById('txt-prova').innerText = tituloPrincipal;
    document.getElementById('txt-seq').innerText = subtituloSeq;

    // Imagem de apoio da questão (se houver)
    const containerImg = document.getElementById('container-imagem');
    const imgEl = document.getElementById('pergunta-imagem');
    if (containerImg && imgEl) {
        if (q.imagem) {
            imgEl.src = q.imagem;
            containerImg.style.display = 'block';
        } else {
            containerImg.style.display = 'none';
            imgEl.src = '';
        }
    }

    document.getElementById('pergunta-texto').innerText = q.pergunta || q.texto;
    
    // Gerenciamento da Dica da Questão
    const containerDica = document.getElementById('container-dica');
    const boxDica = document.getElementById('box-dica');
    const setaDica = document.getElementById('btn-dica-seta');
    if (containerDica && boxDica) {
        if (q.dica && q.dica.trim().length > 0) {
            containerDica.style.display = 'block';
            boxDica.innerText = q.dica;
            boxDica.classList.add('hidden');
            if (setaDica) setaDica.innerText = '▼';
        } else {
            containerDica.style.display = 'none';
            boxDica.classList.add('hidden');
        }
    }

    const feedbackDiv = document.getElementById('feedback');
    feedbackDiv.style.display = 'none';
    feedbackDiv.innerHTML = "";
    
    const container = document.getElementById('opcoes-container');
    container.innerHTML = ""; 

    const listaOpcoes = q.opcoes || q.alternativas || [];
    listaOpcoes.forEach(opcao => {
        const btn = document.createElement('button');
        btn.className = 'opcao';
        btn.innerText = opcao;
        
        if (estado && estado.respondida) {
            btn.disabled = true;
            const letraOp = opcao.trim().charAt(0).toUpperCase();
            const letraResp = q.resposta ? q.resposta.trim().toUpperCase() : "";
            if (letraOp === letraResp) btn.classList.add('resposta-certa');
            if (!estado.acertou && letraOp === estado.escolha) btn.classList.add('resposta-errada');
        } else {
            btn.onclick = () => verificarResposta(opcao, q.resposta, btn, q.uid, q.opcoes || q.alternativas || []);
        }
        container.appendChild(btn);
    });

    if (estado && estado.respondida) {
        // Reconstrói o feedback com o texto completo da alternativa correta
        const letraCorreta = q.resposta ? q.resposta.trim().toUpperCase() : "?";
        const alternativaCorreta = listaOpcoes.find(op => op.trim().charAt(0).toUpperCase() === letraCorreta) || letraCorreta;
        exibirFeedbackVisual(estado.acertou, letraCorreta, alternativaCorreta);
    }
    salvarProgresso();
}

function verificarResposta(escolhida, gabarito, botao, uidQuestao, listaOpcoes) {
    if (historicoRespostas[uidQuestao]) return;

    const botoes = document.querySelectorAll('.opcao');
    botoes.forEach(b => b.disabled = true); 

    const letraEscolhida = escolhida.trim().charAt(0).toUpperCase();
    const letraCorreta = gabarito ? gabarito.trim().toUpperCase() : "?";
    const acertou = (letraEscolhida === letraCorreta);

    atualizarBancoErros(uidQuestao, acertou);

    historicoRespostas[uidQuestao] = { respondida: true, acertou: acertou, escolha: letraEscolhida };

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

    // Encontra o texto completo da alternativa correta para exibir no feedback
    const alternativaCorreta = listaOpcoes.find(op => op.trim().charAt(0).toUpperCase() === letraCorreta) || letraCorreta;
    exibirFeedbackVisual(acertou, letraCorreta, alternativaCorreta);
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
            navegar(1);
        }
    }, 1000); 
}

function pararContagem() {
    if (intervaloContagem) clearInterval(intervaloContagem);
    const txt = document.getElementById('txt-timer');
    if (txt) txt.innerText = modoAutomaticoAtivo ? "⏰ 3s" : "⏰ Off";
}

function atualizarTextoTimer(segundos) {
    const txt = document.getElementById('txt-timer');
    if (txt) txt.innerText = `⏰ ${segundos}...`;
}

function navegar(direcao) {
    pararContagem(); 
    const novoIndice = indiceAtual + direcao;
    
    if (novoIndice >= questoesDaProva.length) {
        finalizarQuiz();
        return;
    }

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

function toggleDica() {
    const boxDica = document.getElementById('box-dica');
    const setaDica = document.getElementById('btn-dica-seta');
    if (!boxDica) return;

    boxDica.classList.toggle('hidden');
    if (setaDica) {
        setaDica.innerText = boxDica.classList.contains('hidden') ? '▼' : '▲';
    }
}

function exibirFeedbackVisual(acertou, letraCorreta, alternativaCorreta) {
    const feedbackDiv = document.getElementById('feedback');
    feedbackDiv.style.display = 'block';

    if (acertou) {
        feedbackDiv.innerHTML = `
            <div class="feedback-acerto">
                <span class="feedback-icon">✅</span>
                <span class="feedback-texto">Correto!</span>
            </div>`;
        feedbackDiv.className = 'feedback-box feedback-acerto-box';
    } else {
        // Mostra o texto completo da alternativa correta, não só a letra
        const textoExibir = alternativaCorreta && alternativaCorreta.length > 2
            ? alternativaCorreta
            : `Alternativa ${letraCorreta}`;

        feedbackDiv.innerHTML = `
            <div class="feedback-erro">
                <span class="feedback-icon">❌</span>
                <div class="feedback-detalhe">
                    <span class="feedback-texto">Errou!</span>
                    <span class="feedback-gabarito">A correta era: <strong>${textoExibir}</strong></span>
                </div>
            </div>`;
        feedbackDiv.className = 'feedback-box feedback-erro-box';
    }
}

function salvarProgresso() {
    const dados = {
        tipo: tipoProvaAtual,
        indice: indiceAtual,
        acertos: acertos,
        erros: erros,
        historico: historicoRespostas,
        idsQuestao: questoesDaProva.map(q => q.uid),
        data: new Date().getTime()
    };
    localStorage.setItem('quiz_pm_save', JSON.stringify(dados));
}

// --- SISTEMA DE BANCO DE ERROS ---
function atualizarBancoErros(uidQuestao, acertou) {
    let errosSalvos = JSON.parse(localStorage.getItem('quiz_pm_erros')) || [];

    if (!acertou) {
        if (!errosSalvos.includes(uidQuestao)) {
            errosSalvos.push(uidQuestao);
        }
    } else {
        errosSalvos = errosSalvos.filter(uid => uid !== uidQuestao);
    }

    localStorage.setItem('quiz_pm_erros', JSON.stringify(errosSalvos));
    atualizarContadorErrosUI();
}

function atualizarContadorErrosUI() {
    const errosSalvos = JSON.parse(localStorage.getItem('quiz_pm_erros')) || [];
    const span = document.getElementById('contagem-erros');
    if (span) {
        span.innerText = `(${errosSalvos.length})`;
    }
    const btn = document.getElementById('btn-erros');
    const btnZerar = document.getElementById('btn-zerar-erros');
    if(btn) {
        if(errosSalvos.length === 0) btn.style.opacity = "0.5";
        else btn.style.opacity = "1";
    }
    if(btnZerar) {
        btnZerar.style.display = errosSalvos.length > 0 ? 'block' : 'none';
    }
}

function zerarBancoErros() {
    const errosSalvos = JSON.parse(localStorage.getItem('quiz_pm_erros')) || [];
    if (errosSalvos.length === 0) return;

    const confirmar = confirm(`Zerar ${errosSalvos.length} erro(s) acumulado(s)? Esta ação não pode ser desfeita.`);
    if (confirmar) {
        localStorage.removeItem('quiz_pm_erros');
        atualizarContadorErrosUI();
    }
}

function finalizarQuiz() {
    const containerImg = document.getElementById('container-imagem');
    if (containerImg) containerImg.style.display = 'none';
    document.getElementById('pergunta-texto').style.display = 'none';
    const containerDica = document.getElementById('container-dica');
    if (containerDica) containerDica.style.display = 'none';
    document.getElementById('opcoes-container').style.display = 'none';
    document.getElementById('feedback').style.display = 'none';
    document.querySelector('.nav-bar').style.display = 'none';
    document.querySelector('.top-bar').style.display = 'none';

    // --- Calcula estatísticas ---
    const totalQuestoes = questoesDaProva.length;
    const totalAcertos = Object.values(historicoRespostas).filter(h => h.acertou).length;
    const totalErros = Object.values(historicoRespostas).filter(h => !h.acertou).length;
    const totalPuladas = totalQuestoes - totalAcertos - totalErros;
    const aproveitamento = totalQuestoes > 0 ? Math.round((totalAcertos / totalQuestoes) * 100) : 0;

    // Emoji de desempenho
    let emojiDesempenho = '📊';
    if (aproveitamento >= 80) emojiDesempenho = '🏆';
    else if (aproveitamento >= 60) emojiDesempenho = '💪';
    else emojiDesempenho = '📖';

    // Título do relatório
    let tituloProva = "Simulado";
    if (tipoProvaAtual.startsWith('prova_')) {
        const num = tipoProvaAtual.split('_')[1];
        tituloProva = `Prova ${num}`;
    } else if (tipoProvaAtual === 'erros') {
        tituloProva = "Revisão de Erros";
    }

    let relatorioHTML = `
        <div class="relatorio-header">
            <div class="relatorio-titulo">${emojiDesempenho} ${tituloProva} — Resultado</div>
            <div class="relatorio-stats-grid">
                <div class="stat-card stat-acerto">
                    <span class="stat-num">${totalAcertos}</span>
                    <span class="stat-label">✔ Acertos</span>
                </div>
                <div class="stat-card stat-erro">
                    <span class="stat-num">${totalErros}</span>
                    <span class="stat-label">✖ Erros</span>
                </div>
                <div class="stat-card stat-pulou">
                    <span class="stat-num">${totalPuladas}</span>
                    <span class="stat-label">⏭ Puladas</span>
                </div>
                <div class="stat-card stat-aproveitamento">
                    <span class="stat-num">${aproveitamento}%</span>
                    <span class="stat-label">Aproveitamento</span>
                </div>
            </div>
        </div>
        <div class="grid-relatorio">
    `;

    questoesDaProva.forEach(q => {
        const hist = historicoRespostas[q.uid];
        let classe = "resumo-neutro";
        let texto = `P${q.prova} Q.${q.id} - Pulou`;
        let gabaritoInfo = "";

        if (hist) {
            if (hist.acertou) {
                classe = "resumo-certo";
                texto = `P${q.prova} Q.${q.id} - ${hist.escolha}`;
            } else {
                classe = "resumo-errado";
                texto = `P${q.prova} Q.${q.id} - ${hist.escolha}`;
                const correta = q.resposta ? q.resposta.toUpperCase() : "?";
                gabaritoInfo = `<div class="txt-gabarito">Gab: ${correta}</div>`;
            }
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
        <button onclick="location.reload()" class="btn-voltar-menu">
            ← Voltar ao Menu
        </button>
    `;

    document.getElementById('relatorio-final').innerHTML = relatorioHTML;
    localStorage.removeItem('quiz_pm_save');
}