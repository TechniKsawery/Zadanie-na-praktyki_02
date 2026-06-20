const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ALGORITHM = 'aes-256-ctr';

function getPassword() {
  const password = process.argv[3] || process.env.BACKUP_PASSWORD;
  if (!password) {
    console.error('Błąd: Podaj hasło jako argument: node scripts/secure-backup.js <action> <password>');
    console.error('Przykład: node scripts/secure-backup.js encrypt MojeHaslo123');
    process.exit(1);
  }
  // Generowanie bezpiecznego klucza 32-bajtowego przy użyciu sha256 z podanego hasła
  return crypto.createHash('sha256').update(password).digest();
}

const action = process.argv[2];
if (action !== 'encrypt' && action !== 'decrypt') {
  console.error('Błąd: Użyj "encrypt" lub "decrypt" jako pierwszego parametru.');
  process.exit(1);
}

const filesToProcess = [
  { plain: path.join(__dirname, '../.env.backup'), enc: path.join(__dirname, '../.env.backup.enc') },
  { plain: path.join(__dirname, '../backend/.env.backup'), enc: path.join(__dirname, '../backend/.env.backup.enc') }
];

const key = getPassword();

if (action === 'encrypt') {
  filesToProcess.forEach(({ plain, enc }) => {
    if (!fs.existsSync(plain)) {
      console.log(`Pominięto: brak pliku ${plain}`);
      return;
    }
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const content = fs.readFileSync(plain);
    const encrypted = Buffer.concat([iv, cipher.update(content), cipher.final()]);
    fs.writeFileSync(enc, encrypted);
    console.log(`Zaszyfrowano: ${plain} -> ${enc}`);
  });
} else if (action === 'decrypt') {
  filesToProcess.forEach(({ plain, enc }) => {
    if (!fs.existsSync(enc)) {
      console.log(`Pominięto: brak pliku ${enc}`);
      return;
    }
    const encryptedContent = fs.readFileSync(enc);
    const iv = encryptedContent.slice(0, 16);
    const encryptedData = encryptedContent.slice(16);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    try {
      const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
      fs.writeFileSync(plain, decrypted);
      console.log(`Rozszyfrowano: ${enc} -> ${plain}`);
    } catch (e) {
      console.error(`Błąd deszyfrowania pliku ${enc}. Prawdopodobnie błędne hasło.`);
    }
  });
}
