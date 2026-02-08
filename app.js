const { useState, useEffect } = React;

const arquivosJson = [
  "prova_1_questoes_1_a_40.json", "prova_2_questoes_41_a_80.json",
  "prova_3_questoes_81_a_120.json", "prova_4_questoes_121_a_160.json",
  "prova_5_questoes_161_a_200.json", "prova_6_questoes_201_a_240.json",
  "prova_7_questoes_241_a_280.json", "prova_8_questoes_281_a_320.json",
  "prova_9_questoes_321_a_360.json", "prova_10_questoes_361_a_400.json",
  "prova_11_questoes_401_a_440.json", "prova_12_questoes_441_a_480.json",
  "prova_13_questoes_481_a_520.json", "prova_14_questoes_521_a_560.json"
];

function QuizApp() {
  const [questoes, setQuestoes] = useState([]);
  const [index, setIndex] = useState(0);
  const [pontos, setPontos] = useState(0);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    async function carregar() {
      try {
        let todas = [];
        for (const nome of arquivosJson) {
          // Agora buscamos direto na raiz
          const res = await fetch(`/${nome}`);
          const data = await res.json();
          todas = [...todas, ...data];
        }
        setQuestoes(todas.sort(() => Math.random() - 0.5));
      } catch (e) {
        console.error("Erro ao carregar questões:", e);
      }
    }
    carregar();
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
    setTimeout(() => { setIndex(index + 1); setFeedback(null); }, 2000);
  };

  if (questoes.length === 0) return React.createElement('div', {style: {color: 'white', padding: '20px'}}, 'Carregando 560 questões...');
  if (index >= questoes.length) return React.createElement('div', {style: {color: 'white', padding: '20px'}}, `Fim! Você acertou ${pontos} de ${questoes.length}`);

  return React.createElement('div', { style: estilos.container },
    React.createElement('div', { style: estilos.header }, 
      React.createElement('span', null, `Questão ${index + 1}/${questoes.length}`),
      React.createElement('span', null, `Acertos: ${pontos}`)
    ),
    React.createElement('div', { style: estilos.card },
      React.createElement('h3', { style: {marginBottom: '20px'} }, questoes[index].pergunta),
      questoes[index].opcoes.map((opt, i) => 
        React.createElement('button', {
          key: i,
          onClick: () => responder(opt),
          style: { 
            ...estilos.botao, 
            backgroundColor: feedback ? (opt === questoes[index].resposta ? '#2e7d32' : '#333') : '#444',
            border: feedback && opt !== questoes[index].resposta && opt === feedback.opcaoClicada ? '1px solid red' : '1px solid #555'
          }
        }, opt)
      )
    ),
    feedback && React.createElement('div', { style: estilos.feedback }, feedback)
  );
}

const estilos = {
  container: { backgroundColor: '#121212', color: '#fff', minHeight: '100vh', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: 'sans-serif' },
  header: { width: '100%', maxWidth: '600px', display: 'flex', justifyContent: 'space-between', marginBottom: '20px', fontSize: '14px', color: '#aaa' },
  card: { backgroundColor: '#1e1e1e', padding: '20px', borderRadius: '12px', width: '100%', maxWidth: '600px', boxShadow: '0 4px 10px rgba(0,0,0,0.5)' },
  botao: { display: 'block', width: '100%', color: '#fff', padding: '15px', margin: '10px 0', borderRadius: '8px', border: '1px solid #555', textAlign: 'left', cursor: 'pointer', fontSize: '16px' },
  feedback: { marginTop: '20px', fontSize: '20px', fontWeight: 'bold' }
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(QuizApp));