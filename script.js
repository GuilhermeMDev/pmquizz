// LISTA DE ARQUIVOS JSON (11 PROVAS)
const arquivos = [
    "prova_1_questoes.json", "prova_2_questoes.json", "prova_3_questoes.json",
    "prova_4_questoes.json", "prova_5_questoes.json", "prova_6_questoes.json",
    "prova_7_questoes.json", "prova_8_questoes.json", "prova_9_questoes.json",
    "prova_10_questoes.json", "prova_11_questoes.json"
];

// Cores por prova — accent visual dinâmico
const PROVA_CORES = [
    '#4f8ef7', // 1 — Azul
    '#a855f7', // 2 — Roxo
    '#14b8a6', // 3 — Teal
    '#f97316', // 4 — Laranja
    '#ec4899', // 5 — Rosa
    '#22c55e', // 6 — Verde
    '#ef4444', // 7 — Vermelho
    '#6366f1', // 8 — Índigo
    '#eab308', // 9 — Amarelo
    '#06b6d4', // 10 — Ciano
    '#a16207', // 11 — Âmbar escuro
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
let isNavigating = false;

// Suporte a teclado
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
        if (themeToggleBtn) themeToggleBtn.textContent = '☀️';
    } else {
        document.body.classList.remove('light-theme');
        if (themeToggleBtn) themeToggleBtn.textContent = '🌙';
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

// --- ACORDEÃO ---
function toggleProvas() {
    const container = document.getElementById('container-provas');
    const btn = document.getElementById('accordion-btn');
    if (container.classList.contains('hidden')) {
        container.classList.remove('hidden');
        btn.classList.add('active');
    } else {
        container.classList.add('hidden');
        btn.classList.remove('active');
    }
}

// =====================================================
//  INICIALIZAÇÃO
// =====================================================

window.onload = async () => {
    initTheme();
    await carregarBancoDeDados();
    gerarBotoesProvas();
    verificarSaveGame();
    atualizarContadorErrosUI();
    atualizarCicloUI();

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
            if (!res.ok) { console.error(`Falha ao carregar ${nome}`); continue; }
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
        bancoCompleto.sort((a, b) => {
            if (a.prova !== b.prova) return a.prova - b.prova;
            return a.id - b.id;
        });
        appCarregado = true;
    } catch (e) {
        console.error(e);
        const grid = document.getElementById('grid-provas');
        if (grid) grid.innerHTML = "<p style='color:red'>Erro ao carregar dados.</p>";
    }
}

// =====================================================
//  DADOS DE PROGRESSO — HISTÓRICO E CICLO
// =====================================================

function salvarHistoricoProva(numProva, acertosTotal, errosTotal, total, aproveitamento) {
    const historico = JSON.parse(localStorage.getItem('quiz_pm_historico')) || {};
    const key = `prova_${numProva}`;
    if (!historico[key]) historico[key] = [];

    historico[key].push({
        date: Date.now(),
        acertos: acertosTotal,
        erros: errosTotal,
        total,
        aproveitamento
    });

    // Mantém no máximo as últimas 10 sessões por prova
    if (historico[key].length > 10) {
        historico[key] = historico[key].slice(-10);
    }

    localStorage.setItem('quiz_pm_historico', JSON.stringify(historico));
}

function atualizarCiclo(numProva) {
    const ciclo = JSON.parse(localStorage.getItem('quiz_pm_ciclo')) || {
        ciclosCompletos: 0,
        provasNoAtual: [],
        inicioCiclo: Date.now()
    };

    // Adiciona prova ao ciclo atual se ainda não estiver
    if (!ciclo.provasNoAtual.includes(numProva)) {
        ciclo.provasNoAtual.push(numProva);
    }

    // Verifica se completou o ciclo de todas as 11 provas
    if (ciclo.provasNoAtual.length >= 11) {
        ciclo.ciclosCompletos++;
        ciclo.provasNoAtual = [];
        ciclo.inicioCiclo = Date.now();
        localStorage.setItem('quiz_pm_ciclo', JSON.stringify(ciclo));
        atualizarCicloUI();
        // Celebra o ciclo completo
        exibirCelebraCiclo(ciclo.ciclosCompletos);
        return;
    }

    localStorage.setItem('quiz_pm_ciclo', JSON.stringify(ciclo));
    atualizarCicloUI();
}

