// A Chromium extension ID is not random: it is the first 16 bytes of the
// SHA-256 of the DER-encoded public key, hex-encoded, then digit-shifted from
// [0-9a-f] into [a-p]. So the ID is a pure function of the signing key -- keep
// dist/guardrails.pem and the ID never changes.
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'

const der = execFileSync('openssl', [
  'rsa', '-in', process.argv[2], '-pubout', '-outform', 'DER',
], { encoding: 'buffer', stdio: ['pipe', 'pipe', 'ignore'] })

const hash = createHash('sha256').update(der).digest('hex').slice(0, 32)
process.stdout.write([...hash].map((c) => 'abcdefghijklmnop'[parseInt(c, 16)]).join(''))
