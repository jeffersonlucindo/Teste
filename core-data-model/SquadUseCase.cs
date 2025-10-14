using BaseMVVM.Domain.Membro.Model;
using BaseMVVM.Domain.Squad.Model;
using Shared.DataModel.Model;
using Shared.DataModel.Repository;
using Shared.DataModel.Squad.Model;
using Shared.DataModel.Squad.Repository;

namespace BaseMVVM.Domain.Squad.UseCase;

internal class SquadUseCase(ISquadRepository repository, IAgrupamentoRepository agrupamentoRepository): ISquadUseCase
{
    public SquadDomainModel Salvar(SquadDomainModel Squad)
    {
        SquadDataModel result = repository.Salvar(Squad.ToData());
        return SquadDomainModel.FromData(result);
    }

    public SquadDomainModel? EncontraPorId(long id)
    {
        var datamodel = repository.EncontrarPorId(id);
        return datamodel != null ? SquadDomainModel.FromData(datamodel) : null;
    }

    public int CalculaSequencial(long idAgrupamento) 
    {
        return repository.CalculaSequencial(idAgrupamento);
    }

    public bool VerificaDuplicata(long idAgrupamento, string Sigla, string NomeSquad) 
    {
        return repository.VerificaDuplicata(idAgrupamento, Sigla, NomeSquad);
    }

    public List<SquadDomainModel> RetornarTodos(int pagina, int TamanhoPagina)
    {
        var datamodel = repository.RetornaTodos(pagina, TamanhoPagina);

        var ativos = datamodel
            .Where(squad => squad.Status)
            .ToList();

        return SquadDomainModel.FromData(ativos);
    }

    public List<SquadDomainModel> Filtrar(long? idAgendamento, string? Sigla, string? NomeSquad, long? idEmpregado, bool? stauts, int pagina = 1, int tamanhoPagina = 100)
    {
        var datamodel = repository.Filtrar(idAgendamento, Sigla, NomeSquad, idEmpregado, stauts, pagina, tamanhoPagina);
        
        return SquadDomainModel.FromData(datamodel);
    }
    
    public List<AgrupamentoComSquadDomainMoel> FiltrarV2(long? idAgrupamento, string? Sigla, string? NomeSquad, long? idEmpregado, bool? stauts, int pagina = 1, int tamanhoPagina = 100)
    {
        var datamodel = agrupamentoRepository.FiltrarV2(idAgrupamento, Sigla, NomeSquad, idEmpregado, stauts, pagina, tamanhoPagina);
        return AgrupamentoComSquadDomainMoel.FromData(datamodel);
    }


    public void AlternarStatus(List<long> ids)
    {
        repository.AlternarStatus(ids);
    }

    public bool Atualizar(long id, SquadDomainModel atualizacoes)
    {
        var atualizado = repository.Atualizar(id,atualizacoes.ToData());
        return atualizado;
    }
   
}