function exibirCelebraCiclo(numCiclo) {
    setTimeout(() => {
        alert(`🏆 Incrível! Você completou o Ciclo ${numCiclo}!\n\nTodas as 11 provas foram concluídas. O ciclo ${numCiclo + 1} começa agora. Continue assim!`);
    }, 500);
}

function obterDadosProva(numProva) {
    const historico = JSON.parse(localStorage.getItem('quiz_pm_historico')) || {};
    const sessoes = historico[`prova_${numProva}`] || [];
    if (sessoes.length === 0) return null;

    const ultima = sessoes[sessoes.length - 1];
    const melhor = Math.max(...sessoes.map(s => s.aproveitamento));
    const anterior = sessoes.length >= 2 ? sessoes[sessoes.length - 2] : null;
    const trend = anterior ? ultima.aproveitamento - anterior.aproveitamento : null;

    return {
        tentativas: sessoes.length,
        ultima: ultima.aproveitamento,
        melhor,
        trend, // null se só 1 sessão
        sessoes
    };
}

function atualizarCicloUI() {
    const ciclo = JSON.parse(localStorage.getItem('quiz_pm_ciclo')) || {
        ciclosCompletos: 0,
        provasNoAtual: []
    };
    const completadas = ciclo.provasNoAtual || [];
    const cicloAtual = ciclo.ciclosCompletos + 1;

    const label = document.getElementById('ciclo-label');
    if (label) {
        label.textContent = `Ciclo ${cicloAtual} • ${completadas.length}/11 provas`;
    }

    const dotsContainer = document.getElementById('ciclo-dots-mini');
    if (dotsContainer) {
        dotsContainer.innerHTML = '';
        for (let i = 1; i <= 11; i++) {
            const done = completadas.includes(i);
            const dot = document.createElement('div');
            dot.className = `ciclo-dot ${done ? 'done' : ''}`;
            dot.title = `Prova ${i}${done ? ' ✓' : ''}`;
            if (done) {
                dot.style.background = PROVA_CORES[(i - 1) % PROVA_CORES.length];
                dot.style.borderColor = PROVA_CORES[(i - 1) % PROVA_CORES.length];
            }
            dotsContainer.appendChild(dot);
        }
    }
}

// =====================================================
//  TELA DE ESTATÍSTICAS
// =====================================================

function abrirStats() {
    document.getElementById('menu-inicial').classList.add('hidden');
    if (themeToggleBtn) themeToggleBtn.style.display = 'none';
    const footer = document.querySelector('footer');
    if (footer) footer.style.display = 'none';
    document.getElementById('tela-stats').classList.remove('hidden');
    renderizarStats();
    window.scrollTo(0, 0);
}

function fecharStats() {
    document.getElementById('tela-stats').classList.add('hidden');
    document.getElementById('menu-inicial').classList.remove('hidden');
    if (themeToggleBtn) themeToggleBtn.style.display = 'flex';
    const footer = document.querySelector('footer');
    if (footer) footer.style.display = 'block';
}

