# Prepara o código anterior em diretório vazio, sem instalar pacotes ou trocar a branch.
import argparse
from pathlib import Path
import subprocess

parser = argparse.ArgumentParser()
parser.add_argument('--dest', required=True)
args = parser.parse_args()
repo = Path(__file__).resolve().parents[4]
dest = Path(args.dest).resolve()
if dest.is_relative_to(repo):
    raise SystemExit('Use um diretório temporário fora do checkout.')
dest.mkdir(parents=True, exist_ok=True)
if any(dest.iterdir()):
    raise SystemExit('O destino deve estar vazio; nenhum arquivo foi sobrescrito.')
archive = subprocess.run(['git', 'archive', '4a7d175', 'api'], cwd=repo, check=True, capture_output=True)
subprocess.run(['tar', '-x', '-C', str(dest)], input=archive.stdout, check=True)
(dest / 'api/node_modules').symlink_to(repo / 'api/node_modules', target_is_directory=True)
runner = (repo / 'api/test/list-pagination.e2e-spec.ts').read_text()
replacements = {
    "import { PAGINATION_EXPOSED_HEADERS } from '../src/common/pagination/pagination';":
        "const PAGINATION_EXPOSED_HEADERS = ['X-Pagination-Page','X-Pagination-Page-Size','X-Pagination-Total','Retry-After'];",
    "import { labExamSummaryQuery } from '../src/modules/lab-exams/lab-exam-summary';":
        "function labExamSummaryQuery(_owner: string, _query?: {page:number;pageSize:number}) { return Prisma.empty; }",
}
for original, replacement in replacements.items():
    if original not in runner:
        raise SystemExit('O fixture mudou; revise o adaptador do baseline antes de medir.')
    runner = runner.replace(original, replacement)
# O modo before não executa o agregado novo; todos os serviços/controllers são do commit anterior.
(dest / 'api/test/list-pagination.e2e-spec.ts').write_text(runner)
print(str(dest / 'api'))
