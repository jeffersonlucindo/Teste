import { Component, Inject, Input, OnDestroy, OnInit, ViewEncapsulation, OnChanges, SimpleChanges } from '@angular/core';
import { RouterOutlet, Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { AsyncPipe, DOCUMENT, NgIf, NgFor } from '@angular/common';

import { Subject, takeUntil, filter } from 'rxjs';

import { DscHeaderComponent } from 'sidsc-components/dsc-header';
import { DscMenu, DscSidenavComponent } from 'sidsc-components/dsc-sidenav';
import { DscButtonComponent } from 'sidsc-components/dsc-button';


import { PageHeaderComponent } from '../shared/page-header/page-header.component';
import { SidscPortalBreakpointService } from '../../core/services/media-breakpoint/sidsc-portal-breakpoint.service';
import { AccessLevel } from '../layout.component';
import { DscBreadcrumbComponent } from 'sidsc-components/dsc-breadcrumb';
import { DscBreadcrumbItem } from 'sidsc-components/dsc-breadcrumb';
import { Footer } from '../shared/footer/footer';
import { DscTabComponent, DscTabGroupComponent } from 'sidsc-components/dsc-tab-group';
import { MatTabChangeEvent } from '@angular/material/tabs';

@Component({
  selector: 'carded-left-sidebar',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [
    DscHeaderComponent,
    Footer,
    PageHeaderComponent,
    RouterOutlet,
    DscBreadcrumbComponent,
    DscButtonComponent,
    NgIf,
    NgFor,
    AsyncPipe,
    DscSidenavComponent,
    DscTabGroupComponent,
    DscTabComponent
  ],
  templateUrl: './carded-left-sidebar.component.html',
  styleUrls: ['./carded-left-sidebar.component.scss']
})
export class CardedLeftSidebarComponent implements OnInit, OnDestroy, OnChanges {
  private _unsubscribeAll: Subject<any> = new Subject<any>();

  @Input() pageTitle?: string;

  @Input() menu!: DscMenu[];

  @Input() accessLevel?: AccessLevel;

  @Input() urls?: DscBreadcrumbItem[];

  isNotScreenSmall: boolean = true;

  toggle!: boolean;

  // Abas dinâmicas derivadas dos submenus do menu atual
  tabs: Array<{ label: string; url: string }> = [];
  // Índice selecionado atual (usado para navegação; não vinculamos ao componente para evitar erro caso não exista input selectedIndex)
  selectedTabIndex: number = 0;
  // Título do menu pai calculado a partir da rota atual
  computedParentTitle?: string;

  constructor(
    @Inject(DOCUMENT) private _document: Document,
    private _sidscPortalBreakpointService: SidscPortalBreakpointService,
    private _router: Router,
    private _activatedRoute: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this._sidscPortalBreakpointService.onMediaChange$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(({matchingAliases}) =>
      {
        this.toggle = true;
        this.isNotScreenSmall = !matchingAliases[matchingAliases.length - 1].includes('xs');
      });

    // Construir abas a partir do menu inicialmente
    this._buildTabsFromMenu();

    // Atualizar abas/seleção ao navegar
    this._router.events
      .pipe(filter(event => event instanceof NavigationEnd), takeUntil(this._unsubscribeAll))
      .subscribe(() => {
        this._buildTabsFromMenu();
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['menu'] && changes['menu'].currentValue) {
      this._buildTabsFromMenu();
    }
  }

  onOpenedChange(value: boolean): void {
    this.toggle = value;
  }

  // Navegar ao trocar de aba
  onTabChanged(matTabChangeEvent: MatTabChangeEvent): void {
    const idx = matTabChangeEvent.index;
    const tab = this.tabs?.[idx];
    if (!tab || !tab.url) {
      return;
    }
    const targetUrl = tab.url.startsWith('/') ? tab.url : '/' + tab.url;
    const currentPath = this._getCurrentPath();

    // Evitar navegação/loop quando a seleção foi programática ou a URL já é a mesma
    if (currentPath === targetUrl || currentPath.startsWith(targetUrl)) {
      this.selectedTabIndex = idx; // mantém estado interno
      return;
    }

    this.selectedTabIndex = idx;
    this._router.navigate([targetUrl]);
  }

  // Construir as abas com base na URL atual e nos submenus do item pai correspondente
  private _buildTabsFromMenu(): void {
    if (!this.menu || this.menu.length === 0) {
      this.tabs = [];
      return;
    }
    const currentPath = this._getCurrentPath();
    // Encontrar item pai cujo filho contenha a URL atual
    let matchingParent = this.menu?.find(parent => parent.children && parent.children.some(child => child.url && currentPath.startsWith(child.url)));

    // Fallback: tentar pelo próprio URL do item pai
    if (!matchingParent) {
      matchingParent = this.menu?.find(parent => parent.url && currentPath.startsWith(parent.url as string));
    }

    // Atualizar o título do menu pai
    this.computedParentTitle = matchingParent?.title;

    this.tabs = (matchingParent?.children || [])
      .filter(child => !!child.url)
      .map(child => ({ label: child.title, url: child.url as string }));

    // Atualizar índice selecionado com base na URL atual, evitando reatribuições desnecessárias
    const foundIndex = this.tabs.findIndex(tab => currentPath.startsWith(tab.url));
    if (foundIndex >= 0 && foundIndex !== this.selectedTabIndex) {
      this.selectedTabIndex = foundIndex;
    } else if (foundIndex < 0 && this.selectedTabIndex !== 0) {
      this.selectedTabIndex = 0;
    }
  }

  private _getCurrentPath(): string {
    // remover query params e fragmentos
    const url = this._router.url || '';
    const qIndex = url.indexOf('?');
    const hIndex = url.indexOf('#');
    const cutIndex = [qIndex, hIndex].filter(i => i >= 0).sort((a, b) => a - b)[0];
    return cutIndex >= 0 ? url.substring(0, cutIndex) : url;
  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next(null);
    this._unsubscribeAll.complete();
  }
}
