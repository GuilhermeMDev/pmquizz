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
let erros = 0;

// MEMÓRIA DO JOGO
// Aqui guardamos o estado de cada questão: { respondida: true, acertou: false, escolha: "A" }
let historicoRespostas = {}; 

let modoAutomaticoAtivo = false; 
let timerAutomatico = null; 

async function iniciarApp() {
    try {
        for (const nome of arquivos) {
            const res = await fetch("./" + nome);
            if (!res.ok) continue;
            const dados = await res.json();
            todasQuestoes = [...todasQuestoes, ...dados];
        }

        // Garante a ordem correta
        todasQuestoes.sort((a, b) => a.id - b.id);
        
        console.log(`Carregadas ${todasQuestoes.length} questões.`);
        mostrarQuestao();
        atualizarInterfaceTimer();
    } catch (e) {
        console.error(e);
        document.getElementById('pergunta-texto').innerText = "Erro ao carregar dados.";
    }
}

function mostrarQuestao() {
    clearTimeout(timerAutomatico);

    if (indiceAtual >= todasQuestoes.length) {
        finalizarQuiz();
        return;
    }

    const q = todasQuestoes[indiceAtual];
    const estado = historicoRespostas[q.id]; // Verifica se já respondemos essa

    // Atualiza Topo
    document.getElementById('progresso').innerText = `Questão PDF #${q.id} (${indiceAtual + 1}/${todasQuestoes.length})`;
    document.getElementById('pergunta-texto').innerText = q.pergunta;
    
    // Limpa Feedback anterior
    const feedbackDiv = document.getElementById('feedback');
    feedbackDiv.style.display = 'none';
    feedbackDiv.innerHTML = "";
    
    const container = document.getElementById('opcoes-container');
    container.innerHTML = ""; 

    if (q.opcoes && q.opcoes.length > 0) {
        q.opcoes.forEach(opcao => {
            const btn = document.createElement('button');
            btn.className = 'opcao';
            btn.innerText = opcao;
            
            // Se já respondida, desabilita e aplica cores
            if (estado && estado.respondida) {
                btn.disabled = true;
                const letraOpcao = opcao.trim().charAt(0).toUpperCase();
                const letraCorreta = q.resposta.trim().toUpperCase();
                
                // Pinta a correta de verde
                if (letraOpcao === letraCorreta) {
                    btn.classList.add('resposta-certa');
                }
                // Se o usuário errou, pinta a escolha dele de vermelho
                if (!estado.acertou && letraOpcao === estado.escolha) {
                    btn.classList.add('resposta-errada');
                }
            } else {
                // Se não respondeu ainda, adiciona o clique
                btn.onclick = () => verificarResposta(opcao, q.resposta, btn, q.id);
            }

            container.appendChild(btn);
        });
    }

    // Se já respondeu, mostra o feedback imediatamente (sem somar ponto de novo)
    if (estado && estado.respondida) {
        exibirFeedbackVisual(estado.acertou, q.resposta);
    }
}

function verificarResposta(escolhida, gabarito, botao, idQuestao) {
    // SEGURANÇA: Se já está no histórico, para tudo!
    if (historicoRespostas[idQuestao]) return;

    const botoes = document.querySelectorAll('.opcao');
    botoes.forEach(b => b.disabled = true); 

    const letraEscolhida = escolhida.trim().charAt(0).toUpperCase();
    const letraCorreta = gabarito ? gabarito.trim().toUpperCase() : "?";
    const acertou = (letraEscolhida === letraCorreta);

    // Salva no histórico para não pontuar de novo
    historicoRespostas[idQuestao] = {
        respondida: true,
        acertou: acertou,
        escolha: letraEscolhida
    };

    // Pontuação
    if (acertou) {
        acertos++;
        document.getElementById('acertos').innerText = acertos;
        botao.classList.add('resposta-certa');
    } else {
        erros++;
        document.getElementById('erros').innerText = erros;
        botao.classList.add('resposta-errada');
        
        // Também mostra qual era a certa para o usuário aprender
        botoes.forEach(b => {
            if (b.innerText.trim().charAt(0).toUpperCase() === letraCorreta) {
                b.classList.add('resposta-certa');
            }
        });
    }

    exibirFeedbackVisual(acertou, letraCorreta);

    if (modoAutomaticoAtivo) {
        timerAutomatico = setTimeout(() => {
            navegar(1);
        }, 4000); 
    }
}

function exibirFeedbackVisual(acertou, letraCorreta) {
    const feedbackDiv = document.getElementById('feedback');
    feedbackDiv.style.display = 'block';
    
    if (acertou) {
        feedbackDiv.innerHTML = "<span style='color: #81c784'>Correto! ✅</span>";
    } else {
        feedbackDiv.innerHTML = `<span style='color: #e57373'>Errou! A correta é a letra <strong>${letraCorreta}</strong></span>`;
    }
}

function navegar(direcao) {
    clearTimeout(timerAutomatico);
    const novoIndice = indiceAtual + direcao;

    if (novoIndice >= 0 && novoIndice < todasQuestoes.length) {
        indiceAtual = novoIndice;
        mostrarQuestao();
    }
}

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
        <h2 style="text-align: center; margin-bottom: 30px;">Fim do Simulado!</h2>
        
        <div style="display: flex; justify-content: center; gap: 40px; margin-bottom: 40px;">
            <div style="text-align: center;">
                <div style="font-size: 50px; color: #81c784; font-weight: bold;">${acertos}</div>
                <div style="color: #aaa; text-transform: uppercase; letter-spacing: 1px;">Acertos</div>
            </div>
            <div style="text-align: center;">
                <div style="font-size: 50px; color: #e57373; font-weight: bold;">${erros}</div>
                <div style="color: #aaa; text-transform: uppercase; letter-spacing: 1px;">Erros</div>
            </div>
        </div>

        <button onclick="location.reload()" class="opcao" style="text-align: center; background: #444;">Reiniciar</button>
    `;
    document.querySelector('.nav-bar').style.display = 'none';
}

iniciarApp();