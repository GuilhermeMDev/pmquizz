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
            
            // Analisa cada questão do arquivo antes de adicionar
            dados.forEach((q, i) => {
                if (q && Array.isArray(q.opcoes)) {
                    todasQuestoes.push(q);
                } else {
                    // DENÚNCIA NO CONSOLE: Te diz onde está o erro
                    console.error(`ERRO NO JSON: Arquivo "${arquivo}", questão próxima à posição ${i}. O campo 'opcoes' não é uma lista válida.`);
                }
            });
        }
        
        // Mantemos a ordem original por enquanto para você achar os erros mais fácil
        // Se quiser embaralhar depois, descomente a linha abaixo:
        // todasQuestoes.sort(() => Math.random() - 0.5);
        
        mostrarQuestao();
    } catch (e) {
        console.error("Erro crítico:", e);
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

    // Aqui o código aceita 4, 5 ou quantas opções existirem
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

    // O trim() e replace resolvem o problema de espaços extras ou quebras de linha
    const limpar = (t) => t.trim().replace(/\s+/g, ' ');

    if (limpar(escolhida) === limpar(correta)) {
        acertos++;
        document.getElementById('acertos').innerText = `Acertos: ${acertos}`;
        document.getElementById('feedback').innerHTML = "<span style='color: #4caf50'>Correto! ✅</span>";
        botao.style.background = "#2e7d32";
    } else {
        document.getElementById('feedback').innerHTML = `<span style='color: #ff5252'>Incorreto! ❌<br><small style="color: #aaa">Correta: ${correta}</small></span>`;
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