function renderizarStats() {
    const historico = JSON.parse(localStorage.getItem('quiz_pm_historico')) || {};
    const ciclo = JSON.parse(localStorage.getItem('quiz_pm_ciclo')) || {
        ciclosCompletos: 0,
        provasNoAtual: []
    };

    // Calcula estatísticas globais
    let totalRespondidas = 0;
    let totalAcertosGlobal = 0;
    let provasComDados = 0;

    for (let i = 1; i <= 11; i++) {
        const sessoes = historico[`prova_${i}`] || [];
        if (sessoes.length > 0) provasComDados++;
        sessoes.forEach(s => {
            totalRespondidas += s.total || 0;
            totalAcertosGlobal += s.acertos || 0;
        });
    }

    // Se não há nenhum dado ainda
    if (totalRespondidas === 0 && ciclo.ciclosCompletos === 0) {
        document.getElementById('stats-content').innerHTML = `
            <div class="stats-vazio">
                <div class="stats-vazio-icon">📊</div>
                <div class="stats-vazio-texto">Nenhuma estatística ainda</div>
                <div class="stats-vazio-sub">Complete uma prova para ver seu progresso aqui.</div>
            </div>`;
        return;
    }

    const aprovGlobal = totalRespondidas > 0
        ? Math.round((totalAcertosGlobal / totalRespondidas) * 100)
        : 0;

    const cicloAtual = ciclo.ciclosCompletos + 1;
    const completadasNoCiclo = ciclo.provasNoAtual || [];

    let html = '';

    // --- RESUMO GERAL ---
    html += `
        <div class="stats-resumo-geral">
            <div class="stat-card-big">
                <span class="stat-big-num">${ciclo.ciclosCompletos}</span>
                <span class="stat-big-label">Ciclos<br>completos</span>
            </div>
            <div class="stat-card-big">
                <span class="stat-big-num">${aprovGlobal}%</span>
                <span class="stat-big-label">Aproveita-<br>mento geral</span>
            </div>
            <div class="stat-card-big">
                <span class="stat-big-num">${totalRespondidas}</span>
                <span class="stat-big-label">Questões<br>respondidas</span>
            </div>
        </div>`;

    // --- CICLO ATUAL ---
    const dotsHtml = Array.from({ length: 11 }, (_, i) => {
        const num = i + 1;
        const done = completadasNoCiclo.includes(num);
        const cor = PROVA_CORES[i % PROVA_CORES.length];
        const style = done
            ? `background:${cor}; border-color:${cor}`
            : `border-color:${cor}40`;
        return `<div class="stats-dot ${done ? 'stats-dot-done' : ''}" style="${style}" title="Prova ${num}">
            <span class="stats-dot-num">${num}</span>
        </div>`;
    }).join('');

    html += `
        <div class="stats-ciclo-card">
            <div class="stats-ciclo-header">
                <span class="stats-ciclo-titulo">Ciclo ${cicloAtual} em andamento</span>
                <span class="stats-ciclo-sub">${completadasNoCiclo.length}/11 concluídas</span>
            </div>
            <div class="stats-ciclo-dots">${dotsHtml}</div>
        </div>`;

    // --- POR PROVA ---
    html += `<div class="stats-section-title">Por Prova</div><div class="stats-provas-lista">`;

    for (let i = 1; i <= 11; i++) {
        const dados = obterDadosProva(i);
        const cor = PROVA_CORES[(i - 1) % PROVA_CORES.length];
        const noAtual = completadasNoCiclo.includes(i);

        if (!dados) {
            html += `
                <div class="stats-prova-card stats-prova-vazia" style="--card-accent:${cor}">
                    <div class="stats-prova-header">
                        <span class="stats-prova-num" style="color:${cor}">${i}</span>
                        <span class="stats-prova-nome">Prova ${i}</span>
                        <span class="stats-prova-badge-nao">Não iniciada</span>
                    </div>
                </div>`;
            continue;
        }

        // Tendência
        let trendHTML = '';
        if (dados.trend === null) {
            trendHTML = `<span class="trend-neutro">1ª tentativa</span>`;
        } else if (dados.trend > 0) {
            trendHTML = `<span class="trend-positivo">↑ +${dados.trend}%</span>`;
        } else if (dados.trend < 0) {
            trendHTML = `<span class="trend-negativo">↓ ${dados.trend}%</span>`;
        } else {
            trendHTML = `<span class="trend-neutro">→ Estável</span>`;
        }

        const badgeAtual = noAtual
            ? `<span class="stats-prova-badge-ok">✓ Ciclo ${cicloAtual}</span>`
            : '';

        html += `
            <div class="stats-prova-card" style="--card-accent:${cor}">
                <div class="stats-prova-header">
                    <span class="stats-prova-num" style="color:${cor}">${i}</span>
                    <span class="stats-prova-nome">Prova ${i}</span>
                    <span class="stats-prova-tentativas">${dados.tentativas}x</span>
                    ${badgeAtual}
                </div>
                <div class="stats-prova-barra-container">
                    <div class="stats-prova-barra" style="width:${dados.ultima}%; background:${cor}"></div>
                    <div class="stats-prova-marcador-melhor" style="left:${dados.melhor}%" title="Melhor: ${dados.melhor}%"></div>
                </div>
                <div class="stats-prova-numeros">
                    <span class="stats-prova-ultima">Última: <strong>${dados.ultima}%</strong></span>
                    ${trendHTML}
                    <span class="stats-prova-melhor">Melhor: <strong>${dados.melhor}%</strong></span>
                </div>
            </div>`;
    }

    html += `</div>`;
    document.getElementById('stats-content').innerHTML = html;
}

