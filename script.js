// Lista dos seus arquivos
const arquivos = [
    "source/prova_1_questoes_1_a_40.json",
    "source/prova_2_questoes_41_a_80.json"
    // Depois adicionaremos os 14 aqui
];

let todasQuestoes = [];

async function carregarDados() {
    console.log("Iniciando carregamento...");
    try {
        for (const arquivo of arquivos) {
            const resposta = await fetch(arquivo);
            const dados = await resposta.json();
            todasQuestoes = [...todasQuestoes, ...dados];
        }
        document.getElementById('status').innerText = `Carregadas ${todasQuestoes.length} questões!`;
        console.log("Sucesso:", todasQuestoes.length);
    } catch (erro) {
        console.error("Erro ao carregar:", erro);
        document.getElementById('status').innerText = "Erro ao carregar arquivos JSON.";
    }
}

carregarDados();