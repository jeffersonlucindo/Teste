import { EnventService } from './../../../services/envent.service';
import { Component, OnInit, HostListener, ChangeDetectorRef } from '@angular/core';
import { Input } from '@angular/core';
import { Output } from '@angular/core';
import { EventEmitter } from '@angular/core';
import { MatTableDataSource, MatPaginator, MatSort, MatDialog, Sort } from '@angular/material';
import { ViewChild } from '@angular/core';
import { DialogComponent } from '../dialog/dialog.component';
import { FormBuilder, FormGroup } from '@angular/forms';
import { mask } from '../../../utils/masks';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import * as jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { AlertService } from "../../../services/alert.service";
import { OnChanges } from '@angular/core';
import { SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-crud',
  templateUrl: './crud.component.html',
  styleUrls: ['./crud.component.css']
})
export class CrudComponent implements OnInit, OnChanges {

  @Input()
  service: any;


  @Input()
  displayedColumns: string[];

  @Input()
  columnDescription: string;

  @Input()
  displayedTitles: string[];

  @Input()
  displayedColumnsHst: string[];

  @Input()
  displayedTitlesHst: string[];

  @Input()
  pageSize: number = 5;

  @Input()
  pageSizeOptions: number[] = [5, 10, 20, 40, 60, 80, 100];

  @Input()
  type: string;

  @Input()
  showMode: string;

  @Output()
  showModeEvent = new EventEmitter(true);

  @Output()
  showModeEventType = new EventEmitter(true);

  @Input()
  formGroupParams: FormGroup;

  @Input()
  formGroup: FormGroup;

  @Input()
  customizedButtonLabel: string = '';

  @Input()
  startSearching: boolean = false;

  @Input()
  fileName: string = '';

  @Input()
  titleFile: string = '';

  @Input()
  isNotDateTime: boolean = false;

  @Input()
  emitDelete: boolean = false;

  @Input()
  custoDelete: boolean = false;

  @Input()
  deleteTypeMessage: string = '';

  @Input()
  messageDelete: boolean = false;

  @Input()
  isChildCrud: boolean = false;

  @Input()
  validateMembros: boolean = false;

  @Input()
  searchValidateDisable: boolean

  @Input()
  hasPermissionToEdit: boolean

  @Input()
  hasPermissionToDelete: boolean

  @Output()
  deleteRows = new EventEmitter();

  @Output()
  customizedEvent = new EventEmitter(true);

  @Output()
  showEdit = new EventEmitter<any>(true);

  @Output()
  showHistoric = new EventEmitter<any>();

  @Output()
  showSearch = new EventEmitter();

  @Output()
  clean = new EventEmitter(true);

  @Output()
  beforeSave = new EventEmitter(true);

  @Output()
  saveCustom = new EventEmitter();

  @Output()
  afterSave = new EventEmitter(true);

  @Output()
  beforeSearch = new EventEmitter(true);

  @Output()
  afterSearch = new EventEmitter(true);

  @Output()
  beforeEdit = new EventEmitter(true);

  @Output()
  afterEdit = new EventEmitter(true);

  @Output()
  beforeDelete = new EventEmitter(true);

  @Output()
  afterDelete = new EventEmitter(true);

  dataSource = new MatTableDataSource();

  rowSelected: any = null;

  showProgressBar: string;

  display: string = 'none';

  innerWidth: any;

  idEdit: any;

  @Input()
  displayButtons: any = {
    top: [],
    table: []
  };

  @Input()
  route: string = '';

  @ViewChild(MatPaginator) paginator: MatPaginator;

  @ViewChild(MatSort) sort: MatSort;

  checkedAll: boolean = false;

  rowsSelected: any[] = [];

  listHistoric: any[] = [];

  fieldsHistoric: any = { evento: null, dataAlteracaoIni: null, dataAlteracaoFim: null };

  mask: any = mask;

  downloadType: any[] = ['PDF', 'XML'];

  @Input()
  cleanSearchParams: boolean = true;

  formGroupHistoricParams: FormGroup;

  @Output()
  afterRowsSelected = new EventEmitter(true);

  @Input()
  footerRow: any[] = [];

