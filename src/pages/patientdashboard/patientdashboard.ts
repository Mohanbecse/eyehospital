import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

@Component({
  selector: 'app-report',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './patientdashboard.html'
})
export class Patientdashboard {

  apiUrl = 'https://localhost:7191/api/patient';

  patients: any[] = [];
  filtered: any[] = [];

  fromDate: string = '';
  toDate: string = '';
  campCode: string = '';

  constructor(private http: HttpClient) {
    this.loadData();
  }

  // ================= LOAD =================
  loadData() {
    this.http.get<any[]>(this.apiUrl).subscribe({
      next: res => {
        this.patients = res || [];
        this.filtered = [...this.patients];
      },
      error: err => console.log('API Error:', err)
    });
  }

  // ================= FILTER =================
  applyFilter() {

    const from = this.fromDate ? new Date(this.fromDate) : null;
    const to = this.toDate ? new Date(this.toDate) : null;
    const inputCamp = (this.campCode || '').trim().toLowerCase();

    this.filtered = this.patients.filter(p => {

      const campValue = (p.campcode || '').toString().trim().toLowerCase();
      const date = p.dateOfSurgery ? new Date(p.dateOfSurgery) : null;

      // ================= ONLY CAMP =================
      if (inputCamp && !from && !to) {
        return campValue.includes(inputCamp);
      }

      // ================= ONLY DATES =================
      if (!inputCamp && from && to) {
        return date && date >= from && date <= to;
      }

      // ================= CAMP + DATES =================
      if (inputCamp && from && to) {
        return (
          campValue.includes(inputCamp) &&
          date &&
          date >= from &&
          date <= to
        );
      }

      // ================= INVALID CASE =================
      return false;
    });
  }

  // ================= RESET =================
  resetFilter() {
    this.fromDate = '';
    this.toDate = '';
    this.campCode = '';
    this.filtered = [...this.patients];
  }

  // ================= PDF =================
  generateReport() {

    const element = document.getElementById('reportTable');

    if (!element) {
      console.error('reportTable not found');
      return;
    }

    setTimeout(() => {

      html2canvas(element, {
        scale: 2,
        useCORS: true,
        scrollY: -window.scrollY
      }).then(canvas => {

        const imgData = canvas.toDataURL('image/png');

        const pdf = new jsPDF('p', 'mm', 'a4');

        const pdfWidth = 210;

        const imgWidth = pdfWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

        pdf.save('patient-report.pdf');

      }).catch(err => {
        console.error('PDF Error:', err);
      });

    }, 200);
  }

  // ================= EXCEL =================
  generateExcel() {

    if (!this.filtered || this.filtered.length === 0) {
      console.warn('No data to export');
      return;
    }

    const exportData = this.filtered.map(p => ({
      CampCode: p.campcode,
      Name: p.name,
      Gender: p.gender,
      Age: p.age,
      Address: p.address,
      Contact: p.contactNo,
      NID: p.nid,
      MRN: p.medicalRecordNumber,
      PreVA: p.preSurgeryVisualAcuity,
      DateOfSurgery: p.dateOfSurgery,
      TypeOfSurgery: p.typeOfSurgery,
      EyeOperated: p.eyeOperated,
      PostVA: p.postSurgeryVisualAcuity,
      Photo: p.beneficiaryPhoto
        ? 'data:image/png;base64,' + p.beneficiaryPhoto
        : 'No Photo'
    }));

    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(exportData);

    const workbook: XLSX.WorkBook = {
      Sheets: { 'Patient Report': worksheet },
      SheetNames: ['Patient Report']
    };

    const excelBuffer: any = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array'
    });

    const data: Blob = new Blob([excelBuffer], {
      type: 'application/octet-stream'
    });

    saveAs(data, 'patient-report.xlsx');
  }
}