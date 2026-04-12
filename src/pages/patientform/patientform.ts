import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { ConfigService } from '../../app/services/config.service';

@Component({
  selector: 'app-patientform',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './patientform.html',
  styleUrls: ['./patientform.css']
})
export class Patientform implements AfterViewInit {

  apiUrl: string;

  constructor(private http: HttpClient, private configService: ConfigService) {
    this.apiUrl = `${this.configService.getApiUrl()}/patient`;
    this.loadPatients();
  }

  // ================= VIEW CHILD (IMPORTANT FIX) =================
  @ViewChild('video', { static: false }) videoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('printSection', { static: false }) printSection!: ElementRef;

  stream: MediaStream | null = null;
  photo: string | null = null;

  ngAfterViewInit(): void {}

  // ================= CAMERA =================
  async startCamera() {
    try {
      this.stopCamera();

      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });

      const video = this.videoRef?.nativeElement;

      if (video && this.stream) {
        video.srcObject = this.stream;
        await video.play();
      }

    } catch (err) {
      console.error(err);
      alert("Camera not available or permission denied");
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
    this.stream?.getTracks().forEach(t => t.stop());
    this.stream = null;
  }

  // ================= MODAL =================
  viewModal = false;
  selectedPatient: any = null;

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
    beneficiaryPhoto: ''
  };

  patients: any[] = [];
  filtered: any[] = [];
  searchText = '';
  isEditMode = false;

  // ================= LOAD =================
  loadPatients() {
    this.http.get<any[]>(this.apiUrl).subscribe({
      next: res => {
        this.patients = res;
        this.filtered = [];
      },
      error: err => console.log(err)
    });
  }

  // ================= SAVE =================
  savePatient() {

    const payload = {
      ...this.patient,
      dateOfSurgery: this.patient.dateOfSurgery
        ? new Date(this.patient.dateOfSurgery)
        : null,
      beneficiaryPhoto: this.photo
        ? this.photo.split(',')[1]
        : null
    };

    const req = this.isEditMode && this.patient.id > 0
      ? this.http.put(`${this.apiUrl}/${this.patient.id}`, payload)
      : this.http.post(this.apiUrl, payload);

    req.subscribe({
      next: () => {
        this.loadPatients();
        this.resetForm();
      },
      error: err => console.log(err)
    });
  }

  // ================= EDIT =================
  edit(p: any) {
    this.patient = { ...p };
    this.patient.id = p.id;

    if (p.dateOfSurgery) {
      this.patient.dateOfSurgery = new Date(p.dateOfSurgery)
        .toISOString()
        .split('T')[0];
    }

    this.isEditMode = true;

    this.photo = p.beneficiaryPhoto
      ? 'data:image/png;base64,' + p.beneficiaryPhoto
      : null;
  }

  // ================= DELETE =================
  delete(id: number) {
    this.http.delete(`${this.apiUrl}/${id}`).subscribe({
      next: () => this.loadPatients(),
      error: err => console.log(err)
    });
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

      const element = this.printSection?.nativeElement;

      if (!element) {
        alert("No data to print");
        return;
      }

      const win = window.open('', '', 'width=900,height=650');

      win?.document.write(`
        <html>
        <head>
          <title>Patient Print</title>
          <style>
            body { font-family: Arial; padding: 20px; }
            p { margin: 6px 0; }
          </style>
        </head>
        <body>${element.innerHTML}</body>
        </html>
      `);

      win?.document.close();
      win?.focus();
      win?.print();
      win?.close();

    }, 500); 
  }
isDownloading = false;
  // ================= PDF =================
downloadPDF() {

  this.isDownloading = true;

  // 👇 FORCE DOM UPDATE FIRST
  setTimeout(() => {

    const element = this.printSection?.nativeElement;

    if (!element) {
      alert("No data found for PDF");
      this.isDownloading = false;
      return;
    }

    // 👇 ADD SMALL DELAY FOR UI REFRESH
    setTimeout(() => {

      html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      }).then(canvas => {

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

      }).catch(err => {
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
      beneficiaryPhoto: ''
    };

    this.photo = null;
    this.isEditMode = false;
    this.stopCamera();
  }

  // ================= SEARCH =================
  filter() {
    const text = this.searchText?.toLowerCase().trim();

    if (!text) {
      this.filtered = [];
      return;
    }

    this.filtered = this.patients.filter(p =>
      p.name?.toLowerCase().includes(text) ||
      p.medicalRecordNumber?.toLowerCase().includes(text) ||
      p.contactNo?.includes(text)
    );
  }
}