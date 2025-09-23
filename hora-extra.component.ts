import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { GenericService } from '../../services/generic.service';

@Component({
  selector: 'app-hora-extra',
  templateUrl: './hora-extra.component.html',
  styleUrls: ['./hora-extra.component.css']
})
export class HoraExtraComponent implements OnInit {

  showMode = 'search';
  listaUnidadeResponsavel = [];

  route: string = '/novo-hora-extra';

  formGroupParams: FormGroup;
  formGroup: FormGroup;

  listaAgrupamento: any[] = [];
  opcao: string = null;
  opcoesTipo: any[];
  listAutoEmpregado: any[] = [];
  displayedTitles: any[] = [];
  displayedColumns: any[] = [];

  displayedTitlesHst: any[] = [];
  displayedColumnsHst: any[] = [];

  displayButtons: any = {};

  typeOption: string;

  minDate: Date;
  heEdicao

  constructor(
    public service: GenericService,
    public fb: FormBuilder
  ) { }

  ngOnInit() {
    this.service.url = environment["sipgc-api"];
    this.displayedTitles = ['Planejamento', 'Data de Início do Planejamento', 'Data de Encerramento do Planejamento', 'Situação Planejamento'];
    this.displayedColumns = ['planejamento', 'dtInicio', 'dataEncerramento', 'situacaoPlanejamento'];
    this.displayButtons['top'] = ['search', 'clean'];
    this.displayButtons['table'] = ['showEdit', 'delete', 'download', 'edit'];
    this.createForme();
    this.getTipoAgrupamento()
    this.getListaCapitulo();
    this.geCarteiras();
    this.getUnidades()
  }

  getTipoAgrupamento() {
    this.service.url = environment["sipgc-api"]
    this.service.route = '/tipo-agrupamento'

    this.service.get({})
      .subscribe(
        (rest) => {
          this.opcoesTipo = rest
        })
  }

  getUnidades() {
    this.service.url = environment["sipgc-api"]
    this.service.route = '/util/unidade-sem-agencia'

    this.listaUnidadeResponsavel = []
    this.service.get({})
      .subscribe(
        (res) => {
          res.forEach(item => this.listaUnidadeResponsavel.push({ id: item['id'], description: item['id'] + ' - ' + item['descricao'] }))
        })
  }

  createForme() {
    this.formGroup = this.fb.group({
      id: null,
      unidade: '',
      tipoAgrupamento: '',
      agrupamento: '',
      matricula: '',
      matriculaDescricao: '',
      dataInicio: '',
      dataEncerramento: ''
    });

    this.formGroupParams = this.fb.group({
      id: null,
      unidade: '',
      unidadeDescricao: '',
      tipoAgrupamento: '',
      descricaoAgrupamento: '',
      agrupamento: '',
      matricula: '',
      matriculaDescricao: '',
      dataInicio: '',
      dataEncerramento: '',
    });
  }



  getListaCapitulo() {
    this.service.url = environment["sipgc-api"];
    this.service.route = '/capitulo'

    this.service.get({ status: 'A' })
      .subscribe(
        (res) => {
          res.forEach(item => {
            this.listaAgrupamento.push({
              id: item.id,
              descricao: item.descricao,
              tipo: item.tipoAgrupamento
            })
          })
        }
      )
  }

  back() {
    this.heEdicao = null; 
    this.displayButtons['top'] = ['search', 'clean'];
    this.displayButtons['table'] = ['showEdit', 'delete', 'download', 'edit'];
    this.showMode = 'search'
  }

  geCarteiras() {
    this.service.url = environment["siapp-api"]
    this.service.route = '/carteira'

    this.service.get({ status: 'A' })
      .subscribe(res => {
        res.forEach(item => {
          this.listaAgrupamento.push({
            id: item.id, descricao: item.descricao, tipo: 'Comunidade'
          })
        })
      },
        err => {
          console.error(err);
        }
      );
    this.service.url = environment["sipgc-api"];
  }


  listaAgrupamentoFiltered() {
    if (!this.opcao) {
      return this.listaAgrupamento;
    } else {
      return this.listaAgrupamento.filter(item => item['tipo'] === this.opcao);
    }
  }

  optionSelected(option) {
    this.opcao = option.descricao;
    this.typeOption = option;
    this.formGroupParams.patchValue({
      tipoAgrupamento: option.id,
      descricaoAgrupamento: this.opcao,
      agrupamento: ''
    });
  }

  agrupamentoSelecionado(option) {
    this.formGroupParams.patchValue({
      descricaoAgrupamento: option.tipo
    });
  }

  getEmpregado(empregado) {
    this.getEmpregados(empregado, 'empregado');
  }

  getEmpregados(empregado, type) {
    this.service.url = environment["sipgc-api"];
    this.service.route = '/util/empregado-terceirizado';
    if (empregado.length > 3) {
      this.service.get({ empregado: empregado })
        .subscribe(res => {
          this.listAutoEmpregado = [];
          if (res.length > 0) {
            res.filter(x => x.status === 'Sim')
              .forEach(item => {
                this.listAutoEmpregado.push({ id: item['matricula'], description: item['matricula'] + ' - ' + item['empregado'] });
              });
          }
        },
          err => {
            console.error(err);
          }
        );
    } else if (empregado.length < 4) {
      this.listAutoEmpregado = [];
    }
  }

  setEmpregado(descricao) {
    const itemSelected = this.listAutoEmpregado.find(empregado => empregado.description === descricao);
    this.formGroupParams.patchValue({
      matricula: itemSelected.id,
      matriculaDescricao: itemSelected.description,
    });
  }

  onchangeDtInicial(event) {
    this.minDate = new Date(event.value);
  }


  showModeEvent(evt) {
    if (evt == 'search') {
      this.heEdicao = null
    }
    this.showMode = evt;
  }


  dateChange(atributo, evt) {
    const data: Date = evt.value
    if (data) {
      this.formGroupParams.get(atributo).setValue(data.toISOString().split("T")[0])
      document.querySelector('#' + atributo)['value'] = data.toLocaleDateString()
    }
  }

}
