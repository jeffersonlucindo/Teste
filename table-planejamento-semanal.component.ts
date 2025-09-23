import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { MatDialog } from '@angular/material';
import { Router } from '@angular/router';
import { ParametrizacaoHe, ParametrizacaoHeComponent } from '../parametrizacao-he/parametrizacao-he.component';

interface PlanejamentoDia {
  data: Date | string;
  jornadaHabitual?: number;
  limiteHe?: number;
  limiteHeEstendido?: number;
  limiteHeJustificado?: number;
  total?: number;
}

interface UsuarioPlanejamento {
  empregadoId: string;
  nome: string;
  planejamentos: PlanejamentoDia[];
}

interface SemanaInfo {
  numeroSemana: number;
  dataInicio: Date;
  dataFim: Date;
  dias: Date[];
}

interface SemanaPorEmpregado {
  empregadoId: string;
  nome: string;
  valores: {
    semana: number;
    dataInicio: Date;
    dataFim: Date;
    jornadaHabitual: number;
    limiteHe: number;
    limiteHeEstendido: number;
    limiteHeJustificado: number;
    total: number;
  }[];
}

@Component({
  selector: 'app-table-planejamento-semanal',
  templateUrl: './table-planejamento-semanal.component.html',
  styleUrls: ['./table-planejamento-semanal.component.css']
})
export class TablePlanejamentoSemanalComponent implements OnChanges, OnInit {

  @Input() formGroup: FormGroup;
  @Input() podeAprovarGestor: boolean;
  @Input() podeAprovarSuperintendente: boolean;
  @Output() empregadosChanged = new EventEmitter();
  @Output() planejamentoChanged = new EventEmitter();
  @Output() valueChanged = new EventEmitter();

  routeCall: string;

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

  ngOnInit() {
    this.routeCall = this.router.url.replace('/', '');
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['formGroup'] && this.formGroup) {
      this.idPlanejamento = this.formGroup.value.id
      let dtini = this.formGroup.value['dataInicio']
      let dtFim = this.formGroup.value['dataEncerramento']
      if (dtini && dtFim) {
        this.generateDateRange(dtini, dtFim);
      }
    }

