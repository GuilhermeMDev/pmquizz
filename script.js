// 1. Lista completa de arquivos (Já pode colocar todos os 14 aqui se quiser)
const arquivos = [
    "prova_1_questoes_1_a_40.json",
    "prova_2_questoes_41_a_80.json"
];

let todasQuestoes = [];
let indiceAtual = 0;
let acertos = 0;

async function iniciarApp() {
    try {
        for (const arquivo of arquivos) {
            const res = await fetch(`./${arquivo}`);
            const dados = await res.json();
            todasQuestoes = [...todasQuestoes, ...dados];
        }
        // Embaralha as questões para o estudo não ser viciado
        todasQuestoes.sort(() => Math.random() - 0.5);
        mostrarQuestao();
    } catch (e) {
        document.getElementById('pergunta-texto').innerText = "Erro ao carregar questões.";
    }
}

function mostrarQuestao() {
    const q = todasQuestoes[indiceAtual];
    document.getElementById('progresso').innerText = `Questão ${indiceAtual + 1} de ${todasQuestoes.length}`;
    document.getElementById('pergunta-texto').innerText = q.pergunta;
    document.getElementById('feedback').innerText = "";
    
    const container = document.getElementById('opcoes-container');
    container.innerHTML = ""; // Limpa opções anteriores

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
    botoes.forEach(b => b.disabled = true); // Trava os botões após o clique

    if (escolhida.trim() === correta.trim()) {
        acertos++;
        document.getElementById('acertos').innerText = `Acertos: ${acertos}`;
        document.getElementById('feedback').innerHTML = "<span style='color: #4caf50'>Correto! ✅</span>";
        botao.style.background = "#2e7d32";
    } else {
        document.getElementById('feedback').innerHTML = `<span style='color: #ff5252'>Errado! ❌<br><small>Correta: ${correta}</small></span>`;
        botao.style.background = "#c62828";
    }

    // Espera 2 segundos e vai para a próxima
    setTimeout(() => {
        indiceAtual++;
        if (indiceAtual < todasQuestoes.length) {
            mostrarQuestao();
        } else {
            document.getElementById('quiz-container').innerHTML = `<h2>Fim do Simulado!</h2><p>Você acertou ${acertos} de ${todasQuestoes.length}</p>`;
        }
    }, 2000);
}

iniciarApp();