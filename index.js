const express = require('express');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

const app = express();
const PORT = process.env.PORT || 3000;

// Permite receber dados em formato JSON nas requisições
app.use(express.json());

// Função para autenticar e conectar à planilha
async function getSpreadsheet() {
  const serviceAccountAuth = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const doc = new GoogleSpreadsheet(process.env.SPREADSHEET_ID, serviceAccountAuth);
  await doc.loadInfo();
  return doc;
}

// Rota principal para checar o status
app.get('/', async (req, res) => {
  try {
    const doc = await getSpreadsheet();
    res.send(`<h1>WhatsApp Multi-Atendimento Rodando! 🚀</h1><p>Conectado à planilha: <strong>${doc.title}</strong></p>`);
  } catch (error) {
    res.status(500).send(`<h1>Erro ao conectar com o Google Sheets</h1><p>${error.message}</p>`);
  }
});

// Rota de Login (Valida na aba "Usuarios")
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Informe e-mail e senha.' });
    }

    const doc = await getSpreadsheet();
    const sheetUsuarios = doc.sheetsByTitle['Usuarios'];

    if (!sheetUsuarios) {
      return res.status(404).json({ success: false, message: 'Aba "Usuarios" não encontrada na planilha.' });
    }

    const rows = await sheetUsuarios.getRows();

    // Procura o usuário combinando Email (Coluna C) e Senha_Hash (Coluna D)
    const user = rows.find(row => 
      row.get('Email') === email && row.get('Senha_Hash') === password
    );

    if (user) {
      return res.json({
        success: true,
        id: user.get('ID_Usuario'),
        name: user.get('Nome'),
        email: user.get('Email'),
        perfil: user.get('Perfil'),
        status: user.get('Status')
      });
    } else {
      return res.status(401).json({ success: false, message: 'E-mail ou senha incorretos.' });
    }
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Rota de teste para gravar dados na planilha
app.get('/test-write', async (req, res) => {
  try {
    const doc = await getSpreadsheet();
    const sheetConexoes = doc.sheetsByTitle['Conexoes'];
    
    if (!sheetConexoes) {
      return res.status(404).json({ error: 'Aba "Conexoes" não encontrada na planilha.' });
    }

    await sheetConexoes.addRow({
      ID_Conexao: 'conn_render_test',
      Nome: 'Teste Render',
      Numero: '+55 00 00000-0000',
      Status: 'Conectado',
      Ultima_Atualizacao: new Date().toLocaleString('pt-BR'),
    });

    res.json({ success: true, message: 'Linha de teste gravada com sucesso na aba Conexoes!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
