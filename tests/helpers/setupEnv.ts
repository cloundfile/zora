import * as os from 'os';
import * as path from 'path';

// Isola todos os testes em um root temporário, fora de ~/.zora real.
process.env.ZORA_ROOT = path.join(os.tmpdir(), 'zora-tests');

// Impede qualquer acesso acidental à rede durante os testes.
const realFetch = globalThis.fetch;
process.env.TESTING = '1';