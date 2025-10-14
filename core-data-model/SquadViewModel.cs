public List<AgrupamentoResponseDTO> FiltrarV2(long? idAgrupamento, string? Sigla, string? NomeSquad, long? idEmpregado, bool? status, int pagina = 1, int tamanhoPagina = 100)
    {
        // Obtém os agrupamentos com suas squads do use case
        var agrupamentos = useCase.FiltrarV2(idAgrupamento, Sigla, NomeSquad, idEmpregado, status, pagina, tamanhoPagina);
        bool consultaSemFiltro = idAgrupamento == null && string.IsNullOrWhiteSpace(Sigla) && string.IsNullOrWhiteSpace(NomeSquad) && idEmpregado == null && status == null;

        // Monta resposta agregada
        var resposta = new List<AgrupamentoResponseDTO>();
        foreach (var agr in agrupamentos)
        {
            var dtoAgr = new AgrupamentoResponseDTO
            {
                IdAgrupamento = agr.IdAgrupamento,
                NomeAgrupamento = agr.NomeAgrupamento,
                IdTipoAgrupamento = agr.IdTipoAgrupamento,
                NomeTipoAgrupamento = agr.NomeTipoAgrupamento,
                Squads = []
            };

            // Seleciona squads (se consulta sem filtro, considera apenas ativas; caso contrário mantém resultado conforme filtro)
            var squadsFonte = agr.Squads ?? new List<SquadDomainModel>();
            if (consultaSemFiltro)
            {
                squadsFonte = squadsFonte.Where(s => s.Status).ToList();
            }
            else if (status.HasValue)
            {
                squadsFonte = squadsFonte.Where(s => s.Status == status.Value).ToList();
            }

            foreach (var squadDom in squadsFonte)
            {
                var squadDto = squadDom.ToResponseDTO();
                // Popula membros usando o tipo correto (MembroSquadDataModel) e aplica filtro de ativos quando consulta sem filtro
                IEnumerable<MembroSquadDataModel> membrosFonte = squadDom.MembrosSquad ?? Enumerable.Empty<MembroSquadDataModel>();
                if (consultaSemFiltro)
                    membrosFonte = membrosFonte.Where(m => m.Status);
                
                

                squadDto.Membros = membrosFonte.Select(m =>
                {
                    var totalRas = m.Membro?.RelAgrupamentos?.Count() ?? 0;
                    var raSelecionado = m.Membro?.RelAgrupamentos?
                        .FirstOrDefault(ra => ra.Status == true
                            && ra.IdAgrupamento == agr.IdAgrupamento
                            && ra.IdColaborador.HasValue
                            && ra.IdColaborador.Value == System.Convert.ToInt32(m.Id_Membro));

                    System.Console.WriteLine($"[FiltrarV2] Agrupamento={agr.IdAgrupamento} Squad={squadDom.Id} Membro={m.Id_Membro} | RelAgrupamentos carregados={totalRas} | RA selecionado={(raSelecionado != null)} | IdPapel={(raSelecionado?.IdPapel?.ToString() ?? "-")} | Dedicacao={(raSelecionado?.Dedicacao?.ToString() ?? "-")}");

                    var papelEsforco = raSelecionado != null
                        ? new PapelEsforcoDTO
                        {
                            IdPapel = raSelecionado.IdPapel ?? 0,
                            //NomePapel = $"Papel {(raSelecionado.Papel ?? 0)}",
                            NomePapel = raSelecionado.Papel?.NomePapel ?? "",
                            Dedicacao = raSelecionado.Dedicacao ?? 0
                        }
                        : null;

                    return new MembroSquadResponseDTO
                    {
                        Id = m.Id,
                        Id_Membro = m.Id_Membro,
                        Id_Squad = m.Id_Squad,
                        Status = m.Status,
                        Responsavel = m.Responsavel,
                        Matricula = m.Membro?.Matricula ?? "",
                        PapelEsforco = papelEsforco
                    };
                }).ToList();

                dtoAgr.Squads.Add(squadDto);
            }

            // Se após filtros não restar nenhuma squad, ignora o agrupamento (segue padrão de exibir apenas agrupamentos com squads)
            if (dtoAgr.Squads.Any())
                resposta.Add(dtoAgr);
        }

        // Ordena agrupamentos por nome e squads por nome
        resposta = resposta
            .OrderBy(a => a.NomeAgrupamento)
            .Select(a =>
            {
                a.Squads = a.Squads.OrderBy(s => s.NomeSquad).ToList();
                return a;
            })
            .ToList();
        
        return resposta;
    }
