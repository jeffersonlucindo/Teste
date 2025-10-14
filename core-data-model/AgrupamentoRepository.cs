using Shared.DataModel.DataSource;
using Shared.DataModel.Model;
using Shared.DataModel.TipoAgrupamento.Model;
using Microsoft.EntityFrameworkCore;

namespace Shared.DataModel.Repository;

internal class AgrupamentoRepository(IAgrupamentoDBDataSource dataSource) : IAgrupamentoRepository
{
    public AgrupamentoDataModel Salvar(AgrupamentoDataModel model)
    {
        return dataSource.Add(model);
    }


    public void Deletar(int id)
    {
        var item = dataSource.FindOne(model => model.Id.Equals(id));
        dataSource.Delete(item);
    }

    public void Deletar(List<int> id)
    {
        if (id.Count > 0)
        {
            dataSource.DeleteMany(model => model.Id != null && id.Contains((int)model.Id));
        }
    }

    public List<AgrupamentoDataModel> RetornaTodos(int pagina, int TamanhoPagina)
    {        //trás todos
        List<AgrupamentoDataModel> lst = [];
        //trás todos
        lst = [.. dataSource.GetAll().Include(a=> a.TipoAgrupamento)];
        if (pagina == 0)
            pagina = 1;
        //calcula o skip para saltar resultados
        var skip = (pagina - 1) * TamanhoPagina;
        lst = lst.OrderBy(x => x.Agrupamento).Skip(skip).Take(TamanhoPagina).ToList();
        return lst;
    }

    public bool Atualizar(int id, AgrupamentoDataModel Agrupamento)
    {
        Agrupamento.DtAlteracao = System.DateTime.Now;
        bool retorno = false;
        try
        {
            var item = dataSource.FindOne(x => x.Id == id);

            if (!string.IsNullOrEmpty(Agrupamento.Agrupamento))
                item.Agrupamento = Agrupamento.Agrupamento; 
            if (!string.IsNullOrEmpty(Agrupamento.SiglaUnidadeVinculada))
                item.SiglaUnidadeVinculada = Agrupamento.SiglaUnidadeVinculada;
            if (!string.IsNullOrEmpty(Agrupamento.ChaveDemanda))
                item.ChaveDemanda = Agrupamento.ChaveDemanda;

            if (!string.IsNullOrEmpty(Agrupamento.Sigla))
                item.Sigla = Agrupamento.Sigla;
            if (item.IdTipoAgrupamento > 0)
                item.IdTipoAgrupamento = Agrupamento.IdTipoAgrupamento;

            item.Status = Agrupamento.Status;

            dataSource.Update(item);
        }
        catch (Exception)
        {
            return retorno;
        }
        return retorno = true;
    }

    public AgrupamentoDataModel? EncontrarPorId(int id)
    {
        return dataSource.Find(model => model.Id == id)
            .Include(a => a.TipoAgrupamento)
            .Include(s => s.Squads)
            .Include(r => r.RelAgrupamentos)
            .FirstOrDefault();
    }

    public List<AgrupamentoDataModel> Filtrar(string? Agrupamento,  int? IdAgrupamento, string? Sigla, int? TipoAgrupamento, bool? Status, string? ChaveDemanda, int pagina, int tamanhoPagina)
    {
        //trás todos
        List<AgrupamentoDataModel> lst = [];
        try
        {
            if (pagina == 0)
                pagina = 1;
            //calcula o skip para saltar resultados
            var skip = (pagina - 1) * tamanhoPagina;

            //trás todos
            lst = [.. dataSource.GetAll()
                .Include(a => a.TipoAgrupamento)
            ];

            //filtra
            if (!string.IsNullOrEmpty(Agrupamento))
                lst = lst.Where(x => x.Agrupamento!.Contains(Agrupamento, StringComparison.CurrentCultureIgnoreCase)).ToList();
            if (!string.IsNullOrEmpty(Sigla))
                lst = lst.Where(x => x.SiglaUnidadeVinculada!.Contains(Sigla, StringComparison.CurrentCultureIgnoreCase)).ToList();
            if (TipoAgrupamento >0)
                lst = lst.Where(x => x.IdTipoAgrupamento == TipoAgrupamento).ToList();
            
            if (IdAgrupamento > 0)
                lst = lst.Where(x => x.Id == IdAgrupamento).ToList();
            
            if (Status is not null)
                lst = lst.Where(x => x.Status == Status).ToList();
            if (!string.IsNullOrEmpty(ChaveDemanda))
                lst = lst.Where(x =>x.ChaveDemanda is not null && x.ChaveDemanda!.Contains(ChaveDemanda, StringComparison.CurrentCultureIgnoreCase)).ToList();
            //retorna a pagina e o total desejado
            return lst.OrderBy(x => x.Agrupamento).Skip(skip).Take(tamanhoPagina).ToList();
        }
        catch (Exception)
        {
            return lst;
        }
    }

