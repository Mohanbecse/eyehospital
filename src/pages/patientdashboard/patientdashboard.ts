import { Component, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppConfigService } from '../../app/services/app-config.service';

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

@Component({
  selector: 'app-report',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './patientdashboard.html'
})
export class Patientdashboard implements OnInit {

  apiUrl: string;

  patients: any[] = [];
  filtered = signal<any[]>([]);

  fromDate: string = '';
  toDate: string = '';
  campCode: string = '';

  // ================= PAGINATION =================
  currentPage = 1;
  pageSize = 10;
  pageSizeOptions = [5, 10, 25, 50, 100,500];

  pagedData: any[] = [];

  constructor(private http: HttpClient, private config: AppConfigService) {
    this.apiUrl = `${this.config.apiUrl}/patient`;
  }

  ngOnInit(): void {
    // Optional: load only when dates selected
    // this.loadData();
  }

  get totalPages(): number {
    return Math.ceil(this.filtered().length / this.pageSize) || 1;
  }

  changePage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.updatePagedData();
  }

  onPageSizeChange() {
    this.currentPage = 1;
    this.updatePagedData();
  }

  updatePagedData() {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.pagedData = this.filtered().slice(startIndex, endIndex);
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePagedData();
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePagedData();
    }
  }

  // ================= LOAD DATA =================
  loadData() {

  const params: any = {};

  // ✅ Case 1: Camp Code only
  if (this.campCode && !this.fromDate && !this.toDate) {
    params.campCode = this.campCode;
  }

  // ✅ Case 2: Date only
  else if (!this.campCode && this.fromDate && this.toDate) {
    params.fromDate = this.fromDate;
    params.toDate = this.toDate;
  }

  // ✅ Case 3: Date + Camp Code
  else if (this.campCode && this.fromDate && this.toDate) {
    params.campCode = this.campCode;
    params.fromDate = this.fromDate;
    params.toDate = this.toDate;
  }

  // ❌ Invalid case
  else {
    console.warn('Select CampCode OR Date range OR Both');
    return;
  }

  console.log('API Params:', params);

  this.http.get<any[]>(this.apiUrl, { params }).subscribe({
    next: res => {

      this.patients = (res || []).map(p => ({
        id: p.id ?? p.Id,
        campcode: p.campcode ?? p.Campcode,
        name: p.name ?? p.Name,
        gender: p.gender ?? p.Gender,
        age: p.age ?? p.Age,
        address: p.address ?? p.Address,
        contactNo: p.contactNo ?? p.ContactNo,
        nid: p.nid ?? p.NID,
        medicalRecordNumber: p.medicalRecordNumber ?? p.MedicalRecordNumber,
        preSurgeryVisualAcuity: p.preSurgeryVisualAcuity ?? p.PreSurgeryVisualAcuity,
        dateOfSurgery: p.dateOfSurgery ?? p.DateOfSurgery,
        typeOfSurgery: p.typeOfSurgery ?? p.TypeOfSurgery,
        eyeOperated: p.eyeOperated ?? p.EyeOperated,
        postSurgeryVisualAcuity: p.postSurgeryVisualAcuity ?? p.PostSurgeryVisualAcuity,
        beneficiaryPhoto: p.beneficiaryPhoto ?? p.BeneficiaryPhoto
      }));

      this.filtered.set([...this.patients]);
      this.currentPage = 1;
      this.updatePagedData();
    },
    error: err => {
      console.error('API Error:', err);
    }
  });
}

  // ================= FILTER =================
  applyFilter() {
    this.loadData();
  }

  // ================= RESET =================
  resetFilter() {
    this.fromDate = '';
    this.toDate = '';
    this.campCode = '';

    this.filtered.set( [...this.patients]);
    this.currentPage = 1;

    this.updatePagedData();
  }

  // ================= PDF =================
  generateReport() {

    const originalPage = this.currentPage;

    // Show all records temporarily
    this.pagedData = [...this.filtered()];
    this.currentPage = 1;

    setTimeout(() => {

      const element = document.getElementById('reportTable');

      if (!element) {
        console.error('reportTable not found');
        return;
      }

      html2canvas(element, {
        scale: 2,
        useCORS: true,
        scrollY: -window.scrollY
      }).then(canvas => {

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');

        const pdfWidth = 210;
        const pageHeight = 295;

        const imgWidth = pdfWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft > 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }

        pdf.save('patient-report.pdf');

        // Restore pagination
        this.currentPage = originalPage;
        this.updatePagedData();

      }).catch(err => {
        console.error('PDF Error:', err);
      });

    }, 300);
  }

  // ================= EXCEL =================
