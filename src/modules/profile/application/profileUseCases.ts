import type { SessionUser } from '@/modules/auth/domain/session';
import { gerarDadosDaConta, type UserProfile } from '@/modules/profile/domain/profile';

import type { AvatarStorage, ProfileRepository } from './ports';

type Dependencias = {
  repositorio: ProfileRepository;
  avatares: AvatarStorage;
};

export function criarCasosDeUsoDePerfil({ repositorio, avatares }: Dependencias) {
  return {
    atualizar: repositorio.mesclar,
    enviarFoto: avatares.enviar,

    async criarInicial(uid: string, nome: string, email: string): Promise<UserProfile> {
      const perfil: UserProfile = {
        name: nome.trim(),
        email: email.trim(),
        ...gerarDadosDaConta(),
      };
      await repositorio.salvar(uid, perfil);
      return perfil;
    },

    /**
     * Carrega o perfil da sessão, recriando-o se estiver faltando.
     *
     * Conta de Auth sem documento de perfil acontece com contas criadas antes de
     * o perfil passar a ser gravado, ou se a gravação no cadastro falhou. Criar
     * o faltante evita deixar o card permanentemente sem agência/conta.
     */
    async carregarOuRecuperar(usuario: SessionUser): Promise<UserProfile> {
      const existente = await repositorio.buscar(usuario.uid);
      if (existente) return existente;

      console.warn('[auth] perfil ausente para', usuario.uid, '- criando');
      const recuperado: UserProfile = {
        name: usuario.displayName ?? '',
        email: usuario.email ?? '',
        ...gerarDadosDaConta(),
      };
      await repositorio.salvar(usuario.uid, recuperado);
      return recuperado;
    },
  };
}
