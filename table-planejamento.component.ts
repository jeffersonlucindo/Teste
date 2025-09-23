import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { MatDialog } from '@angular/material';
import { Router } from '@angular/router';
import { ParametrizacaoHe, ParametrizacaoHeComponent } from '../parametrizacao-he/parametrizacao-he.component';


@Component({
  selector: 'app-table-planejamento',
  templateUrl: './table-planejamento.component.html',
  styleUrls: ['./table-planejamento.component.css']
})
export class TablePlanejamentoComponent implements OnChanges {
  @Input() formGroup: FormGroup;
  @Input() podeAprovarGestor: boolean;
  @Input() podeAprovarSuperintendente: boolean;
  @Output() empregadosChanged = new EventEmitter();
  @Output() planejamentoChanged = new EventEmitter();
  @Output() valueChanged = new EventEmitter();

  routeCall: string = this.router.url.replace('/', '');

  dateRange: string[] = [];
  displayedColumns: string[] = ['empregado', ...this.dateRange];

  inputValue: number | null = null
  limite: number = 10

  idPlanejamento

  @Input() planejamento: any[];

  ROTA_GESTOR = 'nova-hora-extra-gestor'
  ROTA_SUPERINTENDENTE = 'nova-hora-extra-superintendente'

  constructor(private dialog: MatDialog,
    public router: Router) { }

  empregadosSelecionados = []

  ngOnChanges(changes: SimpleChanges) {
    if (changes['formGroup'] && this.formGroup) {
      this.idPlanejamento = this.formGroup.value.id
      let dtini = this.formGroup.value['dataInicio']
      let dtFim = this.formGroup.value['dataEncerramento']
      if (dtini && dtFim) {
        this.generateDateRange(dtini, dtFim);
      }
    }

    if (changes['planejamento'] && !changes.firstChange) {
      this.ajustarNovasInsercoes()
    }
  }

  ajustarNovasInsercoes() {
    this.planejamento['usuarioPlanejamento'].forEach(usuario => {
      if (!usuario.planejamentos || usuario.planejamentos.length == 0) {
        usuario.planejamentos = this.dateRange.map(date => ({
          dataPlanejamento: date,
          jornadaHabitual: 0,
          limiteHe: 0,
          limiteHeEstendido: 0,
          limiteHeJustificado: 0
        }));
      }
    });

    this.planejamentoChanged.emit()
  }

