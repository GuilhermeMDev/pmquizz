// 1. Lista exata de todos os seus arquivos na raiz
const arquivos = [
    "prova_1_questoes_1_a_40.json",
    "prova_2_questoes_41_a_80.json",
    "prova_3_questoes_81_a_120.json",
    "prova_4_questoes_121_a_160.json",
    "prova_5_questoes_161_a_200.json",
    "prova_6_questoes_201_a_240.json",
    "prova_7_questoes_241_a_280.json",
    "prova_8_questoes_281_a_320.json",
    "prova_9_questoes_321_a_360.json",
    "prova_10_questoes_361_a_400.json",
    "prova_11_questoes_401_a_440.json",
    "prova_12_questoes_441_a_480.json",
    "prova_13_questoes_481_a_520.json",
    "prova_14_questoes_521_a_560.json"
];

let todasQuestoes = [];
let indiceAtual = 0;
let acertos = 0;

async function iniciarApp() {
    console.log("Iniciando carregamento...");
    try {
        for (const arquivo of arquivos) {
            // Buscamos direto na raiz com ./
            const res = await fetch(`./${arquivo}`);
            if (!res.ok) throw new Error(`Erro ao ler ${arquivo}`);
            const dados = await res.json();
            todasQuestoes = [...todasQuestoes, ...dados];
        }
        
        // Embaralha as 560 questões
        todasQuestoes.sort(() => Math.random() - 0.5);
        console.log("Total de questões carregadas:", todasQuestoes.length);
        
        mostrarQuestao();
    } catch (e) {
        console.error("Erro técnico:", e);
        document.getElementById('pergunta-texto').innerText = "Erro ao carregar os dados. Verifique o console (F12).";
    }
}

function mostrarQuestao() {
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

    // Usamos trim() para ignorar espaços extras que podem vir no JSON
    if (escolhida.trim() === correta.trim()) {
        acertos++;
        document.getElementById('acertos').innerText = `Acertos: ${acertos}`;
        document.getElementById('feedback').innerHTML = "<span style='color: #4caf50'>Correto! ✅</span>";
        botao.style.background = "#2e7d32";
    } else {
        document.getElementById('feedback').innerHTML = `<span style='color: #ff5252'>Errado! ❌<br><small>Correta era: ${correta}</small></span>`;
        botao.style.background = "#c62828";
    }

    setTimeout(() => {
        indiceAtual++;
        if (indiceAtual < todasQuestoes.length) {
            mostrarQuestao();
        } else {
            document.getElementById('quiz-container').innerHTML = `<h2>Fim do Simulado!</h2><p>Parabéns! Você concluiu as ${todasQuestoes.length} questões com ${acertos} acertos.</p>`;
        }
    }, 2000);
}

iniciarApp();