    if (changes['planejamento'] && this.planejamento && this.planejamento['usuarioPlanejamento']) {
      if (!changes['planejamento'].firstChange) {
        this.ajustarNovasInsercoes()
      }
      if (this.dateRange.length > 0) {
        this.generateTableData();
      }
    }
  }

  ajustarNovasInsercoes() {
    if (!this.planejamento || !this.planejamento['usuarioPlanejamento']) return;
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

    // Usar setTimeout para evitar ExpressionChangedAfterItHasBeenCheckedError
    setTimeout(() => {
      this.planejamentoChanged.emit()
    }, 0);
  }

  semanas: { numeroSemana: number; dataInicio: Date; dataFim: Date; dias: string[] }[] = [];

  generateDateRange(startDate: string, endDate: string) {
    const start = new Date(startDate); start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);     end.setHours(0, 0, 0, 0);

    this.semanas = [];
    this.dateRange = [];

    let currentWeekStart = this.getStartOfWeekMonday(start);

    while (currentWeekStart <= end) {
      const currentWeekEnd = new Date(currentWeekStart);
      currentWeekEnd.setDate(currentWeekStart.getDate() + 6); // Mon..Sun

      const dias: string[] = [];
      for (let d = new Date(currentWeekStart); d <= currentWeekEnd && d <= end; d.setDate(d.getDate() + 1)) {
        if (d < start) continue; // clamp lower bound
        const f = this.formatDate(d);
        dias.push(f);
        this.dateRange.push(f);
      }

      if (dias.length) {
        this.semanas.push({
          numeroSemana: this.semanas.length + 1,
          dataInicio: new Date(Math.max(currentWeekStart.getTime(), start.getTime())),
          dataFim: new Date(Math.min(currentWeekEnd.getTime(), end.getTime())),
          dias
        });
      }

      currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    }

    this.displayedColumns = ['empregado', ...this.semanas.map(s => s.numeroSemana.toString())];

    // Gerar dados da tabela após definir o range de datas
    if (this.planejamento && this.planejamento['usuarioPlanejamento']) {
      this.generateTableData();
    }
  }

  // Return Monday of the same week of the given date (or the date itself if it is Monday)
  private getStartOfWeekMonday(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();              // 0..6 (Sun..Sat)
    const diff = (day + 6) % 7;          // 0 for Mon, 6 for Sun
    d.setDate(d.getDate() - diff);
    return d;
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
    if (!this.planejamento || !this.planejamento['usuarioPlanejamento']) return;

    this.planejamento['usuarioPlanejamento'].forEach(usuario => {
      if (!usuario.planejamentos) {
        usuario.planejamentos = []
      }

      // Limpar planejamentos existentes para o período atual
      usuario.planejamentos = usuario.planejamentos.filter(p =>
        !this.dateRange.includes(p.dataPlanejamento)
      );

      this.dateRange.forEach(date => {
        const planejamentoEdicaoIndex = usuario.planejamentosExistentes ?
          usuario.planejamentosExistentes.findIndex(p => p.idPlanejamento == this.idPlanejamento && date == p.dtPlanejamento) : -1;

        if (planejamentoEdicaoIndex !== -1) {
          let planejamentoEdicao = usuario.planejamentosExistentes[planejamentoEdicaoIndex]

          usuario.planejamentos.push({
            dataPlanejamento: date,
            jornadaHabitual: planejamentoEdicao.jornadaHabitual || 0,
            limiteHe: planejamentoEdicao.limiteHoraExtra || 0,
            limiteHeEstendido: planejamentoEdicao.limiteHoraExtraEstendido || 0,
            limiteHeJustificado: planejamentoEdicao.limiteHoraExtraJustificada || 0,
            alterado: false
          });
        } else {
          usuario.planejamentos.push({
            dataPlanejamento: date,
            jornadaHabitual: 0,
            limiteHe: 0,
            limiteHeEstendido: 0,
            limiteHeJustificado: 0,
            alterado: false
          });
        }
      })
    });

    // Usar setTimeout para evitar ExpressionChangedAfterItHasBeenCheckedError
    setTimeout(() => {
      this.planejamentoChanged.emit()
    }, 0);
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

    // Usar setTimeout para evitar ExpressionChangedAfterItHasBeenCheckedError
    setTimeout(() => {
      this.valueChanged.emit()
    }, 0);
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

    if (usuario.planejamentosExistentes && Array.isArray(usuario.planejamentosExistentes)) {
      usuario.planejamentosExistentes.filter(itemExistente => itemExistente.dtPlanejamento === date).forEach(p => {
        tooltip = `${tooltip} ${p.nomePlanejamento}: ${p[atributo] || 0} | `
      })
    }

    return tooltip
  }

  getValueColun(usuario, date) {
    let somaTotalColuna = 0
    const planejamento = usuario.planejamentos.find(p => p.dataPlanejamento === date);
    if (planejamento && planejamento.jornadaHabitual) {
      somaTotalColuna += 0
    }
    if (planejamento && planejamento.limiteHe && !isNaN(planejamento.limiteHe)) {
      somaTotalColuna += parseFloat(planejamento.limiteHe) * parseFloat(usuario.valorDiurno || 0)
    }

    if (planejamento && planejamento.limiteHeEstendido && !isNaN(planejamento.limiteHeEstendido)) {
      somaTotalColuna += parseFloat(planejamento.limiteHeEstendido) * parseFloat(usuario.valorNoturno || 0)
    }

    if (planejamento && planejamento.limiteHeJustificado && !isNaN(planejamento.limiteHeJustificado)) {
      somaTotalColuna += parseFloat(planejamento.limiteHeJustificado) * parseFloat(usuario.valorNoturno || 0)
    }

    return 'R$ ' + somaTotalColuna.toFixed(2).replace('.', ',')
  }

  getValueRow(type, usuario) {
    if (!usuario.planejamentos || !Array.isArray(usuario.planejamentos)) {
      return 'R$ 0,00'
    }

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
      totalType2 = somaLimiteHe * parseFloat(usuario.valorDiurno || 0)
      return 'R$ ' + totalType2.toFixed(2).replace('.', ',')
    }

    if (type == 3) {
      totalType3 = somaLimiteHeEstendido * parseFloat(usuario.valorNoturno || 0)
      return 'R$ ' + totalType3.toFixed(2).replace('.', ',')
    }

    if (type == 4) {
      totalType4 = somaLimiteHeJustificado * parseFloat(usuario.valorNoturno || 0)
      return 'R$ ' + totalType4.toFixed(2).replace('.', ',')
    }

    if (type == 5) {
      totalType5 = somaLimiteHe * parseFloat(usuario.valorDiurno || 0) + somaLimiteHeEstendido * parseFloat(usuario.valorNoturno || 0) + somaLimiteHeJustificado * parseFloat(usuario.valorNoturno || 0)
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
    const planejamentosExistentes = usuario.planejamentosExistentes || []
    let valorJornadaHabitual = usuario.jornadaHabitual || 0

    if (planejamentosExistentes.length > 0) {
      somaHoras = planejamentosExistentes.filter(itemExistente => itemExistente.dtPlanejamento === date && itemExistente.jornadaHabitual > 0).reduce((somatorio, item) => somatorio + (item.jornadaHabitual || 0), 0)

      if (somaHoras && somaHoras > 0) {
        let horasRestantes = disponivel ? valorJornadaHabitual - somaHoras : valorJornadaHabitual
        return horasRestantes > 0 ? horasRestantes : 0
      } else {
        return valorJornadaHabitual
      }
    } else {
      return valorJornadaHabitual
    }
  }

  verificaLimiteHe(usuario, date, disponivel = true) {
    let somaHoras = 0
    const planejamentosExistentes = usuario.planejamentosExistentes || []
    let valorHe = usuario.limiteHe || 0

    if (planejamentosExistentes.length > 0) {
      somaHoras = planejamentosExistentes.filter(itemExistente => itemExistente.dtPlanejamento === date && itemExistente.limiteHoraExtra > 0).reduce((somatorio, item) => somatorio + (item.limiteHoraExtra || 0), 0)

      if (somaHoras && somaHoras > 0) {
        let horasRestantes = disponivel ? valorHe - somaHoras : valorHe
        return horasRestantes > 0 ? horasRestantes : 0
      } else {
        return valorHe
      }
    } else {
      return valorHe
    }
  }

  verificaLimiteHeEstendido(usuario, date, disponivel = true) {
    let somaHoras = 0
    const planejamentosExistentes = usuario.planejamentosExistentes || []
    let valorHeEstendido = usuario.limiteHeEstendido || 0

    const feriado = usuario && usuario.feriadosData ? usuario.feriadosData.find(itemExistente => itemExistente.dataFeriado === date) : null
    if (feriado) {
      valorHeEstendido = Math.max(0, valorHeEstendido - 2)
    } else if (new Date(date).getDay() == 0) {
      valorHeEstendido = Math.max(0, valorHeEstendido - 2)
    }

    if (planejamentosExistentes.length > 0) {
      somaHoras = planejamentosExistentes.filter(itemExistente => itemExistente.dtPlanejamento === date && itemExistente.limiteHoraExtraEstendido > 0).reduce((somatorio, item) => somatorio + (item.limiteHoraExtraEstendido || 0), 0)

      if (somaHoras && somaHoras > 0) {
        let horasRestantes = disponivel ? valorHeEstendido - somaHoras : valorHeEstendido
        return horasRestantes > 0 ? horasRestantes : 0
      } else {
        return valorHeEstendido
      }
    } else {
      return valorHeEstendido
    }
  }

  verificaLimiteHeJustificada(usuario, date, disponivel = true) {
    let somaHoras = 0
    const planejamentosExistentes = usuario.planejamentosExistentes || []
    let valorHeJustificado = usuario.limiteHeJustificado || 0

    if (planejamentosExistentes.length > 0) {
      somaHoras = planejamentosExistentes.filter(itemExistente => itemExistente.dtPlanejamento === date && itemExistente.limiteHoraExtraJustificada > 0).reduce((somatorio, item) => somatorio + (item.limiteHoraExtraJustificada || 0), 0)

      if (somaHoras && somaHoras > 0) {
        let horasRestantes = disponivel ? valorHeJustificado - somaHoras : valorHeJustificado
        return horasRestantes > 0 ? horasRestantes : 0
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

    // Usar setTimeout para evitar ExpressionChangedAfterItHasBeenCheckedError
    setTimeout(() => {
      this.valueChanged.emit()
    }, 0);
  }

  arredondarNumeros(numero: number) {
    return numero >= Math.floor(numero) + 0.5 ? Math.ceil(numero) : Math.floor(numero)
  }

  onChange(usuario) {
    if (usuario.selecionado) {
      this.empregadosSelecionados.push(usuario.matricula)
    } else {
      const index = this.empregadosSelecionados.findIndex(e => e == usuario.matricula)
      if (index !== -1) {
        this.empregadosSelecionados.splice(index, 1)
      }
    }
    this.empregadosChanged.emit(this.empregadosSelecionados)
  }

  getSomaSemana(usuario, semana, campo) {
    if (!usuario.planejamentos || !Array.isArray(usuario.planejamentos)) {
      return 0
    }

    return semana.dias.reduce((soma, dia) => {
      const planejamento = usuario.planejamentos.find(p => p.dataPlanejamento === dia);
      return soma + (planejamento && planejamento[campo] ? parseFloat(planejamento[campo]) || 0 : 0);
    }, 0);
  }

  getValorTotalSemana(usuario, semana) {
    if (!usuario.planejamentos || !Array.isArray(usuario.planejamentos)) {
      return '0,00'
    }

    return semana.dias.reduce((total, dia) => {
      const planejamento = usuario.planejamentos.find(p => p.dataPlanejamento === dia);
      let valorTotal = 0;

      if (planejamento && planejamento.limiteHe) {
        valorTotal += parseFloat(planejamento.limiteHe) * parseFloat(usuario.valorDiurno || 0);
      }
      if (planejamento && planejamento.limiteHeEstendido) {
        valorTotal += parseFloat(planejamento.limiteHeEstendido) * parseFloat(usuario.valorNoturno || 0);
      }
      if (planejamento && planejamento.limiteHeJustificado) {
        valorTotal += parseFloat(planejamento.limiteHeJustificado) * parseFloat(usuario.valorNoturno || 0);
      }

      return total + valorTotal;
    }, 0).toFixed(2).replace('.', ',');
  }

  // Dias elegíveis por campo (replica as regras do diário)
  private getDiasElegiveisSemana(usuario: any, semana: { dias: string[] }, campo: string): string[] {
    if (campo === 'limiteHeEstendido') {
      return semana.dias.filter(d => this.verificaFeriadoOuFDS(usuario, d)); // fds/feriado
    }
    if (campo === 'jornadaHabitual' || campo === 'limiteHe') {
      return semana.dias.filter(d => !this.verificaFeriadoOuFDS(usuario, d)); // dias úteis
    }
    if (campo === 'limiteHeJustificado') {
      return semana.dias; // segue visibilidade/disabled do diário
    }
    return semana.dias;
  }

  hasEligibleDays(usuario: any, semana: any, campo: string): boolean {
    return this.getDiasElegiveisSemana(usuario, semana, campo).length > 0;
  }

  getLimiteSemana(usuario: any, semana: any, campo: string): number {
    const dias = this.getDiasElegiveisSemana(usuario, semana, campo);
    return dias.reduce((soma, dia) => {
      switch (campo) {
        case 'jornadaHabitual': return soma + this.verificaLimiteJornada(usuario, dia);
        case 'limiteHe': return soma + this.verificaLimiteHe(usuario, dia);
        case 'limiteHeEstendido': return soma + this.verificaLimiteHeEstendido(usuario, dia);
        case 'limiteHeJustificado': return soma + this.verificaLimiteHeJustificada(usuario, dia);
        default: return soma;
      }
    }, 0);
  }

  // Distribui o valor semanal pelos dias elegíveis respeitando os limites diários
  setPlanejamentoSemana(usuario: any, semana: any, campo: string, value: any) {
    let v = parseInt(value, 10);
    if (isNaN(v) || v < 0) v = 0;

    const limiteSemana = this.getLimiteSemana(usuario, semana, campo);
    if (v > limiteSemana) v = limiteSemana;

    const dias = this.getDiasElegiveisSemana(usuario, semana, campo);

    // zera o campo em todos os dias elegíveis antes de redistribuir
    dias.forEach(dia => {
      let planejamento = usuario.planejamentos.find(p => p.dataPlanejamento === dia);
      if (!planejamento) {
        planejamento = { dataPlanejamento: dia, jornadaHabitual: 0, limiteHe: 0, limiteHeEstendido: 0, limiteHeJustificado: 0 };
        usuario.planejamentos.push(planejamento);
      }
      planejamento[campo] = 0;
      planejamento.alterado = true;
    });

    // distribui respeitando o limite diário
    let restante = v;
    for (const dia of dias) {
      if (restante <= 0) break;
      let maxDia = 0;
      switch (campo) {
        case 'jornadaHabitual': maxDia = this.verificaLimiteJornada(usuario, dia); break;
        case 'limiteHe': maxDia = this.verificaLimiteHe(usuario, dia); break;
        case 'limiteHeEstendido': maxDia = this.verificaLimiteHeEstendido(usuario, dia); break;
        case 'limiteHeJustificado': maxDia = this.verificaLimiteHeJustificada(usuario, dia); break;
      }
      const alocar = Math.min(restante, maxDia);
      const planejamento = usuario.planejamentos.find(p => p.dataPlanejamento === dia);
      if (planejamento) {
        planejamento[campo] = parseInt(String(alocar), 10);
        planejamento.alterado = true;
      }
      restante -= alocar;
    }

    // Usar setTimeout para evitar ExpressionChangedAfterItHasBeenCheckedError
    setTimeout(() => {
      this.valueChanged.emit();
      this.planejamentoChanged.emit();
    }, 0);
  }

  // Tooltip agregado para a semana quando não há disponibilidade por outros planejamentos
  getTooltipOutrosPlanejamentosSemana(usuario: any, semana: any, campo: string): string {
    let atributo = '';
    switch (campo) {
      case 'jornadaHabitual': atributo = 'jornadaHabitual'; break;
      case 'limiteHe': atributo = 'limiteHoraExtra'; break;
      case 'limiteHeJustificado': atributo = 'limiteHoraExtraJustificada'; break;
      case 'limiteHeEstendido': atributo = 'limiteHoraExtraEstendido'; break;
      default: atributo = campo;
    }

    const dias = this.getDiasElegiveisSemana(usuario, semana, campo);
    const partes: string[] = [];
    dias.forEach(date => {
      const itens = (usuario.planejamentosExistentes || []).filter((e: any) => e.dtPlanejamento === date);
      itens.forEach((p: any) => partes.push(`${p.nomePlanejamento}: ${p[atributo]}`));
    });

    return partes.length ? `Quantidade lançada em outros planejamentos - ${partes.join(' | ')}` : 'Sem disponibilidade';
  }
}