    public List<AgrupamentoDataModel> FiltrarV2(long? idAgrupamento, string? Sigla, string? NomeSquad, long? idEmpregado, bool? stauts, int pagina = 1, int tamanhoPagina = 100)
    {
        //trás todos
        List<AgrupamentoDataModel> lst = [];
        try
        {
            if (pagina == 0)
                pagina = 1;
            //calcula o skip para saltar resultados
            var skip = (pagina - 1) * tamanhoPagina;

            //trás todos
            lst = [.. dataSource.GetAll()
                .Include(a => a.TipoAgrupamento)
                .Include(a => a.RelAgrupamentos!)
                    .ThenInclude(ra => ra.Membro)
                .Include(a => a.RelAgrupamentos!)
                    .ThenInclude(ra => ra.Papel)
                .Include(a => a.Squads!.Where(s => s.Status))
                    .ThenInclude(s => s.TipoSquad)
                .Include(a => a.Squads!.Where(s => s.Status))
                    .ThenInclude(s => s.MembroSquads!.Where(ms => ms.Status))
            ];

            //filtra
            if (idAgrupamento.HasValue && idAgrupamento > 0)
                lst = lst.Where(x => x.Id == idAgrupamento).ToList();
            
            if (!string.IsNullOrEmpty(Sigla))
                lst = lst.Where(x => x.SiglaUnidadeVinculada!.Contains(Sigla, StringComparison.CurrentCultureIgnoreCase)).ToList();
            
            if (!string.IsNullOrEmpty(NomeSquad))
                lst = lst.Where(x => x.Squads != null && x.Squads.Any(s => s.NomeSquad != null && s.NomeSquad.Contains(NomeSquad, StringComparison.CurrentCultureIgnoreCase))).ToList();
            
            if (idEmpregado.HasValue && idEmpregado > 0)
                lst = lst.Where(x => x.Squads != null && x.Squads.Any(s => s.MembroSquads != null && s.MembroSquads.Any(ms => ms.Id_Membro == idEmpregado))).ToList();
            
            if (stauts.HasValue)
                lst = lst.Where(x => x.Status == stauts).ToList();
            
            //aplica paginação
            lst = lst.OrderBy(x => x.Agrupamento).Skip(skip).Take(tamanhoPagina).ToList();
            
            // Carrega os membros manualmente através do RelAgrupamento
            foreach (var agrupamento in lst)
            {
                if (agrupamento.Squads != null)
                {
                    foreach (var squad in agrupamento.Squads.Where(s => s.Status))
                    {
                        if (squad.MembroSquads != null)
                        {
                            foreach (var membroSquad in squad.MembroSquads.Where(ms => ms.Status))
                            {
                                // Busca o RelAgrupamento que já foi carregado
                                var relAgrupamento = agrupamento.RelAgrupamentos?
                                    .FirstOrDefault(ra => ra.Id == membroSquad.Id_Membro);
                                
                                if (relAgrupamento != null)
                                {
                                    // Carrega o Membro no membroSquad
                                    if (relAgrupamento.Membro != null)
                                    {
                                        membroSquad.Membro = relAgrupamento.Membro;
                                    }
                                    
                                    // Carrega o RelAgrupamento no membroSquad
                                    membroSquad.Membro.RelAgrupamentos = new List<Shared.DataModel.RelAgrupamento.Model.RelAgrupamentoDataModel> { relAgrupamento };
                                }
                            }
                        }
                    }
                }
            }
            
            //retorna a lista com membros carregados
            return lst;
        }
        catch (Exception)
        {
            return lst;
        }
    }
}
