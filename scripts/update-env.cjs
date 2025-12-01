
const fs = require('fs');
const path = require('path');

const envPath = path.join(process.cwd(), '.env');
const existingEnv = fs.readFileSync(envPath, 'utf8');

const newEmail = 'cruisedot@cruisedot-478810.iam.gserviceaccount.com';
const newKey = '-----BEGIN PRIVATE KEY-----\\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCrJyp/jBzrl/5G\\nAeevn6XvqeP4UlWWV9D1isEMtrweH8TXvN7UBfJwR8BjFMramd5T4v1BuOZPoZ/J\\nAilf5ukWkOaEro/+WPrwSExUHKBc9Z2/iYCo/LPrV0RmsXsCa8GGPL0iRBkvkMiF\\nfyFs4rhkR7Yuf+zLOAEklrOHnK4D+dPFgAxJjtgr6xsDxWxql95SIhPUtb3QHXDU\\nts5y0QMCxCbwneKhUkgOEh8itXWkucsyYVNp02wmkDSc5R0EepV31W2c+eQ6Ep2V\\nV3WTAv5UiErVctNAeDscc9n1tjc59lFiRZWlQWYrsez6uq2e4bjsW4dt+qJmGWwt\\nUBz1sGNRAgMBAAECggEABkfSZypNgGFhjxDwVHvuXf2qaYPJ82b8ZRpG9xq4i1Qd\\nSCZnOI68T12kBBlwpTYawrzJutuYYKkyFhv6colkbx548GWrJTP/h17metAEcXeA\\n5v+vz+OwDYLfC3QCqyYoTJmrfheozfDz7sl+wO0OmP10Wb9PgZiSmtSzOKwpoD3U\\noCR1v8/aWpq92gpM4HW+2UBY5kbtmhBwpm9E04oG/ogtZMvoFSw9tShBb/5l8jFl\\nyOPfxSG04AyKjcD7obcPoXIKFXwUqPU2U3UpmyWb1loQku8LZ1ixMWM9l3DHbs/E\\n06F8vtIaT7lXvXWlA7LcmPwywr54zqB0K7BhBrhRPQKBgQDsm9Xdjar/YHBnKg2G\\nJcKWOKjn3tW9reYLxlv3d9ktKycK87Xt4lwwVTqelwgry0vBmAOAB/4PhAnXzd/q\\nGJhkn+ic1PmMWYVjTtk1lXfGbRahLHK6g8l93rodek20Hv5/OdXLoAOE0SLEAei3\\n1IsBmJeghbUGD8sO1NdAmSwW3QKBgQC5LgmtsHZorrFJ6bkCHzDG3wnvQzy0GoMc\\nMAcgKpxNwBH/b5TS3DfLBNdVFonx8JBFoIqWiYzVislulK69Rk8RktAdm6Occ9rK\\nIaU63+JG+sihWTRcyXtPvcpPGIEx8ADhhhrJDmdRry/rQv3a7cXO3BpvrqHBFj2a\\nUQrC2z4lBQKBgE/htOyd3bNmbcyGqBY4PV/WNUBDPUpSoa4sA/Sio9HaFc5exXdQ\\nyusOe0H7n6iZdDQiDFx3VlEKtQAE46n3L8wZKMF6Ld4ygxQqFK9AjTWSsucrSHir\\n8aTrQ06ccgtzw1xUvFeI6Gc47FHciyM1QNEDIX3yZlFrl5SkSx/mFrqJAoGBAIJF\\n8gcgAl0osI6X/1CP0sfFdv68pYLqt9vnqcumTmmgOskhnWguBo4rrLUucwMiwsxI\\n4dZ/k/VSetzxenCresqZJxH9QT+6fWv/+XaOtGhM20IvOFgiYj65/Q5h5dnUxznh\\nFwzktijP/v0aFu6ioasiSvLQvvjQhav/YXuts21lAoGBAMfDp1cWvrimT8NujbiA\\nEm1bMdMh59EvKN+Mi+wLtnthRWM9ZnPpNCKPReqW9/GNrGf/U8K11zDiYcbdiwEB\\nlpfoVG4+9+YIQjL8FAmrfooJlxPxYW0bUtz5/Mb1sJ58ZPXSA5Oc43MNt5XFOiG3\\nlqEhwSUYwbvZInjfkMzX46U7\\n-----END PRIVATE KEY-----';

const lines = existingEnv.split('\n');
const newLines = lines.filter(line =>
    !line.startsWith('GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL=') &&
    !line.startsWith('GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY=')
);

// Add new keys
newLines.push(`GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL=${newEmail}`);
newLines.push(`GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY="${newKey}"`);

fs.writeFileSync(envPath, newLines.join('\n'));
console.log('✅ Updated .env successfully with new credentials');
