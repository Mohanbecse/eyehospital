import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild, AfterViewInit, signal, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, distinctUntilKeyChanged } from 'rxjs/operators';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { AppConfigService } from '../../app/services/app-config.service';
import { ToastService } from '../../app/services/toast.service';

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

  constructor(
    private http: HttpClient, 
    private config: AppConfigService, 
    private toastService: ToastService,
    private cdr: ChangeDetectorRef
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

  ngAfterViewInit(): void { }

  // ================= CAMERA =================
  async startCamera() {
    try {
      // First check if we are in secure context (required for camera access)
      if (!window.isSecureContext) {
        alert('⚠️ Camera Access Blocked\n\nCamera only works over HTTPS secure connection or localhost.\nYour hosted site is running on HTTP which is blocked by browser security policies.\n\nPlease enable HTTPS/SSL on your server to use camera feature.');
        return;
      }

      // Check if mediaDevices API is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Camera API is not supported in this browser');
        return;
      }

      this.stopCamera();

      // First try environment (back) camera, fallback to user (front) camera if fails
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
      } catch (cameraErr) {
        // Fallback to any available camera if environment camera not found
        this.stream = await navigator.mediaDevices.getUserMedia({
          video: true
        });
      }

      const video = this.videoRef?.nativeElement;

      if (video && this.stream) {
        video.srcObject = this.stream;
        await video.play();
      }
    } catch (err) {
      console.error('Camera Error:', err);
      
      let errorMessage = 'Camera not available or permission denied';
      
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          errorMessage = '⚠️ Camera Permission Denied\n\nPlease allow camera access in your browser settings and refresh the page.';
        } else if (err.name === 'NotFoundError') {
          errorMessage = 'No camera device found on this device';
        } else if (err.name === 'NotReadableError') {
          errorMessage = 'Camera is already in use by another application';
        } else if (err.name === 'SecurityError') {
          errorMessage = '⚠️ Camera Security Blocked\n\nCamera access is blocked. This usually happens when site is not running over HTTPS.';
        }
      }
      
      alert(errorMessage);
    }
  }
  capture() {
    const video = this.videoRef?.nativeElement;

    if (!video) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    this.photo = canvas.toDataURL('image/png');

    this.stopCamera();
  }
  stopCamera() {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const reader = new FileReader();
      
      reader.onload = (e) => {
        this.photo = e.target?.result as string;
        this.stopCamera();
        this.cdr.detectChanges();
      };
      
      reader.readAsDataURL(file);
    }
    
    // Reset input value so same file can be selected again
    input.value = '';
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
    address: '',
    contactNo: '',
    nid: '',
    medicalRecordNumber: '',
    preSurgeryVisualAcuity: '',
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
    if (!this.patient.address || this.patient.address.trim() === '') {
      this.toastService.showError('Address is required');
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
        this.toastService.showSuccess(this.isEditMode ? 'Patient updated successfully!' : 'Patient saved successfully!');
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

    this.photo = p.beneficiaryPhoto ? 'data:image/png;base64,' + p.beneficiaryPhoto : null;
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
    if (confirm('⚠️ Are you sure you want to delete this Beneficary record? This action cannot be undone.')) {
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
          ignoreElements: function(element) {
            return element.classList.contains('no-print');
          },
          allowTaint: true,
          logging: false
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
      address: '',
      contactNo: '',
      nid: '',
      medicalRecordNumber: '',
      preSurgeryVisualAcuity: '',
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
