const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sql = require('mssql');

const app = express();
const port = 3000;

app.use(express.static('public'));
app.use(cors());
app.use(bodyParser.json());

// Duomenų bazės jungties konfigūracija – naudojame SQL Server Authentication
const dbConfig = {
  user: 'sa',
  password: 'saugus123', // tavo slaptažodis
  server: 'localhost',
  port: 1433,
  database: 'newsdb',
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};


// ========================================
// API endpointas: POST /api/login
// Tikrina prisijungimo duomenis iš dbo.users
// ========================================
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  console.log('Bandoma prisijungti su:', username);

  try {
    await sql.connect(dbConfig);
    const result = await sql.query`
      SELECT * FROM dbo.users 
      WHERE username = ${username} AND password = ${password}
    `;

    if (result.recordset.length === 0) {
      return res.status(401).json({ message: 'Neteisingi prisijungimo duomenys' });
    }

    const user = result.recordset[0];
    // Tarkime, kad vartotojo rolė yra saugoma laukelyje "role"
    res.json({
      isAdmin: user.role === 'admin',
      auth_code: user.auth_code || null
    });
  } catch (err) {
    console.error('Prisijungimo klaida:', err);
    res.status(500).json({ message: 'Serverio klaida' });
  }
});

// ========================================
// API endpointas: GET /api/news
// Gauna visus naujienų įrašus iš dbo.news
// ========================================
app.get('/api/news', async (req, res) => {
  try {
    await sql.connect(dbConfig);
    const result = await sql.query`
      SELECT * FROM dbo.news ORDER BY created_at DESC
    `;
    res.json(result.recordset);
  } catch (err) {
    console.error('Klaida gaunant naujienas:', err);
    res.status(500).json({ message: 'Serverio klaida' });
  }
});

// ========================================
// API endpointas: POST /api/news
// Kuria naują naujienos įrašą
// ========================================
app.post('/api/news', async (req, res) => {
  const { title, content } = req.body;

  try {
    await sql.connect(dbConfig);
    await sql.query`
      INSERT INTO dbo.news (title, content, created_at, updated_at)
      VALUES (${title}, ${content}, GETDATE(), GETDATE())
    `;
    res.status(201).json({ message: 'Naujiena sukurta' });
  } catch (err) {
    console.error('Klaida kuriant naujieną:', err);
    res.status(500).json({ message: 'Serverio klaida' });
  }
});

// ========================================
// API endpointas: PUT /api/news/:id
// Atnaujina naujienos įrašą pagal ID
// ========================================
app.put('/api/news/:id', async (req, res) => {
  const { id } = req.params;
  const { title, content } = req.body;

  try {
    await sql.connect(dbConfig);
    await sql.query`
      UPDATE dbo.news 
      SET title = ${title}, content = ${content}, updated_at = GETDATE()
      WHERE id = ${id}
    `;
    res.json({ message: 'Naujiena atnaujinta' });
  } catch (err) {
    console.error('Klaida atnaujinant naujieną:', err);
    res.status(500).json({ message: 'Serverio klaida' });
  }
});

// ========================================
// API endpointas: DELETE /api/news/:id
// Ištrina naujienos įrašą pagal ID
// ========================================
app.delete('/api/news/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await sql.connect(dbConfig);
    await sql.query`
      DELETE FROM dbo.news WHERE id = ${id}
    `;
    res.json({ message: 'Naujiena ištrinta' });
  } catch (err) {
    console.error('Klaida trinant naujieną:', err);
    res.status(500).json({ message: 'Serverio klaida' });
  }
});

// Testinis endpointas
app.get('/api/test', (req, res) => {
  res.json({ status: 'Serveris veikia puikiai 🚀' });
});

app.listen(port, () => {
  console.log(`Serveris paleistas http://localhost:${port}`);
});