// =====================================================
//  MENU
// =====================================================

function gerarBotoesProvas() {
    const grid = document.getElementById('grid-provas');
    if (!grid) return;
    grid.innerHTML = "";

    for (let i = 1; i <= 11; i++) {
        const cor = PROVA_CORES[(i - 1) % PROVA_CORES.length];
        const dados = obterDadosProva(i);

        let scoreHTML = '<span class="prova-score trend-new">Não iniciada</span>';
        if (dados) {
            let trendClass = 'trend-flat';
            let trendChar = '→';
            if (dados.trend !== null) {
                if (dados.trend > 0) { trendClass = 'trend-up'; trendChar = '↑'; }
                else if (dados.trend < 0) { trendClass = 'trend-down'; trendChar = '↓'; }
            }
            scoreHTML = `<span class="prova-score ${trendClass}">${dados.ultima}% <span class="trend-arrow">${trendChar}</span></span>`;
        }

        const btn = document.createElement('button');
        btn.className = 'btn-prova';
        btn.style.setProperty('--btn-accent', cor);
        btn.innerHTML = `
            <span class="prova-numero">${i}</span>
            <span class="prova-label">Prova ${i}</span>
            ${scoreHTML}`;
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
            label = `Prova ${dados.tipo.split('_')[1]}`;
        } else if (dados.tipo === 'erros') {
            label = "Revisão de Erros";
        }
        let proximoIndice = dados.indice || 0;
        if (dados.idsQuestao && dados.historico) {
            const idxNaoRespondido = dados.idsQuestao.findIndex(uid => !dados.historico[uid]);
            if (idxNaoRespondido !== -1) proximoIndice = idxNaoRespondido;
            else proximoIndice = dados.idsQuestao.length - 1;
        }
        const posicaoNaProva = proximoIndice + 1;
        const totalQuestoes = dados.idsQuestao ? dados.idsQuestao.length : "?";
        const titleEl = btn.querySelector('.btn-menu-title');
        const subEl = document.getElementById('info-save');
        if (titleEl) titleEl.textContent = `Continuar — ${label}`;
        if (subEl) subEl.textContent = `Questão ${posicaoNaProva} de ${totalQuestoes}`;
    } else {
        btn.style.display = 'none';
    }
}

// =====================================================
//  LÓGICA DA PROVA
// =====================================================

function iniciarProva(tipo) {
    if (!appCarregado) return;
    localStorage.removeItem('quiz_pm_save');
    indiceAtual = 0;
    acertos = 0;
    erros = 0;
    historicoRespostas = {};
    tipoProvaAtual = tipo;
    isNavigating = false;

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
    } else if (tipo.startsWith('prova_')) {
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
    isNavigating = false;

    if (dados.idsQuestao && dados.idsQuestao.length > 0) {
        questoesDaProva = dados.idsQuestao.map(uid => bancoCompleto.find(q => q.uid === uid)).filter(q => q);
    } else {
        questoesDaProva = [...bancoCompleto];
    }
    const primeiroNaoRespondido = questoesDaProva.findIndex(q => !historicoRespostas[q.uid]);
    indiceAtual = primeiroNaoRespondido !== -1 ? primeiroNaoRespondido : questoesDaProva.length - 1;
    abrirTelaQuiz();
    mostrarQuestao();
}

function abrirTelaQuiz() {
    document.getElementById('menu-inicial').classList.add('hidden');
    document.getElementById('tela-stats').classList.add('hidden');
    if (themeToggleBtn) themeToggleBtn.style.display = 'none';
    const footer = document.querySelector('footer');
    if (footer) footer.style.display = 'none';

    document.getElementById('tela-quiz').classList.remove('hidden');
    document.getElementById('tela-quiz').style.display = 'flex';
    document.getElementById('acertos').innerText = acertos;
    document.getElementById('erros').innerText = erros;
    document.getElementById('relatorio-final').innerHTML = "";

    const qw = document.getElementById('question-wrapper');
    if (qw) qw.style.display = 'block';
    const pc = document.getElementById('progress-container');
    if (pc) pc.style.display = 'block';

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
    document.documentElement.style.setProperty('--prova-accent', '#4f8ef7');
    verificarSaveGame();
    atualizarCicloUI();
    gerarBotoesProvas(); // Atualiza scores nos botões
}

