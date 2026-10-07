# CA pública do Supabase

Arquivo: supabase-prod-ca-2021.crt. Certificado público, sem chave privada.

Origem: [download oficial do provedor](https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt). Consultado em 2026-10-07; válido até 2031-04-26 10:56:53 UTC.

SHA256 fingerprint: `80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA`.

A partir da pasta api, pg usa sslrootcert=./certs/supabase-prod-ca-2021.crt com sslmode=verify-full. Prisma CLI usa sslcert=./certs/supabase-prod-ca-2021.crt, sslmode=require e sslaccept=strict. A imagem Docker copia certs para a mesma pasta relativa. Rever o certificado antes do vencimento ou quando o provedor publicar sua rotação.
