import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { timeout } from 'rxjs/operators';
import { environment } from '../../../../../../../environments/environment';

interface AdminDetailResponse {
  userId: number;
  username: string;
  email: string;
  role: string;
  isActive: boolean;
  firstName: string;
  lastName: string;
  fullName: string;
  birthDate: string | null;
  age: number | null;
  phoneNumber: string | null;
  photoUrl: string | null;
  details: string | null;
  teacherId: number | null;
  studentId: number | null;
  createdAt: string;
  updatedAt: string;
}

@Component({
  selector: 'app-admin-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-detail.component.html',
  styleUrls: ['./admin-detail.component.css']
})
export class AdminDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);
  private readonly cdr = inject(ChangeDetectorRef);

  user: AdminDetailResponse | null = null;
  loading = true;
  errorMessage = '';

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');

    console.log('Admin detail page opened');
    console.log('Route id:', id);
    console.log('environment.apiUrl:', environment.apiUrl);

    if (!id) {
      this.errorMessage = 'İstifadəçi ID tapılmadı.';
      this.loading = false;
      this.cdr.detectChanges();
      return;
    }

    this.loadAdminDetail(id);
  }

  loadAdminDetail(id: string): void {
    this.loading = true;
    this.errorMessage = '';

    // Swagger-də düzgün endpoint: GET /api/User/{userId}
    const url = `${environment.apiUrl}/User/${id}`;
    console.log('DETAIL REQUEST URL:', url);

    this.http
      .get<AdminDetailResponse>(url)
      .pipe(timeout(10000))
      .subscribe({
        next: (response) => {
          console.log('DETAIL RESPONSE:', response);
          this.user = response;
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (error: HttpErrorResponse) => {
          console.error('DETAIL ERROR FULL:', error);

          if (error.status === 0) {
            this.errorMessage = 'Backend-ə qoşulmaq olmadı. API işləmir və ya CORS/SSL problemi var.';
          } else if (error.status === 401) {
            this.errorMessage = 'İcazə yoxdur. Token göndərilmir və ya login vaxtı bitib.';
          } else if (error.status === 403) {
            this.errorMessage = 'Bu səhifəyə giriş icazən yoxdur.';
          } else if (error.status === 404) {
            this.errorMessage = `Endpoint tapılmadı: ${url}`;
          } else if (error.status === 500) {
            this.errorMessage = 'Backend daxilində server xətası baş verdi.';
          } else {
            this.errorMessage = `Xəta baş verdi. Status: ${error.status}`;
          }

          this.loading = false;
          this.cdr.detectChanges();
        }
      });
  }

  get displayName(): string {
    if (!this.user) {
      return '-';
    }

    const fullName = (this.user.fullName || '').trim();
    if (fullName) {
      return fullName;
    }

    const firstName = (this.user.firstName || '').trim();
    const lastName = (this.user.lastName || '').trim();

    if (firstName || lastName) {
      return `${firstName} ${lastName}`.trim();
    }

    return this.user.username || '-';
  }

  get initials(): string {
    const name = this.displayName;

    if (!name || name === '-') {
      return 'A';
    }

    const parts = name.split(' ').filter(Boolean);

    if (parts.length === 1) {
      return parts[0].substring(0, 1).toUpperCase();
    }

    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  get statusLabel(): string {
    return this.user?.isActive ? 'Aktiv' : 'Passiv';
  }

  get statusClass(): string {
    return this.user?.isActive ? 'active' : 'inactive';
  }

  get roleLabel(): string {
    const role = this.user?.role?.toLowerCase() || '';

    if (role === 'issuperadmin') {
      return 'Super Admin';
    }

    if (role === 'admin') {
      return 'Admin';
    }

    return this.user?.role || '-';
  }

  formatDate(value: string | null | undefined): string {
    if (!value) {
      return '-';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('az-AZ', {
      year: 'numeric',
      month: 'long',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  formatShortDate(value: string | null | undefined): string {
    if (!value) {
      return '-';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('az-AZ', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date);
  } 

  getInfo(value: string | number | null | undefined): string {
    if (value === null || value === undefined || value === '') {
      return '-';
    }

    return String(value);   
  }

  refresh(): void {
    const id = this.route.snapshot.paramMap.get('id');

    if (id) {
      this.loadAdminDetail(id);
    }
  }
}