// =====================================================
//  PROGRESSO, ACENTO E QUESTÃO
// =====================================================

function atualizarProgressBar() {
    const progress = questoesDaProva.length > 0
        ? ((indiceAtual + 1) / questoesDaProva.length) * 100
        : 0;
    const fill = document.getElementById('progress-fill');
    if (fill) fill.style.width = progress + '%';
}

function atualizarAcentoProva(numProva) {
    const cor = PROVA_CORES[(numProva - 1) % PROVA_CORES.length] || PROVA_CORES[0];
    document.documentElement.style.setProperty('--prova-accent', cor);
}

function mostrarQuestao() {
    pararContagem();
    if (indiceAtual >= questoesDaProva.length) {
        finalizarQuiz();
        return;
    }

    const q = questoesDaProva[indiceAtual];
    const estado = historicoRespostas[q.uid];

    atualizarProgressBar();
    atualizarAcentoProva(q.prova);

    let tituloPrincipal = "Simulado";
    let subtituloSeq = `Ref. PDF #${q.id} • (${indiceAtual + 1} de ${questoesDaProva.length})`;

    if (tipoProvaAtual.startsWith('prova_')) {
        const num = parseInt(tipoProvaAtual.split('_')[1]);
        tituloPrincipal = `Prova ${num}`;
        subtituloSeq = `Questão ${q.id} de ${questoesDaProva.length}`;
    } else if (tipoProvaAtual === 'erros') {
        tituloPrincipal = "Revisão de Erros";
        subtituloSeq = `Prova ${q.prova} • Q.${q.id} • (${indiceAtual + 1}/${questoesDaProva.length})`;
    }

    document.getElementById('txt-prova').innerText = tituloPrincipal;
    document.getElementById('txt-seq').innerText = subtituloSeq;

    // Imagem
    const containerImg = document.getElementById('container-imagem');
    const imgEl = document.getElementById('pergunta-imagem');
    if (containerImg && imgEl) {
        if (q.imagem) { imgEl.src = q.imagem; containerImg.style.display = 'block'; }
        else { containerImg.style.display = 'none'; imgEl.src = ''; }
    }

    document.getElementById('pergunta-texto').innerText = q.pergunta || q.texto;

    // Dica
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

    // Feedback
    const feedbackDiv = document.getElementById('feedback');
    feedbackDiv.style.display = 'none';
    feedbackDiv.innerHTML = "";

    // Alternativas
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
            btn.onclick = () => verificarResposta(opcao, q.resposta, btn, q.uid, listaOpcoes);
        }
        container.appendChild(btn);
    });

    if (estado && estado.respondida) {
        const letraCorreta = q.resposta ? q.resposta.trim().toUpperCase() : "?";
        const alternativaCorreta = listaOpcoes.find(op => op.trim().charAt(0).toUpperCase() === letraCorreta) || letraCorreta;
        exibirFeedbackVisual(estado.acertou, letraCorreta, alternativaCorreta);
    }

    salvarProgresso();
}

// =====================================================
//  RESPOSTA E ANIMAÇÕES
// =====================================================

function verificarResposta(escolhida, gabarito, botao, uidQuestao, listaOpcoes) {
    if (historicoRespostas[uidQuestao]) return;
    const botoes = document.querySelectorAll('.opcao');
    botoes.forEach(b => b.disabled = true);

    const letraEscolhida = escolhida.trim().charAt(0).toUpperCase();
    const letraCorreta = gabarito ? gabarito.trim().toUpperCase() : "?";
    const acertou = (letraEscolhida === letraCorreta);

    atualizarBancoErros(uidQuestao, acertou);
    historicoRespostas[uidQuestao] = { respondida: true, acertou, escolha: letraEscolhida };

    if (acertou) {
        acertos++;
        animarScore('acertos', acertos, 'badge-acertos');
        botao.classList.add('resposta-certa');
        botao.classList.add('btn-correct-pulse');
        botao.addEventListener('animationend', () => botao.classList.remove('btn-correct-pulse'), { once: true });
    } else {
        erros++;
        animarScore('erros', erros, 'badge-erros');
        botao.classList.add('resposta-errada');
        botao.classList.add('btn-shake');
        botao.addEventListener('animationend', () => botao.classList.remove('btn-shake'), { once: true });
        botoes.forEach(b => {
            if (b.innerText.trim().charAt(0).toUpperCase() === letraCorreta) b.classList.add('resposta-certa');
        });
    }

    const alternativaCorreta = listaOpcoes.find(op => op.trim().charAt(0).toUpperCase() === letraCorreta) || letraCorreta;
    exibirFeedbackVisual(acertou, letraCorreta, alternativaCorreta);
    salvarProgresso();
    if (modoAutomaticoAtivo) iniciarContagemRegressiva();
}

