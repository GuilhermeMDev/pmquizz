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

async function iniciarApp() {
    try {
        // Carrega arquivo por arquivo
        for (const nome of arquivos) {
            const res = await fetch("./" + nome);
            if (!res.ok) {
                console.error(`Falha ao ler: ${nome}`);
                continue;
            }
            const dados = await res.json();
            todasQuestoes = [...todasQuestoes, ...dados];
        }

        // SEGURANÇA TOTAL DE ORDEM:
        // Garante que a Questão 1 seja a 1, a 2 seja a 2, etc.
        // Isso corrige qualquer falha se os arquivos carregarem fora de ordem.
        todasQuestoes.sort((a, b) => a.id - b.id);

        console.log(`Total carregado: ${todasQuestoes.length} questões.`);
        
        mostrarQuestao();
    } catch (e) {
        console.error("Erro crítico:", e);
        document.getElementById('pergunta-texto').innerText = "Erro ao carregar. Verifique se os arquivos JSON estão na mesma pasta (raiz).";
    }
}

function mostrarQuestao() {
    // Verifica se acabou
    if (indiceAtual >= todasQuestoes.length) {
        finalizarQuiz();
        return;
    }

    const q = todasQuestoes[indiceAtual];
    
    // Mostra o número REAL do PDF
    document.getElementById('progresso').innerText = `Questão PDF #${q.id} (Sequência: ${indiceAtual + 1}/${todasQuestoes.length})`;
    
    // Exibe o texto exatamente como veio do JSON (sem regex de limpeza para não cortar palavras)
    document.getElementById('pergunta-texto').innerText = q.pergunta;
    document.getElementById('feedback').innerText = "";
    
    const container = document.getElementById('opcoes-container');
    container.innerHTML = ""; 

    // Cria os botões
    if (q.opcoes && q.opcoes.length > 0) {
        q.opcoes.forEach(opcao => {
            const btn = document.createElement('button');
            btn.className = 'opcao';
            // Exibe a opção completa "A) Texto..."
            btn.innerText = opcao; 
            btn.onclick = () => verificarResposta(opcao, q.resposta, btn);
            container.appendChild(btn);
        });
    } else {
        container.innerHTML = "<p style='color:orange'>Questão sem opções cadastradas.</p>";
    }
}

function verificarResposta(escolhida, gabarito, botao) {
    // Trava todos os botões para não clicar duas vezes
    const botoes = document.querySelectorAll('.opcao');
    botoes.forEach(b => b.disabled = true); 

    // Lógica de comparação simples e robusta
    // Pega a primeira letra da opção escolhida (ex: "A) Texto" -> "A")
    const letraEscolhida = escolhida.trim().charAt(0).toUpperCase();
    // Limpa o gabarito (ex: "A " -> "A")
    const letraCorreta = gabarito ? gabarito.trim().toUpperCase() : "?";

    if (letraEscolhida === letraCorreta) {
        acertos++;
        document.getElementById('acertos').innerText = `Acertos: ${acertos}`;
        document.getElementById('feedback').innerHTML = "<span style='color: #4caf50'>Correto! ✅</span>";
        botao.style.background = "#2e7d32";
        botao.style.borderColor = "#4caf50";
    } else {
        document.getElementById('feedback').innerHTML = `<span style='color: #ff5252'>Incorreto! ❌<br><small style="color: #aaa">Gabarito Oficial: ${letraCorreta}</small></span>`;
        botao.style.background = "#c62828";
        botao.style.borderColor = "#ff5252";
    }

    // Aguarda 2.5 segundos e vai para a próxima
    setTimeout(() => {
        indiceAtual++;
        mostrarQuestao();
    }, 2500);
}

function finalizarQuiz() {
    document.getElementById('quiz-container').innerHTML = `
        <h2 style="text-align: center">Simulado Finalizado!</h2>
        <p style="text-align: center; font-size: 20px;">Você acertou ${acertos} de ${todasQuestoes.length} questões.</p>
        <button onclick="location.reload()" class="opcao" style="text-align: center; background: #444; margin-top: 20px;">Reiniciar Simulado</button>
    `;
}

// Inicia tudo
iniciarApp();