import { Component, Input, OnInit } from "@angular/core";
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from "@angular/forms";
import { environment } from "src/environments/environment";
import { GenericService } from "src/app/services/generic.service";
import { MatDialog } from "@angular/material";
import { DialogComponent } from "../../shared/dialog/dialog.component";
import { Output } from "@angular/core";
import { EventEmitter } from "@angular/core";
import { SelecaoEmpregadosComponent } from "../selecao-empregados/selecao-empregados.component";
import { SituacaoPlanejamento } from "../enum/situacao-planejamento.enum";
import { Router } from "@angular/router";

@Component({
  selector: "app-hora-extra-planejamento",
  templateUrl: "./hora-extra-planejamento.component.html",
  styleUrls: ["./hora-extra-planejamento.component.css"],
})
export class HoraExtraPlanejamentoComponent implements OnInit {
  routeCall: string = this.router.url.replace("/", "");

  formGroup: FormGroup;

  empregadosSelecionados = [];

  minDate: Date;
  maxDate: Date;

  dateRange = [];

  usuarioPlanejamento: any = [];

  planejamento: any = {};

  @Input() heEdicao;
  @Output()
  private backEvent = new EventEmitter();

  initialValue: string;

  status: string;
  situacaoPlanejamento = SituacaoPlanejamento;

  teveAlteracao = false;

  confirmacaoGestorSuperintendente = false;

  podeAprovarGestor = false;
  podeAprovarSuperintendente = false;

  exibirBotaoEnviarPlanejamento = false;
  exibirBotaoAprovacaoReprovacao = false;
  exibirBotaoAutorizacaoDesautorizacao = false;

  salvou = false;

  justificativaDesautorizacao: string;

  ROTA_HE = "nova-hora-extra";
  ROTA_GESTOR = "nova-hora-extra-gestor";
  ROTA_SUPERINTENDENTE = "nova-hora-extra-superintendente";

  constructor(
    public fb: FormBuilder,
    public service: GenericService,
    public dialog: MatDialog,
    public router: Router
  ) {}

  ngOnInit() {
    this.carregarDados(true);
  }

  carregarDados(carregarEmpregados = false) {
    this.createForme();
    this.empregadosSelecionados = [];
    this.status = null;
    if (this.heEdicao) {
      this.status = this.heEdicao.situacaoPlanejamento.status;
      this.confirmacaoGestorSuperintendente = !!this.heEdicao.observacao;
      this.minDate = this.heEdicao.dtInicio
        ? new Date(this.heEdicao.dtInicio)
        : new Date(this.heEdicao.dataInicio);
      this.maxDate = new Date(this.heEdicao.dataEncerramento);
      this.justificativaDesautorizacao =
        this.heEdicao.justificativaDesautorizacao;
      if (carregarEmpregados) {
        this.getEmpregadosAssociados();
      }
    }
    this.verificaPermissoes();
  }

  verificaPermissoes() {
    const menuHoraExtra = "Hora Extra";
    const subMenuHoraExtraGestor = "Nova Hora Extra - Gestor".toUpperCase();
    const subMenuHoraExtraSuperintendente =
      "Nova Hora Extra - Superintendente".toUpperCase();

    const menusList = environment.menu.find(
      (m) => m.description == menuHoraExtra
    );
    if (menusList && menusList.subMenu) {
      const subMenuListGestor = menusList.subMenu.find(
        (s) => s.description.toUpperCase() == subMenuHoraExtraGestor
      );
      if (subMenuListGestor && subMenuListGestor.eventos) {
        this.podeAprovarGestor = subMenuListGestor.eventos.salvar;
      }

      const subMenuListSuperintendente = menusList.subMenu.find(
        (s) => s.description.toUpperCase() == subMenuHoraExtraSuperintendente
      );
      if (subMenuListSuperintendente && subMenuListSuperintendente.eventos) {
        this.podeAprovarSuperintendente =
          subMenuListSuperintendente.eventos.salvar;
      }
    }

    this.exibirBotaoEnviarPlanejamento =
      (this.status == SituacaoPlanejamento.RASCUNHO ||
        this.status == SituacaoPlanejamento.REPROVADO ||
        this.status == SituacaoPlanejamento.DESAUTORIZADO) &&
      this.routeCall == this.ROTA_HE;
    this.exibirBotaoAprovacaoReprovacao =
      this.routeCall == this.ROTA_GESTOR &&
      this.podeAprovarGestor &&
      this.status == SituacaoPlanejamento.PENDENTE_GESTOR;
    this.exibirBotaoAutorizacaoDesautorizacao =
      this.routeCall == this.ROTA_SUPERINTENDENTE &&
      this.podeAprovarSuperintendente &&
      this.status == SituacaoPlanejamento.PENDENTE_SUPERINTENDENTE;
  }

