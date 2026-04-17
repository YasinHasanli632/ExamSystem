import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { AdminSettingsService } from '../admin-settings.service';
import {
  ADMIN_SETTINGS_DEFAULT,
  AdminSettingsModel,
  SettingsLanguageOptionModel
} from '../../../../../core/models/settings/admin-settings.model';

@Component({
  selector: 'app-admin-settings',
  standalone: true,   
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-settings.component.html',
  styleUrls: ['./admin-settings.component.css']
})
export class AdminSettingsComponent implements OnInit {
  private readonly adminSettingsService = inject(AdminSettingsService);
  private readonly cdr = inject(ChangeDetectorRef);

  isLoading = true;
  isSaving = false;
  isResetting = false;

  errorMessage = '';
  successMessage = '';

  settings: AdminSettingsModel = structuredClone(ADMIN_SETTINGS_DEFAULT);
  initialSettings: AdminSettingsModel = structuredClone(ADMIN_SETTINGS_DEFAULT);

  languageOptions: SettingsLanguageOptionModel[] = [
    { label: 'Azərbaycan dili', value: 'az' },
    { label: 'English', value: 'en' },
    { label: 'Türk dili', value: 'tr' },
    { label: 'Русский', value: 'ru' }
  ];

  ngOnInit(): void {
    this.loadSettings();
  }

  loadSettings(showLoader: boolean = true): void {
    if (showLoader) {
      this.isLoading = true;
    }

    this.errorMessage = '';
    this.cdr.detectChanges();

    this.adminSettingsService
      .getSettings()
      .pipe(
        finalize(() => {
          if (showLoader) {
            this.isLoading = false;
          }
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          this.settings = structuredClone(response);
          this.initialSettings = structuredClone(response);
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.errorMessage =
            error?.error?.message ||
            error?.message ||
            'Ayarlar yüklənərkən xəta baş verdi.';
          this.cdr.detectChanges();
        }
      });
  }

  saveSettings(): void {
    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.detectChanges();

    const payload = structuredClone(this.settings);

    this.adminSettingsService
      .updateSettings(payload)
      .pipe(
        finalize(() => {
          this.isSaving = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          this.successMessage = 'Ayarlar uğurla yadda saxlanıldı.';
          this.cdr.detectChanges();

          // SAVE-dən sonra backenddən təzə datanı yenidən çəkirik
          this.loadSettings(false);
        },
        error: (error) => {
          this.errorMessage =
            error?.error?.message ||
            error?.message ||
            'Ayarları yadda saxlamaq mümkün olmadı.';
          this.successMessage = '';
          this.cdr.detectChanges();
        }
      });
  }

  resetForm(): void {
    this.settings = structuredClone(this.initialSettings);
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.detectChanges();
  }

  resetToDefaults(): void {
    this.isResetting = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.detectChanges();

    this.adminSettingsService
      .resetToDefaults()
      .pipe(
        finalize(() => {
          this.isResetting = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          this.successMessage = 'Ayarlar default dəyərlərə qaytarıldı.';
          this.errorMessage = '';
          this.cdr.detectChanges();

          // RESET-dən sonra da yenidən backenddən çəkirik
          this.loadSettings(false);
        },
        error: (error) => {
          this.errorMessage =
            error?.error?.message ||
            error?.message ||
            'Default ayarlar bərpa edilə bilmədi.';
          this.successMessage = '';
          this.cdr.detectChanges();
        }
      });
  }

  get hasChanges(): boolean {
    return JSON.stringify(this.settings) !== JSON.stringify(this.initialSettings);
  }

  get updatedAtLabel(): string {
    if (!this.settings.updatedAt) {
      return 'Hələ yenilənməyib';
    }

    const date = new Date(this.settings.updatedAt);

    if (Number.isNaN(date.getTime())) {
      return 'Hələ yenilənməyib';
    }

    return date.toLocaleString('az-AZ');
  }
}