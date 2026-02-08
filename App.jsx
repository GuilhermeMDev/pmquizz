import React, { useState, useEffect } from 'react';

// Nomes exatos dos arquivos conforme o seu print do VS Code
const arquivosJson = [
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

export default function QuizApp() {
  const [questoes, setQuestoes] = useState([]);
  const [index, setIndex] = useState(0);
  const [pontos, setPontos] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function carregarQuestoes() {
      try {
        let todas = [];
        for (const nomeArquivo of arquivosJson) {
          const res = await fetch(`/source/${nomeArquivo}`);
          const data = await res.json();
          todas = [...todas, ...data];
        }
        // Embaralha as 560 questões para o simulado ser sempre novo
        setQuestoes(todas.sort(() => Math.random() - 0.5));
      } catch (error) {
        console.error("Erro ao carregar JSONs:", error);
      } finally {
        setCarregando(false);
      }
    }
    carregarQuestoes();
  }, []);

  const responder = (opcao) => {
    if (feedback) return;
    const correta = questoes[index].resposta;
    
    if (opcao.trim() === correta.trim()) {
      setPontos(pontos + 1);
      setFeedback("Correto! ✅");
    } else {
      setFeedback(`Errado. A correta era: ${correta} ❌`);
    }
    
    setTimeout(() => {
      setIndex(index + 1);
      setFeedback(null);
    }, 2500);
  };

  if (carregando) return <div style={estilos.container}>Carregando simulado...</div>;
  if (index >= questoes.length) return <div style={estilos.container}>Fim do Simulado! Pontuação: {pontos}</div>;

  return (
    <div style={estilos.container}>
      <header style={estilos.header}>
        <span style={estilos.progresso}>Questão {index + 1} de {questoes.length}</span>
        <span style={estilos.pontos}>Acertos: {pontos}</span>
      </header>

      <div style={estilos.card}>
        <h3 style={estilos.pergunta}>{questoes[index].pergunta}</h3>
        
        <div style={estilos.opcoesContainer}>
          {questoes[index].opcoes.map((opt, i) => (
            <button 
              key={i} 
              onClick={() => responder(opt)}
              style={{
                ...estilos.botao,
                backgroundColor: feedback ? (opt === questoes[index].resposta ? '#2e7d32' : '#333') : '#444'
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {feedback && (
        <div style={{...estilos.feedback, color: feedback.includes('✅') ? '#4caf50' : '#ff5252'}}>
          {feedback}
        </div>
      )}
    </div>
  );
}

// Estilos modernos para Tablet/Celular (Modo Escuro)
const estilos = {
  container: {
    backgroundColor: '#121212',
    color: '#ffffff',
    minHeight: '100vh',
    padding: '20px',
    fontFamily: 'Segoe UI, Roboto, sans-serif',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  header: {
    width: '100%',
    maxWidth: '600px',
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '20px',
    fontSize: '14px',
    color: '#bbb'
  },
  card: {
    backgroundColor: '#1e1e1e',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
    width: '100%',
    maxWidth: '600px'
  },
  pergunta: {
    fontSize: '18px',
    lineHeight: '1.5',
    marginBottom: '20px'
  },
  opcoesContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  botao: {
    color: '#fff',
    border: '1px solid #555',
    padding: '15px',
    borderRadius: '8px',
    cursor: 'pointer',
    textAlign: 'left',
    fontSize: '16px',
    transition: '0.2s'
  },
  feedback: {
    marginTop: '20px',
    fontSize: '20px',
    fontWeight: 'bold',
    textAlign: 'center'
  }
};