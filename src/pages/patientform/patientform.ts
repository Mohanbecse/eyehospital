import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild, AfterViewInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, distinctUntilKeyChanged } from 'rxjs/operators';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { AppConfigService } from '../../app/services/app-config.service';
import { ToastService } from '../../app/services/toast.service';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-patientform',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './patientform.html',
  styleUrls: ['./patientform.css'],
})
export class Patientform implements AfterViewInit {
  apiUrl: string;
  vaOptions: string[];
  currentDate = new Date();

  searchSubject = new Subject<string>();

  // ================= VIEW CHILD (IMPORTANT FIX) =================
  @ViewChild('video') videoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('printSection', { static: false }) printSection!: ElementRef;

  stream: MediaStream | null = null;
  photo: string | null = null;
  cameraActive = false;

  constructor(
    private http: HttpClient,
    private config: AppConfigService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef,
  ) {
    this.apiUrl = `${this.config.apiUrl}/patient`;
    this.vaOptions = this.config.vaOptions;
  }

  ngOnInit() {
    this.searchSubject.pipe(debounceTime(3000), distinctUntilChanged()).subscribe(() => {
      const text = this.searchText?.toLowerCase().trim();

      if (!text) {
        this.filtered.set([]);
        return;
      }
      this.loadPatients();
    });
  }

  ngAfterViewInit(): void {}