  back() {
    this.backEvent.emit();
  }

  createForme() {
    this.formGroup = this.fb.group({
      id: [this.heEdicao && this.heEdicao.id ? this.heEdicao.id : ""],
      nomePlanejamento: [
        this.heEdicao
          ? this.heEdicao.planejamento
            ? this.heEdicao.planejamento
            : this.heEdicao.nomePlanejamento
          : "",
        Validators.required,
      ],
      descricao: [
        this.heEdicao
          ? this.heEdicao.dePlanejamento
            ? this.heEdicao.dePlanejamento
            : this.heEdicao.descricao
          : "",
        Validators.required,
      ],
      dataInicio: [
        this.heEdicao
          ? this.heEdicao.dtInicio
            ? this.heEdicao.dtInicio
            : this.heEdicao.dataInicio
          : "",
        Validators.required,
      ],
      dataEncerramento: [
        this.heEdicao && this.heEdicao.dataEncerramento
          ? this.heEdicao.dataEncerramento
          : "",
        Validators.required,
      ],
      observacao: [
        this.heEdicao && this.heEdicao.observacao
          ? this.heEdicao.observacao
          : "",
        Validators.maxLength(300),
      ],
      planejamentosNovos: "",
      usuarioAlteracao: environment.perfil["matricula"],
      justificativaDesautorizacao: [
        this.heEdicao && this.heEdicao.justificativaDesautorizacao
          ? this.heEdicao.justificativaDesautorizacao
          : "",
        Validators.maxLength(300),
      ],
      usuarioCriacao:
        !this.heEdicao || !this.heEdicao.id
          ? environment.perfil["matricula"]
          : null,
    });

    this.initialValue = JSON.stringify(this.formGroup.value);

    this.formGroup.statusChanges.subscribe((t) => {
      const currentValue = JSON.stringify(this.formGroup.value);

      if (this.initialValue != currentValue) {
        this.teveAlteracao = true;
      }

      this.initialValue = currentValue;
    });
  }

  onchangeDtInicial(event) {
    this.planejamento.usuarioPlanejamento = [];
    this.minDate = new Date(event.value);
    this.maxDate = null;
    this.formGroup.patchValue({
      dataEncerramento: "",
    });
  }

  onchangeDtFim(event) {
    this.maxDate = new Date(event.value);
  }

  private validateTypeDate(dataChanged: string) {
    this.formGroup.patchValue({
      dataReferencia: dataChanged,
    });
  }

  getEmpregadosAssociados() {
    this.service.url = environment["sipgc-api"];
    this.service.route = "/novo-hora-extra/empregados";

    if (this.minDate && this.maxDate) {
      this.service
        .get({
          dataIni: this.minDate,
          dataFim: this.maxDate,
          idPlanejamento: this.heEdicao ? this.heEdicao.id : null,
        })
        .subscribe(
          (res) => {
            this.usuarioPlanejamento = res;
            this.planejamento.usuarioPlanejamento = res;
          },
          (err) => {
            this.dialog.open(DialogComponent, {
              data: {
                type: "error",
                err: err,
              },
            });
          }
        );
      this.service.url = environment["sipgc-api"];
    }
  }

  saveIsInvalid() {
    if (
      this.formGroup.get("nomePlanejamento").value !== "" &&
      this.formGroup.get("descricao").value !== "" &&
      this.formGroup.get("dataInicio").value !== "" &&
      this.formGroup.get("dataEncerramento").value !== ""
    ) {
      return false;
    }
    return true;
  }

  limpaCampos() {
    this.formGroup.patchValue({
      id: null,
      nomePlanejamento: "",
      descricao: "",
      dataInicio: "",
      dataEncerramento: "",
      planejamentosNovos: "",
    });

    this.planejamento = {};
    this.usuarioPlanejamento = [];
  }

