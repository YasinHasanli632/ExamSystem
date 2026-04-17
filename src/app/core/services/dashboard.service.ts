import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DashboardResponseModel } from '../models/dashboard/dashboard.model';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getMyDashboard(): Observable<DashboardResponseModel> {
    return this.http.get<DashboardResponseModel>(`${this.apiUrl}/Dashboard/me`);
  }
}