  generateDateRange(startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    this.dateRange = [];

    let currentDate = start;
    while (currentDate <= end) {
      this.dateRange.push(this.formatDate(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    this.displayedColumns = ['empregado', ...this.dateRange, 'totalRow'];
    this.generateTableData();
  }

  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
  }

  formatDateToTable(date): string {
    let dateFormated = date.split('/')
    let day = dateFormated[2]
    let month = dateFormated[1]
    let year = dateFormated[0]
    return `${day}/${month}/${year}`;
  }

  generateTableData() {
    this.planejamento['usuarioPlanejamento'].forEach(usuario => {
      if (!usuario.planejamentos) {
        usuario.planejamentos = []
      }
      this.dateRange.forEach(date => {
        const planejamentoEdicaoIndex = usuario.planejamentosExistentes.findIndex(p => p.idPlanejamento == this.idPlanejamento && date == p.dtPlanejamento)

        if (planejamentoEdicaoIndex !== -1) {
          let planejamentoEdicao = usuario.planejamentosExistentes[planejamentoEdicaoIndex]
          usuario.planejamentosExistentes.splice(planejamentoEdicaoIndex, 1)


          usuario.planejamentos.push({
            dataPlanejamento: date,
            jornadaHabitual: planejamentoEdicao.jornadaHabitual,
            limiteHe: planejamentoEdicao.limiteHoraExtra,
            limiteHeEstendido: planejamentoEdicao.limiteHoraExtraEstendido,
            limiteHeJustificado: planejamentoEdicao.limiteHoraExtraJustificada
          });
        } else {
          usuario.planejamentos.push({
            dataPlanejamento: date,
            jornadaHabitual: 0,
            limiteHe: 0,
            limiteHeEstendido: 0,
            limiteHeJustificado: 0
          });
        }
      })
    });

    this.planejamentoChanged.emit()
  }

  getPlanejamento(usuario, date, campo) {
    let planejamento = usuario.planejamentos.find(p => p.dataPlanejamento === date);
    return planejamento ? planejamento[campo] : 0;
  }

  setPlanejamento(usuario, date, campo, value) {
    if (!value || value == "" || isNaN(value)) {
      value = 0
    }
    let planejamento = usuario.planejamentos.find(p => p.dataPlanejamento === date);
    let limite = 0
    switch (campo) {
      case 'jornadaHabitual':
        limite = this.verificaLimiteJornada(usuario, date)
        break;
      case 'limiteHe':
        limite = this.verificaLimiteHe(usuario, date)
        break;
      case 'limiteHeJustificado':
        limite = this.verificaLimiteHeJustificada(usuario, date)
        break;
      case 'limiteHeEstendido':
        limite = this.verificaLimiteHeEstendido(usuario, date)
        break;
    }

    if (value > limite) {
      value = limite
    } else if (value < 0) {
      value = 0
    }

    if (planejamento) {
      planejamento[campo] = parseInt(value);
      planejamento.alterado = true
    }
    this.valueChanged.emit()
  }

  getTooltipOutrosPlanejamentos(usuario, date, campo) {
    let atributo = '';
    switch (campo) {
      case 'jornadaHabitual':
        atributo = 'jornadaHabitual'
        break;
      case 'limiteHe':
        atributo = 'limiteHoraExtra'
        break;
      case 'limiteHeJustificado':
        atributo = 'limiteHoraExtraJustificada'
        break;
      case 'limiteHeEstendido':
        atributo = 'limiteHoraExtraEstendido'
        break;
    }
    let tooltip = 'Quantidade lançada em outros planejamentos - '
    usuario.planejamentosExistentes.filter(itemExistente => itemExistente.dtPlanejamento === date).forEach(p => {
      tooltip = `${tooltip} ${p.nomePlanejamento}: ${p[atributo]} | `
    })

    return tooltip
  }

  getValueColun(usuario, date) {
    let somaTotalColuna = 0
    const planejamento = usuario.planejamentos.find(p => p.dataPlanejamento === date);
    if (planejamento && planejamento.jornadaHabitual) {
      somaTotalColuna += 0
    }
    if (planejamento && planejamento.limiteHe && !isNaN(planejamento.limiteHe)) {
      somaTotalColuna += parseFloat(planejamento.limiteHe) * parseFloat(usuario.valorDiurno)
    }

    if (planejamento && planejamento.limiteHeEstendido && !isNaN(planejamento.limiteHeEstendido)) {
      somaTotalColuna += parseFloat(planejamento.limiteHeEstendido) * parseFloat(usuario.valorNoturno)
    }

    if (planejamento && planejamento.limiteHeJustificado && !isNaN(planejamento.limiteHeJustificado)) {
      somaTotalColuna += parseFloat(planejamento.limiteHeJustificado) * parseFloat(usuario.valorNoturno)
    }

    return 'R$ ' + somaTotalColuna.toFixed(2).replace('.', ',')
  }

  getValueRow(type, usuario) {
    const somaJornadaHabitual = 0
    const somaLimiteHe = usuario.planejamentos.reduce((acc, objeto) => acc + (objeto.limiteHe ? parseFloat(objeto.limiteHe) : 0), 0)
    const somaLimiteHeEstendido = usuario.planejamentos.reduce((acc, objeto) => acc + (objeto.limiteHeEstendido ? parseFloat(objeto.limiteHeEstendido) : 0), 0)
    const somaLimiteHeJustificado = usuario.planejamentos.reduce((acc, objeto) => acc + (objeto.limiteHeJustificado ? parseFloat(objeto.limiteHeJustificado) : 0), 0)

    let totalType1 = 0
    let totalType2 = 0
    let totalType3 = 0
    let totalType4 = 0
    let totalType5 = 0

    // if(type == 1) {
    //   totalType1 = somaJornadaHabitual * 100.31
    //   return 'R$ ' + totalType1.toFixed(2).replace('.', ',')
    // }

    if (type == 2) {
      totalType2 = somaLimiteHe * parseFloat(usuario.valorDiurno)
      return 'R$ ' + totalType2.toFixed(2).replace('.', ',')
    }

    if (type == 3) {
      totalType3 = somaLimiteHeEstendido * parseFloat(usuario.valorNoturno)
      return 'R$ ' + totalType3.toFixed(2).replace('.', ',')
    }

    if (type == 4) {
      totalType4 = somaLimiteHeJustificado * parseFloat(usuario.valorNoturno)
      return 'R$ ' + totalType4.toFixed(2).replace('.', ',')
    }

    if (type == 5) {
      totalType5 = somaLimiteHe * parseFloat(usuario.valorDiurno) + somaLimiteHeEstendido * parseFloat(usuario.valorNoturno) + somaLimiteHeJustificado * parseFloat(usuario.valorNoturno)
      return 'R$ ' + totalType5.toFixed(2).replace('.', ',')
    }

    return 'R$ 0,00'
  }

  verificaFDS(date: string): boolean {
    const day = new Date(date).getDay();
    if (day === 0 || day === 6) {
      return true;
    }
    return false;
  }

  verificaFeriadoOuFDS(usuario, date) {
    const day = new Date(date).getDay();
    const listaFeriados = usuario.feriadosData;
    let isFeriado = null;

    if (usuario.feriados) {
      isFeriado = listaFeriados.find(itemExistente => itemExistente.dataFeriado === date)
    }

    if (isFeriado || day === 0 || day === 6) {
      return true
    } else {
      return false
    }
  }

  verificaLimiteJornada(usuario, date, disponivel = true) {
    let somaHoras = 0
    const planejamentosExistentes = usuario.planejamentosExistentes
    let valorJornadaHabitual = usuario.jornadaHabitual

    if (planejamentosExistentes.length > 0) {
      somaHoras = planejamentosExistentes.filter(itemExistente => itemExistente.dtPlanejamento === date && itemExistente.jornadaHabitual > 0).reduce((somatorio, item) => somatorio + item.jornadaHabitual, 0)

      if (somaHoras && somaHoras > 0) {
        let horasRestantes = disponivel ? valorJornadaHabitual - somaHoras : valorJornadaHabitual
        return horasRestantes
      } else {
        return valorJornadaHabitual
      }
    } else {
      return valorJornadaHabitual
    }
  }

  verificaLimiteHe(usuario, date, disponivel = true) {
    let somaHoras = 0
    const planejamentosExistentes = usuario.planejamentosExistentes
    let valorHe = usuario.limiteHe

    if (planejamentosExistentes.length > 0) {
      somaHoras = planejamentosExistentes.filter(itemExistente => itemExistente.dtPlanejamento === date && itemExistente.limiteHoraExtra > 0).reduce((somatorio, item) => somatorio + item.limiteHoraExtra, 0)

      if (somaHoras && somaHoras > 0) {
        let horasRestantes = disponivel ? valorHe - somaHoras : valorHe
        return horasRestantes
      } else {
        return valorHe
      }
    } else {
      return valorHe
    }
  }

  verificaLimiteHeEstendido(usuario, date, disponivel = true) {
    let somaHoras = 0
    const planejamentosExistentes = usuario.planejamentosExistentes
    let valorHeEstendido = usuario.limiteHeEstendido


    const feriado = usuario && usuario.feriadosData ? usuario.feriadosData.find(itemExistente => itemExistente.dataFeriado === date) : null
    if (feriado) {
      valorHeEstendido = valorHeEstendido - 2
    } else if (new Date(date).getDay() == 0) {
      valorHeEstendido = valorHeEstendido - 2
    }

    if (planejamentosExistentes.length > 0) {
      somaHoras = planejamentosExistentes.filter(itemExistente => itemExistente.dtPlanejamento === date && itemExistente.limiteHoraExtraEstendido > 0).reduce((somatorio, item) => somatorio + item.limiteHoraExtraEstendido, 0)

      if (somaHoras && somaHoras > 0) {
        let horasRestantes = disponivel ? valorHeEstendido - somaHoras : valorHeEstendido
        return horasRestantes
      } else {
        return valorHeEstendido
      }
    } else {
      return valorHeEstendido
    }
  }

  verificaLimiteHeJustificada(usuario, date, disponivel = true) {
    let somaHoras = 0
    const planejamentosExistentes = usuario.planejamentosExistentes
    let valorHeJustificado = usuario.limiteHeJustificado

    if (planejamentosExistentes.length > 0) {
      somaHoras = planejamentosExistentes.filter(itemExistente => itemExistente.dtPlanejamento === date && itemExistente.limiteHoraExtraJustificada > 0).reduce((somatorio, item) => somatorio + item.limiteHoraExtraJustificada, 0)

      if (somaHoras && somaHoras > 0) {
        let horasRestantes = disponivel ? valorHeJustificado - somaHoras : valorHeJustificado
        return horasRestantes
      } else {
        return valorHeJustificado
      }
    } else {
      return valorHeJustificado
    }
  }

  openParametrizacao() {
    let dialogRef = this.dialog.open(ParametrizacaoHeComponent, {
      height: '320px',
      width: '1100px'
    })

    dialogRef.afterClosed().subscribe((result: ParametrizacaoHe) => {
      if (result) {
        this.ajustarValores(result)
      }
    });
  }

  ajustarValores(parametrizacao: ParametrizacaoHe) {
    this.planejamento['usuarioPlanejamento'].forEach(usuario => {
      usuario.planejamentos.forEach(p => {

        p.alterado = true
        if (!this.verificaFeriadoOuFDS(usuario, p.dataPlanejamento) && parametrizacao.jornadaHabitual && parametrizacao.jornadaHabitual > 0) {
          const limiteJornadaDisponivel = this.verificaLimiteJornada(usuario, p.dataPlanejamento)
          const limiteJornadaTotal = this.verificaLimiteJornada(usuario, p.dataPlanejamento, false)
          if (limiteJornadaDisponivel > 0) {
            const limite = parametrizacao.baseParaCalculo == 'DISPONIVEL' ? limiteJornadaDisponivel : limiteJornadaTotal
            p.jornadaHabitual = Math.floor(limite * parametrizacao.jornadaHabitual / 100)
            p.alterado = true
          }
        }

        if (this.verificaFeriadoOuFDS(usuario, p.dataPlanejamento) && parametrizacao.limiteHoraEstendida && parametrizacao.limiteHoraEstendida > 0) {
          const limiteHoraEstendidaDisponivel = this.verificaLimiteHeEstendido(usuario, p.dataPlanejamento)
          const limiteHoraEstendidaTotal = this.verificaLimiteHeEstendido(usuario, p.dataPlanejamento, false)
          if (limiteHoraEstendidaDisponivel > 0) {
            const limite = parametrizacao.baseParaCalculo == 'DISPONIVEL' ? limiteHoraEstendidaDisponivel : limiteHoraEstendidaTotal
            p.limiteHeEstendido = Math.floor(limite * parametrizacao.limiteHoraEstendida / 100)
            p.alterado = true
          }
        }

        if (!this.verificaFeriadoOuFDS(usuario, p.dataPlanejamento) && parametrizacao.limiteHoraExtra && parametrizacao.limiteHoraExtra > 0) {
          const limiteHoraExtraDisponivel = this.verificaLimiteHe(usuario, p.dataPlanejamento)
          const limiteHoraExtraTotal = this.verificaLimiteHe(usuario, p.dataPlanejamento, false)
          if (limiteHoraExtraDisponivel > 0) {
            const limite = parametrizacao.baseParaCalculo == 'DISPONIVEL' ? limiteHoraExtraDisponivel : limiteHoraExtraTotal
            p.limiteHe = Math.floor(limite * parametrizacao.limiteHoraExtra / 100)
            p.alterado = true
          }
        }

        if (parametrizacao.limiteHoraJustificada && parametrizacao.limiteHoraJustificada > 0) {
          const limiteHoraJustificadaDisponivel = this.verificaLimiteHeJustificada(usuario, p.dataPlanejamento)
          const limiteHoraJustificadaTotal = this.verificaLimiteHeJustificada(usuario, p.dataPlanejamento, false)
          if (limiteHoraJustificadaDisponivel > 0) {
            const limite = parametrizacao.baseParaCalculo == 'DISPONIVEL' ? limiteHoraJustificadaDisponivel : limiteHoraJustificadaTotal
            p.limiteHeJustificado = Math.floor(limite * parametrizacao.limiteHoraJustificada / 100)
            p.alterado = true
          }
        }
      })
    })
    this.valueChanged.emit()
  }

  arredondarNumeros(numero: number) {
    return numero >= Math.floor(numero) + 0.5 ? Math.ceil(numero) : Math.floor(numero)
  }

  onChange(usuario) {
    if (usuario.selecionado) {
      this.empregadosSelecionados.push(usuario.matricula)
    } else {
      const index = this.empregadosSelecionados.findIndex(e => e == usuario.coMatricula)
      if (index !== -1) {
        this.empregadosSelecionados.splice(index, 1)
      }
    }
    this.empregadosChanged.emit(this.empregadosSelecionados)
  }
}
