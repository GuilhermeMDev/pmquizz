const fs = require('fs');
const path = require('path');

const directoryPath = __dirname;

fs.readdirSync(directoryPath).forEach(file => {
  if (file.match(/^prova_\d+_questoes\.json$/)) {
    const filePath = path.join(directoryPath, file);
    let data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    data = data.map((questao, index) => {
      questao.id = index + 1;
      return questao;
    });

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`[OK] ${file} reindexado (IDs 1 a ${data.length}).`);
  }
});