  save() {
    let planejadosParaSalvar = JSON.parse(JSON.stringify(this.planejamento));
    let planejadosArray = [];

    if (
      planejadosParaSalvar &&
      planejadosParaSalvar["usuarioPlanejamento"].length > 0
    ) {
      for (let element of planejadosParaSalvar["usuarioPlanejamento"]) {
        if (element["planejamentos"].length > 0) {
          let itemParaSalvar = {
            matricula: "",
            limiteHe: 0,
            limiteHeEstendido: 0,
            jornadaHabitual: 0,
            limiteHeJustificado: 0,
            nomeEmpregado: "",
            nomePlanejamento: "",
            valorDiurno: "",
            valorNoturno: "",
            feriados: "",
            diasPlanejados: [],
          };

          itemParaSalvar.matricula = element.matricula;
          itemParaSalvar.valorDiurno = element.valorDiurno;
          itemParaSalvar.valorNoturno = element.valorNoturno;
          itemParaSalvar.feriados = element.feriados;
          itemParaSalvar.limiteHe = element.limiteHe;
          itemParaSalvar.limiteHeEstendido = element.limiteHeEstendido;
          itemParaSalvar.limiteHeJustificado = element.limiteHeJustificado;
          itemParaSalvar.jornadaHabitual = element.jornadaHabitual;
          itemParaSalvar.nomeEmpregado = element.nome;
          itemParaSalvar.nomePlanejamento = element.nomePlanejamento;

          itemParaSalvar.diasPlanejados = element["planejamentos"].filter(
            (item) => item.alterado == true
          );

          if (itemParaSalvar.diasPlanejados.length > 0) {
            planejadosArray.push(itemParaSalvar);
          }
        }
      }
    }

    this.formGroup.patchValue({
      planejamentosNovos: planejadosArray,
      id: this.formGroup.get("id").value,
      nomePlanejamento: this.formGroup.get("nomePlanejamento").value,
      descricao: this.formGroup.get("descricao").value,
      dataInicio: this.formGroup.get("dataInicio").value,
      dataEncerramento: this.formGroup.get("dataEncerramento").value,
    });

    // this.planejamento = JSON.parse(JSON.stringify(planejadosParaSalvar))

    environment.progressBar = "indeterminate";
    this.service.route = "/novo-hora-extra/";
    let value = this.formGroup.value;
    if (
      this.routeCall == this.ROTA_GESTOR ||
      this.routeCall == this.ROTA_SUPERINTENDENTE
    ) {
      value.podeEditar = true;
    }
    this.saveOrUpdate(value).subscribe(
      (res) => {
        environment.progressBar = "determinate";
        this.teveAlteracao = false;
        this.dialog.open(DialogComponent, {
          data: {
            type: "save",
          },
        });
        this.salvou = true;

        if (this.routeCall == this.ROTA_HE) {
          this.limpaCampos();
          this.back();
        } else {
          value.situacaoPlanejamento = { status: this.status };
          this.heEdicao = value;
          this.carregarDados();
        }
      },
      (err) => {
        environment.progressBar = "determinate";
        this.dialog.open(DialogComponent, {
          data: {
            type: "error",
            err: err,
          },
        });
      }
    );
  }

  send() {
    this.service.route = "/novo-hora-extra/enviar-planejamento";
    return this.service.put(this.formGroup.value).subscribe(
      (res) => {
        this.limpaCampos();
        this.carregarDados();
        environment.progressBar = "determinate";
        this.teveAlteracao = false;
        this.dialog.open(DialogComponent, {
          data: {
            type: "save",
          },
        });
        this.salvou = true;
        this.backEvent.emit();
      },
      (err) => {
        environment.progressBar = "determinate";
        this.dialog.open(DialogComponent, {
          data: {
            type: "error",
            err: err,
          },
        });
      }
    );
  }

  aprovar() {
    this.updateStatus(SituacaoPlanejamento.PENDENTE_SUPERINTENDENTE);
  }

  reprovar() {
    this.updateStatus(SituacaoPlanejamento.REPROVADO);
  }

  autorizar() {
    this.updateStatus(SituacaoPlanejamento.AUTORIZADO);
  }

