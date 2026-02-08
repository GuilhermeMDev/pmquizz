const arquivos = [
    "prova_1_questoes.json", "prova_2_questoes.json", "prova_3_questoes.json",
    "prova_4_questoes.json", "prova_5_questoes.json", "prova_6_questoes.json",
    "prova_7_questoes.json", "prova_8_questoes.json", "prova_9_questoes.json",
    "prova_10_questoes.json", "prova_11_questoes.json", "prova_12_questoes.json",
    "prova_13_questoes.json", "prova_14_questoes.json"
];

let todasQuestoes = [];
let indiceAtual = 0;
let acertos = 0;

// CONTROLES DE NAVEGAÇÃO
let modoAutomaticoAtivo = false; // Começa desligado (Manual)
let timerAutomatico = null; // Guarda o ID do relógio para poder cancelar

async function iniciarApp() {
    try {
        for (const nome of arquivos) {
            const res = await fetch("./" + nome);
            if (!res.ok) continue;
            const dados = await res.json();
            todasQuestoes = [...todasQuestoes, ...dados];
        }

        // Ordena 1 ao 560
        todasQuestoes.sort((a, b) => a.id - b.id);
        
        console.log(`Carregadas ${todasQuestoes.length} questões.`);
        mostrarQuestao();
        atualizarInterfaceTimer(); // Atualiza a cor do botão do relógio
    } catch (e) {
        console.error("Erro crítico:", e);
        document.getElementById('pergunta-texto').innerText = "Erro ao carregar arquivos JSON.";
    }
}

function mostrarQuestao() {
    // Cancela qualquer timer pendente (segurança)
    clearTimeout(timerAutomatico);

    if (indiceAtual >= todasQuestoes.length) {
        finalizarQuiz();
        return;
    }

    const q = todasQuestoes[indiceAtual];
    
    // Atualiza textos
    document.getElementById('progresso').innerText = `Questão PDF #${q.id} (${indiceAtual + 1}/${todasQuestoes.length})`;
    document.getElementById('pergunta-texto').innerText = q.pergunta;
    document.getElementById('feedback').innerText = "";
    
    const container = document.getElementById('opcoes-container');
    container.innerHTML = ""; 

    // Desenha botões
    if (q.opcoes && q.opcoes.length > 0) {
        q.opcoes.forEach(opcao => {
            const btn = document.createElement('button');
            btn.className = 'opcao';
            btn.innerText = opcao;
            btn.onclick = () => verificarResposta(opcao, q.resposta, btn);
            container.appendChild(btn);
        });
    }
}

function verificarResposta(escolhida, gabarito, botao) {
    // Trava botões
    const botoes = document.querySelectorAll('.opcao');
    botoes.forEach(b => b.disabled = true); 

    const letraEscolhida = escolhida.trim().charAt(0).toUpperCase();
    const letraCorreta = gabarito ? gabarito.trim().toUpperCase() : "?";

    if (letraEscolhida === letraCorreta) {
        acertos++;
        document.getElementById('acertos').innerText = `Acertos: ${acertos}`;
        document.getElementById('feedback').innerHTML = "<span style='color: #4caf50'>Correto! ✅</span>";
        botao.style.background = "#2e7d32";
    } else {
        document.getElementById('feedback').innerHTML = `<span style='color: #ff5252'>Incorreto! ❌<br><small style="color: #aaa">Gabarito: ${letraCorreta}</small></span>`;
        botao.style.background = "#c62828";
    }

    // LÓGICA DO TIMER: Só avança sozinho se o modo estiver ATIVO
    if (modoAutomaticoAtivo) {
        timerAutomatico = setTimeout(() => {
            navegar(1);
        }, 4000); // 4 segundos para ler
    }
}

// FUNÇÃO DE NAVEGAÇÃO MANUAL (Avançar e Voltar)
function navegar(direcao) {
    // Se o usuário clicar, cancelamos o timer automático imediatamente
    clearTimeout(timerAutomatico);

    const novoIndice = indiceAtual + direcao;

    // Impede de voltar antes da primeira ou passar da última
    if (novoIndice >= 0 && novoIndice < todasQuestoes.length) {
        indiceAtual = novoIndice;
        mostrarQuestao();
    }
}

// LIGA/DESLIGA O MODO AUTOMÁTICO
function alternarTimer() {
    modoAutomaticoAtivo = !modoAutomaticoAtivo;
    atualizarInterfaceTimer();
}

function atualizarInterfaceTimer() {
    const btn = document.getElementById('btn-timer');
    if (modoAutomaticoAtivo) {
        btn.className = "nav-btn timer-on";
        btn.innerHTML = "⏰ 4s";
    } else {
        btn.className = "nav-btn timer-off";
        btn.innerHTML = "⏰ Off";
    }
}

function finalizarQuiz() {
    document.getElementById('quiz-container').innerHTML = `
        <h2 style="text-align: center">Simulado Finalizado!</h2>
        <p style="text-align: center; font-size: 20px;">Acertos finais: ${acertos} de ${todasQuestoes.length}</p>
        <button onclick="location.reload()" class="opcao" style="text-align: center; background: #444; margin-top: 20px">Reiniciar</button>
    `;
    // Esconde a barra de navegação no final
    document.querySelector('.nav-bar').style.display = 'none';
}

iniciarApp();