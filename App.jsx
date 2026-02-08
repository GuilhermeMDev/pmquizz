import React, { useState, useEffect } from 'react';

// Aqui simulamos o carregamento dos seus 14 arquivos JSON
const totalArquivos = 14;

export default function QuizApp() {
  const [questoes, setQuestoes] = useState([]);
  const [index, setIndex] = useState(0);
  const [pontos, setPontos] = useState(0);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    // Lógica para carregar e juntar todos os JSONs da pasta /source
    async function carregarQuestoes() {
      let todas = [];
      for (let i = 1; i <= totalArquivos; i++) {
        const res = await fetch(`/source/prova_${i}_questoes.json`);
        const data = await res.json();
        todas = [...todas, ...data];
      }
      setQuestoes(todas.sort(() => Math.random() - 0.5)); // Embaralha
    }
    carregarQuestoes();
  }, []);

  const responder = (opcao) => {
    if (feedback) return;
    const correta = questoes[index].resposta;
    if (opcao === correta) {
      setPontos(pontos + 1);
      setFeedback("Correto! ✅");
    } else {
      setFeedback(`Errado. A correta era ${correta} ❌`);
    }
    
    setTimeout(() => {
      setIndex(index + 1);
      setFeedback(null);
    }, 2000);
  };

  if (questoes.length === 0) return <div>Carregando questões...</div>;

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '500px', margin: 'auto' }}>
      <h1>Simulado Potencial Eletroquímico</h1>
      <p>Questão {index + 1} de {questoes.length} | Acertos: {pontos}</p>
      <hr />
      <h3>{questoes[index].pergunta}</h3>
      <div>
        {questoes[index].opcoes.map((opt, i) => (
          <button 
            key={i} 
            onClick={() => responder(opt)}
            style={{ display: 'block', width: '100%', margin: '10px 0', padding: '15px', borderRadius: '8px' }}
          >
            {opt}
          </button>
        ))}
      </div>
      {feedback && <h2 style={{ color: feedback.includes('✅') ? 'green' : 'red' }}>{feedback}</h2>}
    </div>
  );
}