  @Input()
  shouldSearchOnLoad: boolean = false;

  constructor(
    public dialog: MatDialog,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    public fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private alertService: AlertService,
    private eventSevice: EnventService
  ) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes && changes.displayButtons) {
      this.eventControl()
    }
    if (this.shouldSearchOnLoad && !this.isChildCrud) {
      this.pageSize = 100;
      this.search();
    }
  }

  ngOnInit() {
    this.showButtonsTable();
    this.innerWidth = window.innerWidth;
    // this.showMode = 'search';
    this.createForm();
  }

  ngAfterViewInit() {
    this.translatePaginator();
    if (this.startSearching == true && this.showMode == 'search') {
      this.search();
    }
  }

  ngAfterViewChecked() {
    this.cdr.detectChanges();
  }

  createForm() {
    this.formGroupHistoricParams = this.fb.group({
      evento: null,
      dataAlteracaoIni: null,
      dataAlteracaoFim: null
    });
  }

  translatePaginator() {
    const portugueseRangeLabel = (page: number, pageSize: number, length: number) => {
      if (length == 0 || pageSize == 0) { return `0 de ${length}`; }

      length = Math.max(length, 0);

      const startIndex = page >= 0 ? page * pageSize : 0;

      const endIndex = startIndex < length ?
        Math.min(startIndex + pageSize, length) :
        startIndex + pageSize;

      return `${startIndex + 1} - ${endIndex} de ${length}`;
    }
    if (this.paginator) {
      this.paginator._intl.itemsPerPageLabel = 'Itens por página';
      this.paginator._intl.nextPageLabel = 'Próxima página';
      this.paginator._intl.previousPageLabel = 'Página anterior'
      this.paginator._intl.getRangeLabel = portugueseRangeLabel;
    }
  }

  search() {
    this.beforeSearch.emit(this.formGroupParams);

    let params = {};
    params = this.formGroupParams.value;
    this.service.route = this.route != '' ? this.route : this.service.route;
    if (this.showMode == 'historic') {
      this.service.route = this.service.route + '/hst';

      params['evento'] = this.formGroupHistoricParams.value['evento']
      params['dataAlteracaoIni'] = this.formGroupHistoricParams.value['dataAlteracaoIni'] !== null ? `${this.formGroupHistoricParams.value['dataAlteracaoIni'].substr(0, 10)} 00:00:00` : this.formGroupHistoricParams.value['dataAlteracaoIni'];
      params['dataAlteracaoFim'] = this.formGroupHistoricParams.value['dataAlteracaoFim'] !== null ? `${this.formGroupHistoricParams.value['dataAlteracaoFim'].substr(0, 10)} 23:59:59` : this.formGroupHistoricParams.value['dataAlteracaoFim'];

      if (this.rowsSelected[0]) {
        params['id'] = this.rowsSelected[0].id
      }

      if (!this.displayedColumnsHst.includes('evento')) {
        this.displayedTitlesHst = [...['id', 'data da alteração', 'usuário da alteração', 'evento'], ...this.displayedTitlesHst];
        this.displayedColumnsHst = [...['id', 'dataAlteracao', 'usuarioAlteracao', 'evento'], ...this.displayedColumnsHst];
      }
    }

    this.dataSource.data = [];
    this.listHistoric = [];

    this.rowSelected = null;
    this.rowsSelected = [];
    setTimeout(() => {
      this.showProgressBar = 'indeterminate';
    }, 500);

    this.service.get(params)
      .subscribe(
        data => {
          this.display = '';
          this.dataSource.data = data;

          if ((data.length === 0 && this.startSearching == false) || (data.length === 0 && this.showMode == 'historic')) {
            this.dialog.open(DialogComponent, {
              data: {
                type: 'warn',
                message: 'Nenhum registro localizado',
                color: 'primary'
              }
            });
            this.dataSource.data = [];
            this.listHistoric = [];
          } else {
            if (this.showMode == 'historic') {
              this.listHistoric = data;
              if (this.listHistoric.length > 0) {
                this.listHistoric.map(item => {
                  item['evento'] = item['evento'] == 'INSERT' ? 'INCLUSÃO' : item['evento'] == 'UPDATE' ? 'ALTERAÇÃO' : item['evento'] == 'DELETE' ? 'EXCLUSÃO' : item['evento'];
                });
              }
            } else if (this.displayButtons.table.length > 0) {
              this.dataSource.data = data;
              this.paginator.pageIndex = this.paginator.pageIndex >= 0 ? this.paginator.pageIndex : 0;
              this.dataSource.paginator = this.paginator;
            }

          }
          this.afterSearch.emit(data);
          setTimeout(() => {
            this.showProgressBar = 'determinate';
          }, 500);
        },
        err => {
          setTimeout(() => {
            this.showProgressBar = 'determinate';
            environment['progressBar'] = 'determinate';
          }, 1000);
          if (err['status'] !== 401) {
            this.dialog.open(DialogComponent, {
              data: {
                type: 'error',
                err: err
              }
            });
          }
        }
      )
  }

  saveCustomEvent() {
    this.saveCustom.emit();
  }

  save() {
    this.beforeSave.emit(this.formGroup.value);
    environment['progressBar'] = 'indeterminate';
    document.querySelector('mat-sidenav-content').scrollTo(0, 0);
    Object.keys(this.formGroup.controls).forEach(item => {
      this.formGroup.controls[item].markAsTouched();
    })
    if (this.formGroup.valid) {
      this.formGroup.value["dataAlteracao"] = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().replace(/[ZT]/g, ' ');
      this.formGroup.value["usuarioAlteracao"] = environment.perfil['matricula'];

      this.service.route = this.route != '' ? this.route : this.service.route;
      this.service.post(this.formGroup.value).subscribe(
        resp => {
          environment.progressBar = 'determinate';
          if (resp !== null && resp[0]['id'] !== null) {
            this.formGroup.patchValue({
              id: resp[0]['id']
            });
          } else {
            this.cleanEvent();
          }
          this.afterSave.emit(resp);
          this.dialog.open(DialogComponent, {
            data: {
              type: 'save'
            }
          });
        },
        err => {
          if (err['status'] !== '401') {
            environment['progressBar'] = 'determinate';
            this.dialog.open(DialogComponent, {
              data: {
                type: 'error',
                err: err
              }
            });
          }
        }
      )
    } else {
      this.dialog.open(DialogComponent, {
        data: {
          type: 'warn',
          message: 'Preencha todos os campos obrigatórios !'
        }
      });
    }
  }

  delete() {
    environment.progressBar = 'indeterminate';
    document.querySelector('mat-sidenav-content').scrollTo(0, 0);
    this.dialog.open(DialogComponent, {
      data: {
        type: this.custoDelete === true ? this.deleteTypeMessage : 'confirmDelete'
      }
    }).afterClosed().subscribe(
      resp => {
        environment.progressBar = 'determinate';
        if (resp === true) {
          if (this.emitDelete === true) {
            this.deleteRows.emit(this.rowsSelected);
          } else {
            this.beforeDelete.emit(this.rowsSelected);
            this.service.route = this.route != '' ? this.route : this.service.route;

            let sum = 0;
            this.rowsSelected.forEach(item => {
              item['dataAlteracao'] = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().replace(/[ZT]/g, ' ');
              item['usuarioAlteracao'] = environment.perfil['matricula'];

              this.service.delete(item.id, { body: item })
                .subscribe(
                  resp => {
                    sum++;
                    if (sum == this.rowsSelected.length) {
                      this.dialog.open(DialogComponent, {
                        data: {
                          type: 'delete'
                        }
                      });
                      this.afterDelete.emit(resp);
                      this.showSearchMode();
                      this.cleanEvent();
                    }
                  },
                  err => {
                    if (err['status'] !== '401') {
                      environment['progressBar'] = 'determinate';
                      this.dialog.open(DialogComponent, {
                        data: {
                          type: 'error',
                          err: err
                        }
                      });
                    }
                  })
            })
          }
        }
      });
  }

  selected(row) {
    if (row['background']) {
      delete row['background'];
      delete row['color'];
      this.rowsSelected.splice(this.rowsSelected.indexOf(row), 1);
      this.afterRowsSelected.emit(this.rowsSelected);
    } else {
      row['background'] = '#0277bd';
      row['color'] = 'white';
      this.rowsSelected.push(row);
      this.afterRowsSelected.emit(this.rowsSelected);
    }
  }

  selectAllEvent(evt) {
    this.rowsSelected = [];
    if (evt === true) {
      this.rowsSelected = [...this.dataSource.data];
      this.rowsSelected.map(row => {
        row['background'] = '#0277bd';
        row['color'] = 'white';
      });
      this.afterRowsSelected.emit(this.rowsSelected);
    } else {
      this.dataSource.data.map(row => {
        delete row['background'];
        delete row['color'];
      });
    }
  }

  showHistoricMode() {
    this.showMode = 'historic';
    this.showModeEvent.emit('historic');
    this.showHistoric.emit();

    this.showButtonsTable();

    if (this.rowsSelected.length > 0) {
      this.search();
    } else {
      if (!this.isChildCrud) {
        this.formGroup.reset();
        this.formGroupHistoricParams.reset();
      }
    }
    this.cleanEvent();
  }

  editMode() {
    this.showMode = 'edit';

    if (this.rowsSelected[0].id) {
      this.beforeEdit.emit(this.rowsSelected[0]);
      environment.progressBar = 'indeterminate';
      this.service.route = this.route != '' ? this.route : this.service.route;
      let args = {
        id: this.rowsSelected[0].id
      }
      if (this.rowsSelected[0]['itemPortifolio']) {
        args['itemPortifolio'] = this.rowsSelected[0]['itemPortifolio']
      }
      this.service.get(args)
        .subscribe(
          data => {
            this.formGroup.reset();
            if (this.validateMembros && this.membrosValido(data)) {
              this.alertService.show("Existem dados inconsistentes neste perfil! Exclua e crie um outro novo.")
            } else {

              this.finalizeEditmode(data);
            }
          },
          err => {
            this.dialog.open(DialogComponent, {
              data: {
                type: 'error',
                err: err
              }
            });
            environment.progressBar = 'determinate';
          }
        )
    }
  }

  membrosValido(data) {
    let validacao = false;
    if (data[0]['tipo'] === null || data[0]['idPapel'] === null) {
      validacao = true;
    }
    return validacao;
  }
  finalizeEditmode(data) {
    Object.keys(data[0]).forEach(chave => {
      this.formGroup.patchValue({
        [chave]: /\d{4}-\d{2}-\d{2}[\w,\s]\d{2}:\d{2}:\d{2}/.test(data[0][chave]) ? new Date(data[0][chave].substr(0, 19)) : data[0][chave]
      })
    })

    this.afterEdit.emit(this.formGroup);
    this.dataSource.data = [];
    this.rowSelected = null;
    this.rowsSelected = [];
    this.dataSource = new MatTableDataSource();
    this.showEdit.emit();
    this.showModeEvent.emit('edit');
    this.showModeEventType.emit('edit');
    window.scroll(-10, 0);
    environment.progressBar = 'determinate';
    this.showButtonsTable();
  }

  showEditMode() {
    document.querySelector('mat-sidenav-content').scrollTo(0, 0);
    this.showMode = 'edit';
    this.showModeEvent.emit('edit');
    this.showModeEventType.emit('new');
    this.showEdit.emit();
    this.cleanEvent();
    this.showButtonsTable();
  }

  showSearchMode() {
    document.querySelector('mat-sidenav-content').scrollTo(0, 0);
    this.showMode = 'search';
    this.showModeEvent.emit('search');
    if (this.isChildCrud) {
      this.search()
    } else {
      this.cleanEvent(this.cleanSearchParams);
    }
    this.showSearch.emit();
    this.showButtonsTable();
  }

  cleanEvent(cleanSearchParams?) {
    this.rowSelected = null;
    this.rowsSelected = [];
    this.listHistoric = [];
    this.dataSource.data = [];
    this.dataSource = new MatTableDataSource();
    // this.listHistoric = [];
    this.formGroup.reset();
    if (cleanSearchParams == undefined || cleanSearchParams == true) {
      this.formGroupParams.reset();
    }
    this.checkedAll = false;
    this.clean.emit();
    this.eventSevice.crudo_clean.emit();
    if (this.startSearching == true && this.showMode !== 'historic') {
      setTimeout(() => {
        this.search();
      }, 500);
    }
    this.formGroupHistoricParams.reset();
    this.showButtonsTable();
  }

  showButtonsTable() {

    if (this.showMode == 'historic') {
      this.downloadType = ['XML'];
    } else {
      this.downloadType = ['PDF', 'XML'];
    }

    if (this.type == 'tabular' || this.type == 'simple' || this.type == 'full' || this.type == 'tabularHst' || this.type == 'tabularHstNoEdit' || this.type == 'noEdit') {
      this.displayButtons.top = [];
      this.displayButtons.table = [];
    }

    if (this.type == 'tabular') {
      this.showMode = 'search'
      this.showModeEvent.emit('search');
      this.displayButtons.top = ['save', 'search', 'clean'];
      this.displayButtons.table = ['edit', 'delete', 'download'];
    } else if (this.type == 'tabularHst') {
      this.showMode = this.showMode !== 'historic' ? 'search' : this.showMode;
      if (this.showMode == 'historic') {
        this.displayButtons.table = [];
      } else {
        this.displayButtons.top = ['save', 'search', 'clean'];
        this.displayButtons.table = ['edit', 'historic', 'delete', 'download'];
      }
    } else if (this.type == 'tabularHstNoEdit') {
      this.showMode = this.showMode !== 'historic' ? 'search' : this.showMode;
      if (this.showMode == 'historic') {
        this.displayButtons.table = [];
      } else {
        this.displayButtons.top = ['save', 'search', 'clean'];
        this.displayButtons.table = ['historic', 'delete', 'download'];
      }
    } else if (this.type == 'simple') {
      if (this.showMode == 'edit') {
        this.displayButtons.top = ['save', 'clean'];
        this.displayButtons.table = [];
      } else if (this.showMode == 'search') {
        this.displayButtons.top = ['searchValidated', 'clean'];
        this.displayButtons.table = ['showEdit', 'edit', 'delete', 'download'];
      }
    } else if (this.type == 'full') {
      if (this.showMode == 'edit') {
        this.displayButtons.top = ['save', 'clean'];
        this.displayButtons.table = [];
      } else if (this.showMode == 'search') {
        this.displayButtons.top = ['searchValidated', 'clean'];
        this.displayButtons.table = ['showEdit', 'historic', 'edit', 'delete', 'download'];
      } else if (this.showMode == 'historic') {
        // this.displayButtons.top = ['search', 'clean', 'exitHistoric', 'download'];
        this.displayButtons.table = [];
      }
    } else if (this.type == 'fullSaveCuston') {
      if (this.showMode == 'edit') {
        this.displayButtons.top = ['saveButtonCuston', 'clean'];
        this.displayButtons.table = [];
      } else if (this.showMode == 'search') {
        this.displayButtons.top = ['searchValidated', 'clean'];
        this.displayButtons.table = ['showEdit', 'historic', 'edit', 'delete', 'download'];
      } else if (this.showMode == 'historic') {
        // this.displayButtons.top = ['search', 'clean', 'exitHistoric', 'download'];
        this.displayButtons.table = [];
        this.displayButtons.top = []

      }
    } else if (this.type == 'report') {
      this.showMode = 'search'
      this.displayButtons.top = ['searchValidated', 'clean'];
      this.displayButtons.table = ['download'];
    } else if (this.type == 'control') {
      if (this.showMode == 'edit') {
        this.displayButtons.top = ['save', 'clean'];
        this.displayButtons.table = [];
      } else if (this.showMode == 'search') {
        this.displayButtons['top'] = ['search', 'clean'];
        this.displayButtons['table'] = ['showEdit', 'delete', 'download', 'edit', 'historic'];
      } else if (this.showMode == 'historic') {
        this.displayButtons.table = [];
      }
    } else if (this.type == 'noEdit') {
      this.showMode = this.showMode !== 'historic' ? 'search' : this.showMode;
      if (this.showMode == 'historic') {
        this.displayButtons.table = [];
      } else {
        this.displayButtons.top = ['save', 'search', 'clean'];
        this.displayButtons.table = ['', 'delete'];
      }
    }

    this.eventControl();
  }

  eventControl() {
    var evt = {};
    environment.menu.forEach(menu => {
      menu.subMenu.forEach(subMenu => {
        if (subMenu.route == this.router.url.replace('/', '') && environment['titleRoute'] == subMenu['description']) {
          evt = subMenu.eventos;
        }
      })
    });

    if (evt['salvar'] == false && this.displayButtons.top.includes('save')) {
      this.displayButtons.top.splice(this.displayButtons.top.indexOf('save'), 1);
    } else if (evt['salvar'] == false && this.displayButtons.table.includes('showEdit')) {
      this.displayButtons.table.splice(this.displayButtons.table.indexOf('showEdit'), 1);
    }

    if (evt['editar'] == false && this.displayButtons.top.includes('save') && this.formGroup.value['id'] !== null && this.formGroup.value['id'] !== undefined) {
      this.displayButtons.top.splice(this.displayButtons.top.indexOf('save'), 1);
    } else if (
      evt['editar'] == true
      && !this.displayButtons.top.includes('save')
      && !this.displayButtons.top.includes('saveButtonCuston')
      && !this.displayButtons.top.includes('saveButtonCustonValidade')
      && this.formGroup.value['id'] !== null
      && this.formGroup.value['id'] !== undefined
    ) {
      //this.displayButtons.top.push('save');
    }

    if (evt['pesquisar'] == false && this.displayButtons.top.includes('search')) {
      this.displayButtons.top.splice(this.displayButtons.top.indexOf('search'), 1);
    }

    if (evt['pesquisar'] == false && this.displayButtons.table.includes('edit')) {
      this.displayButtons.table.splice(this.displayButtons.table.indexOf('edit'), 1);
    }

    if (evt['pesquisar'] == false && this.displayButtons.top.includes('searchValidated')) {
      this.displayButtons.top.splice(this.displayButtons.top.indexOf('searchValidated'), 1);
    }

    if (evt['excluir'] == false && this.displayButtons.table.includes('delete')) {
      this.displayButtons.table.splice(this.displayButtons.table.indexOf('delete'), 1);
    }
  }

  isDate(value) {
    return mask.dateList(value);
  }

  isDateTime(value) {
    return mask.dateTime(value);
  }

  descriptionFormatted(value, columnDescription: boolean) {
    let maxLength = columnDescription ? 70 : 30
    if (value != null) {
      if (value.length > maxLength) {
        return this.displayedColumns.length > 4 ? (value.toString().substr(0, maxLength) + '...').trim() : value.toString().trim();
      } else {
        return this.isDate(value)
      }
    } else {
      return '';
    }
  }

  tooltipReturn(value) {
    if (value != null) {
      if (value.tooltipValue) {
        return value.tooltipValue
      }
      if (value.length > 30) {
        return value;
      } else {
        return '';
      }
    }
  }

  @HostListener('window:resize', ['$event'])
  onResize(event) {
    this.innerWidth = window.innerWidth;
  }

  sortData(sort: Sort) {
    this.dataSource.data = this.dataSource.data.sort((a: any, b: any) => {
      if (!isNaN(a[sort.active])) {
        const isAsc = sort.direction === 'asc';
        const aNumber = Number(a[sort.active]);
        const bNumber = Number(b[sort.active]);
        return this.compareNumber(aNumber, bNumber, isAsc);
      } else {
        return this.compare(a[sort.active] !== null ? a[sort.active].toString().toUpperCase() : '', b[sort.active] !== null ? b[sort.active].toString().toUpperCase() : '', sort.direction === 'asc');
      }
    });
  }


  compareNumber(a: number, b: number, isAsc: boolean): number {
    return (a - b) * (isAsc ? 1 : -1);
  }

  compare(a: string, b: string, isAsc: boolean): number {
    return (a > b ? 1 : -1) * (isAsc ? 1 : -1);
  }

  customizedButtonEvent() {
    this.customizedEvent.emit(this.rowsSelected);
    this.cleanEvent();
  }

  generateExcel() {
    let sourceData = [];
    let titles = [];
    let columns = []
    let data = [];
    let fileName = environment['titleRoute'];

    if (this.showMode == 'historic') {
      sourceData = this.listHistoric;
      titles = this.displayedTitlesHst;
      columns = this.displayedColumnsHst;
      fileName += ' (HST)';
    } else {
      sourceData = this.dataSource.data;
      titles = this.displayedTitles;
      columns = this.displayedColumns;
    }

    sourceData.forEach(itemData => {
      let obj = {};
      titles.forEach(item => obj[item.toUpperCase()] = '');
      Object.keys(itemData).forEach(item => {
        columns.forEach((columnsItem, idx) => {
          if (columnsItem == item && itemData[item] && !itemData[item].isButton) {
            obj[titles[idx].toUpperCase()] = itemData[item] !== null ? (this.isNotDateTime == true ? this.isDate(itemData[item]) : this.isDateTime(itemData[item])) : '';
          }
        })
      });
      data.push(obj);
    });

    let obj = this.getObjectFooter(titles);
    if (!!obj) {
      data.push(obj);
    }

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);

    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    if (!!this.titleFile) {
      XLSX.utils.book_append_sheet(wb, ws, this.titleFile);
    } else {
      XLSX.utils.book_append_sheet(wb, ws, 'Relatorio');
    }

    if (!!this.fileName) {
      XLSX.writeFile(wb, `${this.fileName}.xlsx`);
    } else {
      XLSX.writeFile(wb, `${fileName}.xlsx`);
    }
  }

  getObjectFooter(titles) {
    let obj = {};
    if (this.footerRow.length > 0) {
      this.displayedColumns.forEach((displayedColumnsItem, idx) => {
        if (idx === 0) {
          obj[`${titles[idx].toUpperCase()}`] = 'TOTAL';
        }
        if (idx === this.displayedColumns.length - 1) {
          obj[`${titles[idx].toUpperCase()}`] = this.footerRow[0];
        }
        if (idx > 0 && idx < this.displayedColumns.length - 1) {
          obj[`${titles[idx].toUpperCase()}`] = '';
        }
      });
    }
    return obj;
  }

  generatePdf() {
    var doc = new jsPDF(this.displayedTitles.length > 5 ? "landscape" : "");
    let data = [];
    let StyleDef = { fontSize: 7, cellWidth: 'auto', overflow: 'linebreak', minCellWidth: 20 }

    this.dataSource.data.forEach(itemData => {
      let obj = {};
      this.displayedTitles.forEach(item => obj[item.toUpperCase()] = '');
      Object.keys(itemData).forEach(item => {
        itemData[item] = itemData[item] !== null ? itemData[item] : '';
        this.displayedColumns.forEach((displayedColumnsItem, idx) => {
          if (displayedColumnsItem == item && itemData[item] && !itemData[item].isButton) {
            obj[this.displayedTitles[idx].toUpperCase()] = itemData[item] !== null ? (this.isNotDateTime ? this.isDate(itemData[item]) : this.isDateTime(itemData[item])) : '';
          }
        })
      });
      data.push(Object.values(obj));
    });
    let obj = this.getObjectFooter(this.displayedTitles);
    if (!!obj) {
      data.push(Object.values(obj));
    }

    doc.autoTable({
      head: [this.displayedTitles.map(item => item.toUpperCase())],
      body: data,
      styles: StyleDef,
      margin: { top: 30 },
      didDrawPage: (data) => {
        doc.setFontSize(15);
        if (!!this.titleFile) {
          doc.text(this.titleFile, data.settings.margin.left, 20);
        } else {
          doc.text(environment['titleRoute'], data.settings.margin.left, 20);
        }

        var str = "Pagina " + doc.internal.getNumberOfPages()
        doc.setFontSize(9);
        doc.setTextColor(150);

        var pageSize = doc.internal.pageSize;
        var pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
        doc.text(str, data.settings.margin.left, pageHeight - 10);
      }
    });
    if (!!this.fileName) {
      doc.save(`${this.fileName}.pdf`)
    } else {
      doc.save(`${environment['titleRoute']}.pdf`)
    }
  }

}