function animarScore(elementId, novoValor, badgeId) {
    const el = document.getElementById(elementId);
    const badge = document.getElementById(badgeId);
    if (el) el.innerText = novoValor;
    if (badge) {
        badge.classList.remove('badge-pop');
        void badge.offsetWidth;
        badge.classList.add('badge-pop');
        badge.addEventListener('animationend', () => badge.classList.remove('badge-pop'), { once: true });
    }
}

// =====================================================
//  NAVEGAÇÃO COM SLIDE
// =====================================================

function navegar(direcao) {
    if (isNavigating) return;
    pararContagem();
    const novoIndice = indiceAtual + direcao;
    if (novoIndice >= questoesDaProva.length) { finalizarQuiz(); return; }
    if (novoIndice < 0) return;

    const wrapper = document.getElementById('question-wrapper');
    if (wrapper) {
        isNavigating = true;
        const slideOut = direcao > 0 ? 'slide-out-left' : 'slide-out-right';
        const slideIn  = direcao > 0 ? 'slide-in-right' : 'slide-in-left';
        wrapper.classList.add(slideOut);
        setTimeout(() => {
            indiceAtual = novoIndice;
            mostrarQuestao();
            wrapper.classList.remove(slideOut);
            wrapper.classList.add(slideIn);
            wrapper.addEventListener('animationend', () => {
                wrapper.classList.remove(slideIn);
                isNavigating = false;
            }, { once: true });
        }, 180);
    } else {
        indiceAtual = novoIndice;
        mostrarQuestao();
    }
}

