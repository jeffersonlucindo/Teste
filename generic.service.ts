import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material';
import { environment } from 'src/environments/environment';
import { HttpParams, HttpClient } from '../../../node_modules/@angular/common/http';

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  totalItems: number;
  totalPages: number;
  totalItemsAllPages: number;
}

@Injectable({
  providedIn: 'root'
})
export class GenericService {

  params: HttpParams;
  url: string = environment["sipgc-api"];
  route: string = '';

  constructor(
    private http: HttpClient,
    public dialog: MatDialog
  ) { }

  get(params) {
    this.params = new HttpParams();

    Object.keys(params).map((key) => {
      if(params[key] !== '' && params[key] !== null){
        this.params = this.params.set(key, params[key])
      }
    })

    setTimeout(() => {
      environment['progressBar'] = 'indeterminate'
    }, 300);

    return this.http.get<any[]>(this.url + this.route, { params: this.params})
    .map((res) => {
      setTimeout(() => {
        environment['progressBar'] = 'determinate'
      }, 300);
      return res
    });
  }

  post(body) {
    if(body.id !== null && body.id !== undefined) {
      return this.http.put(`${this.url+ this.route}/${body.id}`, body);
    } else {
      return this.http.post(this.url + this.route, body);
    }
  }

  put(body) {
    return this.http.put(`${this.url + this.route}/${body.id}`, body);
  }

  delete(id, body?) {
    return this.http.delete(`${this.url + this.route}/${id}`, body);
  }

  deleteFromBody(body) {
    return this.http.delete(`${this.url + this.route}`, body);
  }

  deleteFromBodyAndUrl(body, url) {
    return this.http.delete(`${this.url + url}`, body);
  }

  getPaginated(params) {
    this.params = new HttpParams();

    Object.keys(params).map((key) => {
      if(params[key] !== '' && params[key] !== null){
        this.params = this.params.set(key, params[key])
      }
    });

    return this.http.get<PaginatedResult<any>>(this.url  + this.route, {params});
  }
}
