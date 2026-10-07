import { isAxiosError } from 'axios';

export function foodMutationError(error: unknown, fallback: string) {
  if (!isAxiosError(error)) return fallback;
  if (error.response?.status === 409) {
    return 'Este alimento já está em uso em uma dieta ou receita. Cadastre um novo alimento.';
  }
  if (error.response?.status === 403) {
    return 'Você não tem permissão para alterar este alimento.';
  }
  if (error.response?.status === 400) {
    return 'Verifique os dados. Alimentos em uso em dietas ou receitas não podem ser apagados.';
  }
  return fallback;
}
