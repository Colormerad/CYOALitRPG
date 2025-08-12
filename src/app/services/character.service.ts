import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CharacterService {
  private apiBase = environment.apiBase || 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  getCharacter(id: number): Observable<any> {
    return this.http.get(`${this.apiBase}/characters/${id}`);
    }

  getLegacy(id: number): Observable<any> {
    return this.http.get(`${this.apiBase}/characters/${id}/legacy`);
  }
}
