import * as React from "react"

export interface PaymentReceiptProps {
  workerName: string
  businessName: string
  jobTitle: string
  paymentId: string
  paymentDate: string
  amount: number
  paymentMethod?: string
  workPeriod: string
  totalDays: number
  dailyRate: number
  deductions?: {
    description: string
    amount: number
  }[]
  bonuses?: {
    description: string
    amount: number
  }[]
  dashboardUrl: string
}

export function PaymentReceiptEmail({
  workerName,
  businessName,
  jobTitle,
  paymentId,
  paymentDate,
  amount,
  paymentMethod,
  workPeriod,
  totalDays,
  dailyRate,
  deductions,
  bonuses,
  dashboardUrl,
}: PaymentReceiptProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value)

  const grossAmount = dailyRate * totalDays
  const totalDeductions = deductions?.reduce((sum, d) => sum + d.amount, 0) || 0
  const totalBonuses = bonuses?.reduce((sum, b) => sum + b.amount, 0) || 0

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.logo}>Daily Worker Hub</h1>
        <p style={styles.subtitle}>Bukti Pembayaran</p>
      </div>
      
      <div style={styles.content}>
        <div style={styles.successBanner}>
          <span style={styles.checkmark}>✓</span>
          <p style={styles.successText}>Pembayaran Berhasil!</p>
        </div>
        
        <p style={styles.greeting}>Halo {workerName},</p>
        
        <p style={styles.text}>
          Pembayaran dari <strong>{businessName}</strong> telah berhasil diproses.
          Berikut adalah rincian pembayaran Anda:
        </p>

        <div style={styles.receiptCard}>
          <div style={styles.receiptHeader}>
            <div>
              <p style={styles.receiptLabel}>ID Pembayaran</p>
              <p style={styles.receiptId}>#{paymentId.slice(0, 8).toUpperCase()}</p>
            </div>
            <div style={{ textAlign: "right" as const }}>
              <p style={styles.receiptLabel}>Tanggal</p>
              <p style={styles.receiptDate}>{paymentDate}</p>
            </div>
          </div>

          <div style={styles.section}>
            <p style={styles.sectionLabel}>Detail Pekerjaan</p>
            <div style={styles.row}>
              <span style={styles.rowLabel}>Posisi:</span>
              <span style={styles.rowValue}>{jobTitle}</span>
            </div>
            <div style={styles.row}>
              <span style={styles.rowLabel}>Periode Kerja:</span>
              <span style={styles.rowValue}>{workPeriod}</span>
            </div>
            <div style={styles.row}>
              <span style={styles.rowLabel}>Jumlah Hari:</span>
              <span style={styles.rowValue}>{totalDays} hari</span>
            </div>
          </div>

          <div style={styles.divider} />

          <div style={styles.section}>
            <p style={styles.sectionLabel}>Rincian Pembayaran</p>
            
            <div style={styles.row}>
              <span style={styles.rowLabel}>Upah per Hari:</span>
              <span style={styles.rowValue}>{formatCurrency(dailyRate)}</span>
            </div>
            
            <div style={styles.row}>
              <span style={styles.rowLabel}>Subtotal ({totalDays} hari):</span>
              <span style={styles.rowValue}>{formatCurrency(grossAmount)}</span>
            </div>

            {bonuses && bonuses.length > 0 && (
              <>
                <p style={styles.subLabel}>Bonus:</p>
                {bonuses.map((bonus, index) => (
                  <div key={index} style={styles.row}>
                    <span style={styles.rowLabel}>+ {bonus.description}:</span>
                    <span style={{ ...styles.rowValue, color: "#10b981" }}>
                      +{formatCurrency(bonus.amount)}
                    </span>
                  </div>
                ))}
              </>
            )}

            {deductions && deductions.length > 0 && (
              <>
                <p style={styles.subLabel}>Potongan:</p>
                {deductions.map((deduction, index) => (
                  <div key={index} style={styles.row}>
                    <span style={styles.rowLabel}>- {deduction.description}:</span>
                    <span style={{ ...styles.rowValue, color: "#ef4444" }}>
                      -{formatCurrency(deduction.amount)}
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>

          <div style={styles.totalSection}>
            <div style={styles.totalRow}>
              <span style={styles.totalLabel}>Total Diterima:</span>
              <span style={styles.totalValue}>{formatCurrency(amount)}</span>
            </div>
          </div>

          {paymentMethod && (
            <div style={styles.methodSection}>
              <p style={styles.methodLabel}>Metode Pembayaran:</p>
              <p style={styles.methodValue}>{paymentMethod}</p>
            </div>
          )}
        </div>

        <div style={styles.infoBox}>
          <p style={styles.infoTitle}>📋 Informasi Penting</p>
          <ul style={styles.infoList}>
            <li>Simpan email ini sebagai bukti pembayaran</li>
            <li>Pembayaran akan masuk dalam 1-3 hari kerja</li>
            <li>Hubungi support jika ada kendala</li>
          </ul>
        </div>

        <div style={styles.buttonContainer}>
          <a href={`${dashboardUrl}/payments/${paymentId}`} style={styles.button}>
            Lihat Riwayat Pembayaran
          </a>
        </div>
      </div>

      <div style={styles.footer}>
        <p style={styles.footerText}>
          Email ini dikirim oleh Daily Worker Hub.
        </p>
        <p style={styles.footerText}>
          © {new Date().getFullYear()} Daily Worker Hub. Hak cipta dilindungi.
        </p>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: "600px",
    margin: "0 auto",
    backgroundColor: "#ffffff",
    fontFamily: "'Segoe UI', 'Roboto', sans-serif",
  },
  header: {
    backgroundColor: "#2563eb",
    padding: "24px",
    textAlign: "center" as const,
  },
  logo: {
    color: "#ffffff",
    fontSize: "24px",
    fontWeight: "bold",
    margin: 0,
  },
  subtitle: {
    color: "#bfdbfe",
    fontSize: "14px",
    margin: "8px 0 0 0",
  },
  content: {
    padding: "32px 24px",
  },
  successBanner: {
    backgroundColor: "#ecfdf5",
    borderRadius: "12px",
    padding: "24px",
    textAlign: "center" as const,
    marginBottom: "24px",
  },
  checkmark: {
    display: "inline-block",
    width: "48px",
    height: "48px",
    lineHeight: "48px",
    backgroundColor: "#10b981",
    color: "#ffffff",
    borderRadius: "50%",
    fontSize: "24px",
    marginBottom: "12px",
  },
  successText: {
    fontSize: "20px",
    fontWeight: "bold",
    color: "#065f46",
    margin: 0,
  },
  greeting: {
    fontSize: "16px",
    color: "#374151",
    marginBottom: "16px",
  },
  text: {
    fontSize: "16px",
    color: "#374151",
    lineHeight: 1.6,
    marginBottom: "24px",
  },
  receiptCard: {
    backgroundColor: "#f9fafb",
    borderRadius: "12px",
    padding: "24px",
    marginBottom: "24px",
    border: "1px solid #e5e7eb",
  },
  receiptHeader: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "24px",
    paddingBottom: "16px",
    borderBottom: "2px dashed #d1d5db",
  },
  receiptLabel: {
    fontSize: "12px",
    color: "#6b7280",
    marginBottom: "4px",
  },
  receiptId: {
    fontSize: "18px",
    fontWeight: "bold",
    color: "#1f2937",
    margin: 0,
  },
  receiptDate: {
    fontSize: "16px",
    color: "#374151",
    margin: 0,
  },
  section: {
    marginBottom: "16px",
  },
  sectionLabel: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#374151",
    marginBottom: "12px",
  },
  subLabel: {
    fontSize: "13px",
    color: "#6b7280",
    marginTop: "8px",
    marginBottom: "4px",
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    padding: "8px 0",
  },
  rowLabel: {
    fontSize: "14px",
    color: "#6b7280",
  },
  rowValue: {
    fontSize: "14px",
    color: "#1f2937",
    fontWeight: "500",
  },
  divider: {
    height: "1px",
    backgroundColor: "#e5e7eb",
    margin: "16px 0",
  },
  totalSection: {
    backgroundColor: "#2563eb",
    margin: "0 -24px -24px -24px",
    padding: "24px",
    borderRadius: "0 0 12px 12px",
  },
  totalRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center" as const,
  },
  totalLabel: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#ffffff",
  },
  totalValue: {
    fontSize: "28px",
    fontWeight: "bold",
    color: "#ffffff",
  },
  methodSection: {
    marginTop: "16px",
    padding: "12px",
    backgroundColor: "#ffffff",
    borderRadius: "8px",
    border: "1px solid #e5e7eb",
  },
  methodLabel: {
    fontSize: "12px",
    color: "#6b7280",
    marginBottom: "4px",
  },
  methodValue: {
    fontSize: "14px",
    color: "#374151",
    fontWeight: "500",
    margin: 0,
  },
  infoBox: {
    backgroundColor: "#dbeafe",
    borderRadius: "8px",
    padding: "20px",
    marginBottom: "24px",
  },
  infoTitle: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#1e40af",
    marginBottom: "12px",
  },
  infoList: {
    fontSize: "14px",
    color: "#1e40af",
    margin: 0,
    paddingLeft: "20px",
    lineHeight: 1.8,
  },
  buttonContainer: {
    textAlign: "center" as const,
    margin: "32px 0",
  },
  button: {
    display: "inline-block",
    backgroundColor: "#2563eb",
    color: "#ffffff",
    padding: "14px 32px",
    borderRadius: "8px",
    textDecoration: "none",
    fontWeight: "600",
    fontSize: "16px",
  },
  footer: {
    backgroundColor: "#f9fafb",
    padding: "24px",
    textAlign: "center" as const,
    borderTop: "1px solid #e5e7eb",
  },
  footerText: {
    fontSize: "12px",
    color: "#9ca3af",
    margin: "4px 0",
  },
}

export default PaymentReceiptEmail