  // ================= CAMERA =================
  async startCamera() {
    try {
      this.photo = null;
      this.stopCamera();

      if (!navigator.mediaDevices?.getUserMedia) {
        this.toastService.showError('Camera not supported in this browser');
        return;
      }

      let stream: MediaStream;

      try {
        // Try back camera first
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
      } catch {
        // fallback front camera
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
      }

      this.stream = stream;
      this.cameraActive = true;
      this.cdr.detectChanges();

      // wait for Angular to render video element
      setTimeout(() => {
        const video = this.videoRef?.nativeElement;

        if (!video) {
          this.toastService.showError('Video element not ready');
          return;
        }

        video.srcObject = this.stream;

        video.onloadedmetadata = async () => {
          try {
            await video.play();
          } catch (e) {
            console.error('Video play failed', e);
          }
        };
      });
    } catch (err: any) {
      console.error('Camera error:', err);
      this.cameraActive = false;

      if (err?.name === 'NotAllowedError') {
        this.toastService.showError('Camera permission denied');
      } else if (err?.name === 'NotFoundError') {
        this.toastService.showError('No camera found');
      } else if (err?.name === 'NotReadableError') {
        this.toastService.showError('Camera already in use');
      } else {
        this.toastService.showError('Camera error occurred');
      }
    }
  }
  capture() {
    const video = this.videoRef?.nativeElement;

    if (!video || video.readyState < 2) {
      this.toastService.showError('Camera still loading');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);

    this.photo = canvas.toDataURL('image/png');

    this.stopCamera();
  }
  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => {
        track.stop();
        track.enabled = false;
      });
      this.stream = null;
    }

    const video = this.videoRef?.nativeElement;
    if (video) {
      video.pause();
      video.srcObject = null;
      video.load();
    }

    this.cameraActive = false;
  }
  onFileSelected(event: any) {
    this.stopCamera();
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.toastService.showError('Please select a valid image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      this.toastService.showError('Image must be less than 2MB');
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      this.photo = reader.result as string;
      this.cdr.detectChanges();
    };

    reader.onerror = () => {
      this.toastService.showError('Failed to read image');
    };

    reader.readAsDataURL(file);

    event.target.value = '';
  }
  // ================= MODAL =================
  viewModal = false;
  selectedPatient: any = null;
  patientListModal = false;

  // ================= MODEL =================
  patient: any = {
    id: 0,
    campcode: '',
    name: '',
    gender: '',
    age: null,
    village: '',
    upazila: '',
    district: '',
    country: '',
    contactNo: '',
    nid: '',
    medicalRecordNumber: '',
    preSurgeryVisualAcuityLeft: '',
    preSurgeryVisualAcuityRight: '',
    dateOfSurgery: '',
    typeOfSurgery: '',
    eyeOperated: '',
    postSurgeryVisualAcuity: '',
    beneficiaryPhoto: '',
  };

  patients: any[] = [];
  filtered = signal<any[]>([]);
  searchText = '';
  isEditMode = false;

  // ================= LOAD =================
  loadPatients() {
    this.http
      .get<any[]>(`${this.apiUrl}/globalsearch`, { params: { searchText: this.searchText } })
      .subscribe({
        next: (res) => {
          this.patients = res;
          this.filtered.set([...this.patients]);
        },
        error: (err) => console.log(err),
      });
  }

  // ================= VALIDATION =================
  validateForm(): boolean {
    // Validate required fields
    if (!this.patient.name || this.patient.name.trim() === '') {
      this.toastService.showError('Patient Name is required');
      return false;
    }
    if (!this.patient.gender || this.patient.gender.trim() === '') {
      this.toastService.showError('Gender is required');
      return false;
    }
    if (!this.patient.age || this.patient.age <= 0) {
      this.toastService.showError('Valid Age is required');
      return false;
    }
    if (!this.patient.village || this.patient.village.trim() === '') {
      this.toastService.showError('Village is required');
      return false;
    }
    if (!this.patient.upazila || this.patient.upazila.trim() === '') {
      this.toastService.showError('Upazila is required');
      return false;
    }
    if (!this.patient.district || this.patient.district.trim() === '') {
      this.toastService.showError('District is required');
      return false;
    }
    if (!this.patient.country || this.patient.country.trim() === '') {
      this.toastService.showError('Country is required');
      return false;
    }
    if (!this.patient.contactNo || this.patient.contactNo.trim() === '') {
      this.toastService.showError('Contact Number is required');
      return false;
    }
    if (!this.patient.dateOfSurgery || this.patient.dateOfSurgery.trim() === '') {
      this.toastService.showError('Surgery Date is required');
      return false;
    }

    return true;
  }

  // ================= SAVE =================
  savePatient() {
    // Run validation first
    if (!this.validateForm()) {
      return;
    }

    const payload = {
      ...this.patient,
      dateOfSurgery: this.patient.dateOfSurgery ? new Date(this.patient.dateOfSurgery) : null,
      beneficiaryPhoto: this.photo ? this.photo.split(',')[1] : null,
    };

    const req =
      this.isEditMode && this.patient.id > 0
        ? this.http.put(`${this.apiUrl}/${this.patient.id}`, payload)
        : this.http.post(this.apiUrl, payload);

    req.subscribe({
      next: () => {
        this.resetForm();
        this.toastService.showSuccess(
          this.isEditMode ? 'Patient updated successfully!' : 'Patient saved successfully!',
        );
        // Scroll to top of page after successful save
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      error: (err) => {
        console.log(err);
        // Error will be handled by global interceptor, but we can add additional handling if needed
      },
    });
  }

  // ================= EDIT =================
  edit(p: any) {
    this.patient = { ...p };
    this.patient.id = p.id;

    if (p.dateOfSurgery) {
      this.patient.dateOfSurgery = new Date(p.dateOfSurgery).toISOString().split('T')[0];
    }

    this.isEditMode = true;

    // ✅ SMART FIX: handle both base64 formats
    if (p.beneficiaryPhoto) {
      this.photo = p.beneficiaryPhoto.startsWith('data:image')
        ? p.beneficiaryPhoto // already formatted
        : 'data:image/png;base64,' + p.beneficiaryPhoto; // raw base64
    } else {
      this.photo = null;
    }
  }
  editPatientFromModal(p: any) {
    this.edit(p);
    this.patientListModal = false;
  }

  closePatientList() {
    this.patientListModal = false;
    this.searchText = '';
    this.filtered.set([]);
  }

  // ================= DELETE =================
  delete(id: number) {
    if (
      confirm(
        '⚠️ Are you sure you want to delete this Beneficary record? This action cannot be undone.',
      )
    ) {
      this.http.delete(`${this.apiUrl}/${id}`).subscribe({
        next: () => {
          this.loadPatients();
          this.toastService.showSuccess('Beneficary record deleted successfully');
        },
        error: (err) => {
          console.log(err);
          // Error will be handled by global interceptor
        },
      });
    }
  }

  // ================= VIEW =================
  view(p: any) {
    this.selectedPatient = { ...p };
    this.viewModal = true;
  }

  closeView() {
    this.viewModal = false;
    this.selectedPatient = null;
  }

  // ================= PRINT  =================
  printView() {
    setTimeout(() => {
      // Get only print section content
      const printContent = this.printSection?.nativeElement.innerHTML;

      // Create isolated print window with EXACT same styling
      const printWindow = window.open('', '_blank', 'width=0,height=0');

      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Beneficiary Record</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
            <style>
              body {
                font-family: 'Segoe UI', Arial, sans-serif;
                font-size: 14px;
                line-height: 1.6;
                padding: 20px;
                margin: 0;
                background: white;
              }
              .print-container {
                font-family: 'Segoe UI', Arial, sans-serif;
                font-size: 14px;
                line-height: 1.6;
                background: white;
              }
              @page {
                size: A4 portrait;
                margin: 18mm;
              }
            </style>
          </head>
          <body>
            <div class="print-container">
              ${printContent}
            </div>
          </body>
          </html>
        `);

        printWindow.document.close();
        printWindow.focus();

        // Wait for Bootstrap CSS to load fully
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 700);
      }
    }, 100);
  }
  isDownloading = false;
  // ================= PDF =================
  downloadPDF() {
    this.isDownloading = true;

    // 👇 FORCE DOM UPDATE FIRST
    setTimeout(() => {
      const element = this.printSection?.nativeElement;

      if (!element) {
        alert('No data found for PDF');
        this.isDownloading = false;
        return;
      }

      // 👇 ADD SMALL DELAY FOR UI REFRESH
      setTimeout(() => {
        html2canvas(element, {
          scale: 3,
          useCORS: true,
          backgroundColor: '#ffffff',
          ignoreElements: function (element) {
            return element.classList.contains('no-print');
          },
          allowTaint: true,
          logging: false,
        })
          .then((canvas) => {
            const imgData = canvas.toDataURL('image/png');

            const pdf = new jsPDF('p', 'mm', 'a4');

            const pageWidth = 210;
            const pageHeight = 297;

            const imgWidth = pageWidth;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            let position = 0;
            let heightLeft = imgHeight;

            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            while (heightLeft > 0) {
              position = -(imgHeight - heightLeft);
              pdf.addPage();
              pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
              heightLeft -= pageHeight;
            }

            pdf.save('patient.pdf');

            this.isDownloading = false;
          })
          .catch((err) => {
            console.error('PDF Error:', err);
            this.isDownloading = false;
          });
      }, 300); // 👈 IMPORTANT DELAY
    }, 0);
  }
  // ================= RESET =================
  resetForm() {
    this.patient = {
      id: 0,
      campcode: '',
      name: '',
      gender: '',
      age: null,
      village: '',
      upazila: '',
      district: '',
      country: '',
      contactNo: '',
      nid: '',
      medicalRecordNumber: '',
      preSurgeryVisualAcuityLeft: '',
      preSurgeryVisualAcuityRight: '',
      dateOfSurgery: '',
      typeOfSurgery: '',
      eyeOperated: '',
      postSurgeryVisualAcuity: '',
      beneficiaryPhoto: '',
    };

    this.photo = null;
    this.isEditMode = false;
    this.stopCamera();
  }

  // ================= SEARCH =================
  filter() {
    this.filtered.set([]);
    this.searchSubject.next(this.searchText);
  }
}
