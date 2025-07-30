// Usage: node generate-bcrypt.js <password>
const bcrypt = require('bcrypt');
const password = process.argv[2];

if (!password) {
  console.error('Usage: node generate-bcrypt.js <password>');
  process.exit(1);
}

bcrypt.hash(password, 10).then(hash => {
  console.log('Hash for password "' + password + '":');
  console.log(hash);
});