  desautorizar() {
    this.updateStatus(SituacaoPlanejamento.DESAUTORIZADO);
  }

  updateStatus(status) {
    this.service.route = "/novo-hora-extra/status/" + status;
    let body = this.formGroup.value;
    body.statusPlanejamento = status;
    body.dataAlteracao = new Date(
      new Date().getTime() - new Date().getTimezoneOffset() * 60000
    )
      .toISOString()
      .replace(/[ZT]/g, " ");
    return this.service.put(body).subscribe(
      (res) => {
        environment.progressBar = "determinate";
        this.teveAlteracao = false;
        this.dialog.open(DialogComponent, {
          data: {
            type: "save",
          },
        });
        this.salvou = true;
        if (this.routeCall == this.ROTA_HE) {
          this.limpaCampos();
          this.back();
        } else {
          body.situacaoPlanejamento = status;
          this.heEdicao = body;
          this.carregarDados();
        }
      },
      (err) => {
        environment.progressBar = "determinate";
        this.dialog.open(DialogComponent, {
          data: {
            type: "error",
            err: err,
          },
        });
      }
    );
  }

  saveOrUpdate(value) {
    if (value.id && value.id != "") {
      return this.service.put(value);
    }
    value.id = null;
    return this.service.post(value);
  }

  openSelecaoEmpregados() {
    let dialogRef = this.dialog.open(SelecaoEmpregadosComponent, {
      width: "1100px",
      minHeight: "400px",
      data: {
        minDate: this.minDate,
        maxDate: this.maxDate,
      },
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (result && result.length > 0) {
        result.forEach((r) => {
          this.planejamento.usuarioPlanejamento.push({
            ...r,
            planejamentos: [],
          });
        });
        this.planejamento = { ...this.planejamento };
        this.planejamento.usuarioPlanejamento = [
          ...this.planejamento.usuarioPlanejamento,
        ];
      }
    });
  }

  planejamentoChanged() {
    this.planejamento = { ...this.planejamento };
  }

  empregadosChanged(empregados) {
    this.empregadosSelecionados = empregados;
  }

  excluirEmpregadosSelecionados() {
    if (!this.heEdicao || !this.heEdicao.id) {
      this.removerEmpregadosArray();
      return;
    }
    this.service.url = environment["sipgc-api"];
    this.service.route = "/novo-hora-extra/remover-empregados";

    this.service
      .post({
        usuarioAlteracao: environment.perfil["matricula"],
        empregados: this.empregadosSelecionados,
        idPlanejamento: this.heEdicao ? this.heEdicao.id : null,
      })
      .subscribe(
        (res) => {
          this.removerEmpregadosArray();
          this.dialog.open(DialogComponent, {
            data: {
              type: "warn",
              message: "Registros apagados com sucesso.",
            },
          });
        },
        (err) => {
          this.dialog.open(DialogComponent, {
            data: {
              type: "error",
              err: err,
            },
          });
        }
      );
  }

  removerEmpregadosArray() {
    this.empregadosSelecionados.forEach((e) => {
      const index = this.planejamento.usuarioPlanejamento.findIndex(
        (u) => u.matricula == e
      );
      if (index != -1) {
        this.planejamento.usuarioPlanejamento.splice(index, 1);
      }
    });
    this.empregadosSelecionados = [];
    this.planejamento.usuarioPlanejamento = [
      ...this.planejamento.usuarioPlanejamento,
    ];
    this.planejamento = { ...this.planejamento };
  }

  podeAbrirModalSelecao() {
    return this.minDate && this.maxDate;
  }

  onChangeHoraJustificada(horaJustificada) {
    if (horaJustificada > 0) {
      this.formGroup.controls["observacao"].setValidators([
        Validators.required,
      ]);
    } else {
      this.formGroup.controls["observacao"].setValidators([]);
    }
    this.formGroup.controls["observacao"].updateValueAndValidity();
  }

  onObsChange(text: string) {
    if (text && text.length > 300) {
      text = text.substring(0, 300);
      this.formGroup.get("observacao").setValue(text);
    }
  }
  onJustificativaDesautorizacaoChange(event) {
    this.justificativaDesautorizacao = event.target.value;
  }
}
