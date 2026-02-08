// Lista dos arquivos iniciais (estão na raiz agora)
const arquivos = [
    "prova_1_questoes_1_a_40.json",
    "prova_2_questoes_41_a_80.json"
];

let todasQuestoes = [];

async function carregarDados() {
    const statusDiv = document.getElementById('status');
    console.log("Iniciando carregamento da Fase 2...");

    try {
        for (const arquivo of arquivos) {
            // Buscamos o arquivo na mesma pasta onde está o script
            const resposta = await fetch(`./${arquivo}`);
            
            if (!resposta.ok) throw new Error(`Arquivo não encontrado: ${arquivo}`);
            
            const dados = await resposta.json();
            todasQuestoes = [...todasQuestoes, ...dados];
            console.log(`Carregado: ${arquivo} (${dados.length} questões)`);
        }

        statusDiv.innerHTML = `
            <h2 style="color: #4caf50;">✅ Sucesso!</h2>
            <p>Carregamos <strong>${todasQuestoes.length}</strong> questões dos arquivos JSON.</p>
            <p>Próximo passo: Mostrar a primeira pergunta na tela.</p>
        `;

    } catch (erro) {
        console.error("Erro detalhado:", erro);
        statusDiv.innerHTML = `
            <h2 style="color: #ff5252;">❌ Erro no Carregamento</h2>
            <p>${erro.message}</p>
            <p>Verifique se o nome do arquivo no VS Code está EXATAMENTE igual ao da lista no script.</p>
        `;
    }
}

carregarDados();