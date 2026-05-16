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
  dateRangeError: string = '';

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
        village: p.village ?? p.Village,
        upazila: p.upazila ?? p.Upazila,
        district: p.district ?? p.District,
        country: p.country ?? p.Country,
        contactNo: p.contactNo ?? p.ContactNo,
        nid: p.nid ?? p.NID,
        medicalRecordNumber: p.medicalRecordNumber ?? p.MedicalRecordNumber,
        preSurgeryVisualAcuityLeft: p.preSurgeryVisualAcuityLeft ?? p.PreSurgeryVisualAcuityLeft,
        preSurgeryVisualAcuityRight: p.preSurgeryVisualAcuityRight ?? p.PreSurgeryVisualAcuityRight,
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

  // ================= DATE RANGE PRESETS =================
  setDateRange(range: string) {
    const today = new Date();
    let from: Date, to: Date = new Date();

    switch(range) {
      case 'today':
        from = new Date(today);
        to = new Date(today);
        break;
      case 'yesterday':
        from = new Date(today);
        from.setDate(today.getDate() - 1);
        to = new Date(from);
        break;
      case 'thisWeek':
        from = new Date(today);
        const dayOfWeek = from.getDay() || 7;
        from.setDate(today.getDate() - dayOfWeek + 1);
        to = new Date(today);
        break;
      case 'lastWeek':
        from = new Date(today);
        const lastWeekDay = from.getDay() || 7;
        from.setDate(today.getDate() - lastWeekDay - 6);
        to = new Date(from);
        to.setDate(from.getDate() + 6);
        break;
      case 'thisMonth':
        from = new Date(today.getFullYear(), today.getMonth(), 1);
        to = new Date(today);
        break;
      case 'lastMonth':
        from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        to = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case 'last30Days':
        from = new Date(today);
        from.setDate(today.getDate() - 29);
        to = new Date(today);
        break;
      default:
        return;
    }

    this.fromDate = this.formatDateString(from);
    this.toDate = this.formatDateString(to);
    this.dateRangeError = '';
  }

  formatDateString(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  validateDateRange() {
    this.dateRangeError = '';
    
    if (this.fromDate && this.toDate) {
      const from = new Date(this.fromDate);
      const to = new Date(this.toDate);
      
      if (from > to) {
        this.dateRangeError = 'From date cannot be after To date';
      }
    }
  }

  // ================= RESET =================
  resetFilter() {
    this.fromDate = '';
    this.toDate = '';
    this.campCode = '';
    this.dateRangeError = '';

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

  if (!this.filtered() || this.filtered().length === 0) {
    console.warn('No data to export');
    return;
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Patient Report');

  // ================= TITLE HEADER =================
  worksheet.mergeCells('A1:S1');

  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'Dhaka Progressive Lions Eye Hospital';

  titleCell.font = {
    bold: true,
    size: 16
  };

  titleCell.alignment = {
    horizontal: 'center',
    vertical: 'middle'
  };

  worksheet.getRow(1).height = 30;

  // ================= HEADER ROW 2 (GROUP HEADERS) =================
 worksheet.getRow(2).values = [
    'S.No','Camp Code','Name','Gender','Age',
  'Address','','','',
  'Contact','NID','MRN',
  'Pre Surgery VA','',
  'Date Of Surgery','Type Of Surgery','Eye Operated',
  'Post Surgery VA','Photo'
];

  // ================= HEADER ROW 3 (COLUMN HEADERS) =================
 worksheet.getRow(3).values = [
  '',
  '', '', '', '',
  'Village','Upazila','District','Country',
  '', '', '',
  'Left','Right',
  '', '', '',
  '', ''
];

  // ================= MERGE GROUP HEADERS =================
  worksheet.mergeCells('F2:I2'); // Address (moved right by 1)
  worksheet.mergeCells('M2:N2'); // Pre Surgery VA (moved right by 1)

  // ================= ROWSPAN (MERGE ROW 2 & 3) =================
[
  'A','B','C','D','E',  // First columns
  'J','K','L',      // After Address
  'O','P','Q','R','S' // Remaining columns
].forEach(col => {
  try {
    worksheet.mergeCells(`${col}2:${col}3`);
  } catch(e) {
    // Skip if already merged
    console.log('Skip merge for', col);
  }
});
  // ================= CENTER GROUP HEADERS =================
  worksheet.getCell('E2').alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getCell('L2').alignment = { horizontal: 'center', vertical: 'middle' };

  // ================= HEADER STYLE =================
  [2, 3].forEach(rowNum => {
    const row = worksheet.getRow(rowNum);
    row.font = { bold: true };
    row.alignment = { vertical: 'middle', horizontal: 'center' };
    row.height = 22;
  });

  // ================= COLUMN WIDTH =================
  worksheet.columns = [
    { key: 'sno', width: 10 },
    { key: 'campcode', width: 15 },
    { key: 'name', width: 20 },
    { key: 'gender', width: 10 },
    { key: 'age', width: 10 },
    { key: 'village', width: 20 },
    { key: 'upazila', width: 20 },
    { key: 'district', width: 20 },
    { key: 'country', width: 20 },
    { key: 'contactNo', width: 15 },
    { key: 'nid', width: 20 },
    { key: 'mrn', width: 20 },
    { key: 'preVALeft', width: 12 },
    { key: 'preVARight', width: 12 },
    { key: 'dos', width: 18 },
    { key: 'tos', width: 20 },
    { key: 'eye', width: 15 },
    { key: 'postVA', width: 15 },
    { key: 'photo', width: 25 }
  ];

  // ================= FREEZE =================
  worksheet.views = [{ state: 'frozen', ySplit: 3 }];

  // ================= FILTER =================
  worksheet.autoFilter = {
    from: 'A3',
    to: 'R3'
  };

  // ================= DATA =================
  const data = this.filtered();

  data.forEach((p, index) => {

    const rowIndex = index + 4;

    const row = worksheet.addRow({
      sno: index + 1,
      campcode: p.campcode,
      name: p.name,
      gender: p.gender,
      age: p.age,
      village: p.village,
      upazila: p.upazila,
      district: p.district,
      country: p.country,
      contactNo: p.contactNo,
      nid: p.nid,
      mrn: p.medicalRecordNumber,
      preVALeft: p.preSurgeryVisualAcuityLeft,
      preVARight: p.preSurgeryVisualAcuityRight,
      dos: p.dateOfSurgery ? new Date(p.dateOfSurgery) : '',
      tos: p.typeOfSurgery,
      eye: p.eyeOperated,
      postVA: p.postSurgeryVisualAcuity,
      photo: ''
    });

    row.alignment = { vertical: 'middle', horizontal: 'center' };

    if (p.dateOfSurgery) {
      row.getCell(14).numFmt = 'dd-mm-yyyy';
    }

    // ================= IMAGE =================
if (p.beneficiaryPhoto) {
  try {
    const base64 = p.beneficiaryPhoto.includes(',')
      ? p.beneficiaryPhoto.split(',')[1]
      : p.beneficiaryPhoto;

    const imageId = workbook.addImage({
      base64,
      extension: 'png'
    });

    const col = worksheet.getColumn(19);
    const row = worksheet.getRow(rowIndex);

    const cellWidthPx = col.width ? col.width * 7 : 80;
    const cellHeightPx = row.height || 65;

    const imgSize = Math.min(cellWidthPx, cellHeightPx) - 10;

    // 👉 add extra top padding here (e.g. 8px)
    const topPadding = 16;

    const offsetX = (cellWidthPx - imgSize) / 2;
    const offsetY = (cellHeightPx - imgSize) / 2 + topPadding;

    worksheet.addImage(imageId, {
      tl: {
        col: 18 + offsetX / cellWidthPx,
        row: rowIndex - 1 + offsetY / cellHeightPx
      },
      ext: {
        width: imgSize,
        height: imgSize
      }
    });

    row.height = cellHeightPx;
    col.width = 12;

  } catch (e) {
    console.log('Image error', e);
  }
}
  });

  // ================= BORDERS =================
  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
  });

  // ================= EXPORT =================
  const buffer = await workbook.xlsx.writeBuffer();

  saveAs(
    new Blob([buffer]),
    'beneficiary-report.xlsx'
  );
}
}