import * as caminho from 'node:path';

import { Importar } from '@designliquido/delegua/fontes/declaracoes';
import { DeleguaModulo } from '@designliquido/delegua/fontes/estruturas';

import { ImportadorInterface } from '../interfaces/importador-interface';
import { InterpretadorBase } from '@designliquido/delegua/fontes/interpretador/interpretador-base';

import carregarBibliotecaNode from './mecanismo-importacao-bibliotecas';


/**
 * O Interpretador visita todos os elementos complexos gerados pelo avaliador sintático (_parser_),
 * e de fato executa a lógica de programação descrita no código.
 */
export class Interpretador extends InterpretadorBase {
    importador: ImportadorInterface;

    constructor(
        importador: ImportadorInterface,
        diretorioBase: string,
        performance = false,
        funcaoDeRetorno: Function = null
    ) {
        super(diretorioBase, performance, funcaoDeRetorno);
        this.importador = importador;
    }

    /**
     * Importa um arquivo como módulo.
     * @param declaracao A declaração de importação.
     * @returns Ou um `DeleguaModulo`, ou um dicionário de funções.
     */
    async visitarDeclaracaoImportar(declaracao: Importar): Promise<DeleguaModulo> {
        const caminhoRelativo = await this.avaliar(declaracao.caminho);
        const caminhoTotal = caminho.join(this.diretorioBase, caminhoRelativo);
        const nomeArquivo = caminho.basename(caminhoTotal);

        if (!caminhoTotal.endsWith('.delegua')) {
            try {
                return await carregarBibliotecaNode(caminhoRelativo);
            } catch (erro: any) {
                this.erros.push(erro);
                return null;
            }
        }

        const conteudoImportacao = this.importador.importar(caminhoRelativo, false, false);
        const retornoInterpretador = await this.interpretar(
            conteudoImportacao.retornoAvaliadorSintatico.declaracoes,
            true
        );

        const funcoesChamaveis = this.pilhaEscoposExecucao.obterTodasDeleguaFuncao();

        const declaracoesClasse = this.pilhaEscoposExecucao.obterTodasDeclaracaoClasse();

        if (declaracoesClasse.hasOwnProperty('super')) {
            delete declaracoesClasse['super'];
        }

        const novoModulo = new DeleguaModulo();

        const chavesFuncoesChamaveis = Object.keys(funcoesChamaveis);
        for (let i = 0; i < chavesFuncoesChamaveis.length; i++) {
            novoModulo.componentes[chavesFuncoesChamaveis[i]] = funcoesChamaveis[chavesFuncoesChamaveis[i]];
        }

        const chavesDeclaracoesClasse = Object.keys(declaracoesClasse);
        for (let i = 0; i < chavesDeclaracoesClasse.length; i++) {
            novoModulo.componentes[chavesDeclaracoesClasse[i]] = declaracoesClasse[chavesDeclaracoesClasse[i]];
        }

        return novoModulo;
    }
}