async generateExcel() {

  if (!this.filtered || this.filtered().length === 0) {
    console.warn('No data to export');
    return;
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Patient Report');

  // ✅ Define Columns
  worksheet.columns = [
    { header: 'Camp Code', key: 'campcode', width: 15 },
    { header: 'Name', key: 'name', width: 20 },
    { header: 'Gender', key: 'gender', width: 10 },
    { header: 'Age', key: 'age', width: 10 },
    { header: 'Address', key: 'address', width: 25 },
    { header: 'Contact', key: 'contactNo', width: 15 },
    { header: 'NID', key: 'nid', width: 20 },
    { header: 'MRN', key: 'mrn', width: 20 },
    { header: 'Pre VA', key: 'preVA', width: 15 },
    { header: 'Date Of Surgery', key: 'dos', width: 18 },
    { header: 'Type Of Surgery', key: 'tos', width: 20 },
    { header: 'Eye Operated', key: 'eye', width: 15 },
    { header: 'Post VA', key: 'postVA', width: 15 },
    { header: 'Photo', key: 'photo', width: 25 }
  ];

  // ✅ Header Styling
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

  // ✅ Freeze Header
  worksheet.views = [{ state: 'frozen', ySplit: 1 }];

  // ✅ Add Filter
  worksheet.autoFilter = {
    from: 'A1',
    to: 'N1'
  };

  const data = this.filtered();

  data.forEach((p, index) => {

    const rowIndex = index + 2; // Excel row index (header = 1)

    const row = worksheet.addRow({
      campcode: p.campcode,
      name: p.name,
      gender: p.gender,
      age: p.age,
      address: p.address,
      contactNo: p.contactNo,
      nid: p.nid,
      mrn: p.medicalRecordNumber,
      preVA: p.preSurgeryVisualAcuity,
      dos: p.dateOfSurgery ? new Date(p.dateOfSurgery) : '',
      tos: p.typeOfSurgery,
      eye: p.eyeOperated,
      postVA: p.postSurgeryVisualAcuity,
      photo: '' // ⚠️ IMPORTANT: keep empty (image will be inserted separately)
    });

    // ✅ Date format fix
    if (p.dateOfSurgery) {
      row.getCell('dos').numFmt = 'dd-mm-yyyy';
    }

    // ✅ Align row
    row.alignment = { vertical: 'middle', horizontal: 'center' };

    // ✅ Add Image
    if (p.beneficiaryPhoto) {
      try {
        const base64 = p.beneficiaryPhoto.includes(',')
          ? p.beneficiaryPhoto.split(',')[1]
          : p.beneficiaryPhoto;

        const imageId = workbook.addImage({
          base64: base64,
          extension: 'png'
        });

        worksheet.addImage(imageId, {
          tl: { col: 13, row: rowIndex - 1 }, // zero-based
          ext: { width: 80, height: 80 }
        });

        // ✅ Adjust row height
        worksheet.getRow(rowIndex).height = 65;

      } catch (err) {
        console.warn('Image error for row', index, err);
      }
    }
  });

  // ✅ Auto wrap for Address column
  worksheet.getColumn('address').alignment = { wrapText: true };

  // ✅ Export File
  const buffer = await workbook.xlsx.writeBuffer();

  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  saveAs(blob, 'patient-report.xlsx');
}
}