function iniciarContagemRegressiva() {
    tempoRestante = 3;
    atualizarTextoTimer(tempoRestante);
    if (intervaloContagem) clearInterval(intervaloContagem);
    intervaloContagem = setInterval(() => {
        tempoRestante--;
        atualizarTextoTimer(tempoRestante);
        if (tempoRestante <= 0) { clearInterval(intervaloContagem); navegar(1); }
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

function alternarTimer() {
    modoAutomaticoAtivo = !modoAutomaticoAtivo;
    const btn = document.getElementById('btn-timer');
    const txt = document.getElementById('txt-timer');
    const tooltip = document.getElementById('tooltip-timer');
    if (tooltip) tooltip.style.display = 'none';
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
    if (setaDica) setaDica.innerText = boxDica.classList.contains('hidden') ? '▼' : '▲';
}

// =====================================================
//  FEEDBACK VISUAL
// =====================================================

function exibirFeedbackVisual(acertou, letraCorreta, alternativaCorreta) {
    const feedbackDiv = document.getElementById('feedback');
    feedbackDiv.style.display = 'block';
    if (acertou) {
        feedbackDiv.innerHTML = `
            <div class="feedback-acerto">
                <span class="feedback-icon">✅</span>
                <div class="feedback-detalhe">
                    <span class="feedback-texto">Correto!</span>
                </div>
            </div>`;
        feedbackDiv.className = 'feedback-box feedback-acerto-box';
    } else {
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

// =====================================================
//  SALVAR E ERROS
// =====================================================

function salvarProgresso() {
    const dados = {
        tipo: tipoProvaAtual,
        indice: indiceAtual,
        acertos,
        erros,
        historico: historicoRespostas,
        idsQuestao: questoesDaProva.map(q => q.uid),
        data: Date.now()
    };
    localStorage.setItem('quiz_pm_save', JSON.stringify(dados));
}

function atualizarBancoErros(uidQuestao, acertou) {
    let errosSalvos = JSON.parse(localStorage.getItem('quiz_pm_erros')) || [];
    if (!acertou) {
        if (!errosSalvos.includes(uidQuestao)) errosSalvos.push(uidQuestao);
    } else {
        errosSalvos = errosSalvos.filter(uid => uid !== uidQuestao);
    }
    localStorage.setItem('quiz_pm_erros', JSON.stringify(errosSalvos));
    atualizarContadorErrosUI();
}

function atualizarContadorErrosUI() {
    const errosSalvos = JSON.parse(localStorage.getItem('quiz_pm_erros')) || [];
    const span = document.getElementById('contagem-erros');
    if (span) span.innerText = `(${errosSalvos.length} questões)`;
    const btn = document.getElementById('btn-erros');
    const btnZerar = document.getElementById('btn-zerar-erros');
    if (btn) btn.style.opacity = errosSalvos.length === 0 ? "0.45" : "1";
    if (btnZerar) btnZerar.style.display = errosSalvos.length > 0 ? 'block' : 'none';
}

function zerarBancoErros() {
    const errosSalvos = JSON.parse(localStorage.getItem('quiz_pm_erros')) || [];
    if (errosSalvos.length === 0) return;
    if (confirm(`Zerar ${errosSalvos.length} erro(s) acumulado(s)? Esta ação não pode ser desfeita.`)) {
        localStorage.removeItem('quiz_pm_erros');
        atualizarContadorErrosUI();
    }
}

// =====================================================
//  FINALIZAR QUIZ — salva histórico e atualiza ciclo
// =====================================================

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

    const qw = document.getElementById('question-wrapper');
    if (qw) qw.style.display = 'none';
    const pc = document.getElementById('progress-container');
    if (pc) pc.style.display = 'none';

    // Calcula estatísticas
    const totalQuestoes = questoesDaProva.length;
    const totalAcertos = Object.values(historicoRespostas).filter(h => h.acertou).length;
    const totalErros = Object.values(historicoRespostas).filter(h => !h.acertou).length;
    const totalPuladas = totalQuestoes - totalAcertos - totalErros;
    const aproveitamento = totalQuestoes > 0 ? Math.round((totalAcertos / totalQuestoes) * 100) : 0;

    // Salva no histórico e atualiza ciclo (só para provas específicas com pelo menos 1 resposta)
    if (tipoProvaAtual.startsWith('prova_') && (totalAcertos + totalErros) > 0) {
        const numProva = parseInt(tipoProvaAtual.split('_')[1]);
        salvarHistoricoProva(numProva, totalAcertos, totalErros, totalQuestoes, aproveitamento);
        atualizarCiclo(numProva);
    }

    let emojiDesempenho = aproveitamento >= 80 ? '🏆' : aproveitamento >= 60 ? '💪' : '📖';

    let tituloProva = "Simulado";
    if (tipoProvaAtual.startsWith('prova_')) {
        tituloProva = `Prova ${tipoProvaAtual.split('_')[1]}`;
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
        <div class="grid-relatorio">`;

    questoesDaProva.forEach(q => {
        const hist = historicoRespostas[q.uid];
        let classe = "resumo-neutro";
        let texto = `P${q.prova} Q.${q.id}`;
        let gabaritoInfo = "";

        if (hist) {
            if (hist.acertou) {
                classe = "resumo-certo";
                texto = `P${q.prova} Q.${q.id} ·${hist.escolha}`;
            } else {
                classe = "resumo-errado";
                texto = `P${q.prova} Q.${q.id} ·${hist.escolha}`;
                const correta = q.resposta ? q.resposta.toUpperCase() : "?";
                gabaritoInfo = `<div class="txt-gabarito">Gab: ${correta}</div>`;
            }
        }

        relatorioHTML += `
            <div class="card-resumo ${classe}">
                <div>${texto}</div>
                ${gabaritoInfo}
            </div>`;
    });

    relatorioHTML += `</div>
        <button onclick="location.reload()" class="btn-voltar-menu">← Voltar ao Menu</button>`;

    document.getElementById('relatorio-final').innerHTML = relatorioHTML;
    localStorage.removeItem('quiz_pm_save');
}