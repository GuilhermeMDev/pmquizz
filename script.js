const arquivos = [
    "prova_1_questoes_1_a_40.json", "prova_2_questoes_41_a_80.json",
    "prova_3_questoes_81_a_120.json", "prova_4_questoes_121_a_160.json",
    "prova_5_questoes_161_a_200.json", "prova_6_questoes_201_a_240.json",
    "prova_7_questoes_241_a_280.json", "prova_8_questoes_281_a_320.json",
    "prova_9_questoes_321_a_360.json", "prova_10_questoes_361_a_400.json",
    "prova_11_questoes_401_a_440.json", "prova_12_questoes_441_a_480.json",
    "prova_13_questoes_481_a_520.json", "prova_14_questoes_521_a_560.json"
];

let todasQuestoes = [];
let indiceAtual = 0;
let acertos = 0;

async function iniciarApp() {
    try {
        for (const arquivo of arquivos) {
            const res = await fetch("./" + arquivo);
            if (!res.ok) continue;
            const dados = await res.json();
            
            dados.forEach(q => {
                let opcoesFormatadas = [];

                // Caso 1: Opções são um objeto {A: "", B: ""}
                if (q.opcoes && !Array.isArray(q.opcoes) && Object.keys(q.opcoes).length > 0) {
                    opcoesFormatadas = Object.entries(q.opcoes).map(([letra, texto]) => `${letra}) ${texto}`);
                } 
                // Caso 2: Opções já são uma lista (Array)
                else if (Array.isArray(q.opcoes) && q.opcoes.length > 0) {
                    opcoesFormatadas = q.opcoes;
                }
                // Caso 3: Opções vazias (estão no texto da pergunta)
                else {
                    const regex = /([a-eA-E]\)|[a-eA-E]\s*-)\s*([^a-eA-E\)]+)/g;
                    let matches;
                    while ((matches = regex.exec(q.pergunta)) !== null) {
                        opcoesFormatadas.push(matches[0].trim());
                    }
                    // Limpa o texto da pergunta para não repetir as opções
                    q.pergunta = q.pergunta.split(/[a-eA-E]\)|[a-eA-E]\s*-/)[0].trim();
                }

                if (opcoesFormatadas.length > 0) {
                    todasQuestoes.push({
                        pergunta: q.pergunta.replace(/\n/g, ' ').replace(/\s+/g, ' '),
                        opcoes: opcoesFormatadas.map(o => o.replace(/\n/g, ' ').replace(/\s+/g, ' ')),
                        resposta: q.resposta.trim()
                    });
                }
            });
        }
        
        todasQuestoes.sort(() => Math.random() - 0.5);
        mostrarQuestao();
    } catch (e) {
        console.error("Erro no carregamento:", e);
    }
}

function mostrarQuestao() {
    if (indiceAtual >= todasQuestoes.length) {
        finalizarQuiz();
        return;
    }

    const q = todasQuestoes[indiceAtual];
    document.getElementById('progresso').innerText = `Questão ${indiceAtual + 1} de ${todasQuestoes.length}`;
    document.getElementById('pergunta-texto').innerText = q.pergunta;
    document.getElementById('feedback').innerText = "";
    
    const container = document.getElementById('opcoes-container');
    container.innerHTML = ""; 

    q.opcoes.forEach(opcao => {
        const btn = document.createElement('button');
        btn.className = 'opcao';
        btn.innerText = opcao;
        btn.onclick = () => verificarResposta(opcao, q.resposta, btn);
        container.appendChild(btn);
    });
}

function verificarResposta(escolhida, correta, botao) {
    const botoes = document.querySelectorAll('.opcao');
    botoes.forEach(b => b.disabled = true); 

    // Pega apenas a letra inicial da opção (ex: "A" de "A) texto")
    const letraEscolhida = escolhida.charAt(0).toUpperCase();
    const letraCorreta = correta.charAt(0).toUpperCase();

    if (letraEscolhida === letraCorreta) {
        acertos++;
        document.getElementById('acertos').innerText = `Acertos: ${acertos}`;
        document.getElementById('feedback').innerHTML = "<span style='color: #4caf50'>Correto! ✅</span>";
        botao.style.background = "#2e7d32";
    } else {
        document.getElementById('feedback').innerHTML = `<span style='color: #ff5252'>Incorreto! ❌<br><small style="color: #aaa">A resposta certa era a letra ${letraCorreta}</small></span>`;
        botao.style.background = "#c62828";
    }

    setTimeout(() => {
        indiceAtual++;
        mostrarQuestao();
    }, 2500);
}

function finalizarQuiz() {
    document.getElementById('quiz-container').innerHTML = `
        <h2 style="text-align: center">Simulado Concluído!</h2>
        <p style="text-align: center; font-size: 20px;">Você acertou ${acertos} de ${todasQuestoes.length} questões.</p>
        <button onclick="location.reload()" class="opcao" style="text-align: center; background: #444">Reiniciar</button>
    `;
}

iniciarApp();