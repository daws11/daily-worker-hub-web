import * as React from "react"

interface BookingConfirmedProps {
  recipientName: string
  recipientType: "worker" | "business"
  jobTitle: string
  workerName: string
  businessName: string
  startDate: string
  endDate?: string
  location: string
  dailyWage: number
  totalDays?: number
  bookingId: string
  specialInstructions?: string
  dashboardUrl: string
}

export function BookingConfirmedEmail({
  recipientName,
  recipientType,
  jobTitle,
  workerName,
  businessName,
  startDate,
  endDate,
  location,
  dailyWage,
  totalDays,
  bookingId,
  specialInstructions,
  dashboardUrl,
}: BookingConfirmedProps) {
  const isWorker = recipientType === "worker"
  const formattedWage = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(dailyWage)

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.logo}>Daily Worker Hub</h1>
      </div>
      
      <div style={styles.content}>
        <h2 style={styles.title}>🎉 Booking Dikonfirmasi!</h2>
        
        <p style={styles.greeting}>Halo {recipientName},</p>
        
        <p style={styles.text}>
          {isWorker
            ? `Selamat! Booking Anda dengan ${businessName} telah dikonfirmasi.`
            : `Booking dengan ${workerName} telah dikonfirmasi.`}
        </p>

        <div style={styles.bookingCard}>
          <h3 style={styles.cardTitle}>Detail Booking</h3>
          
          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Posisi:</span>
            <span style={styles.detailValue}>{jobTitle}</span>
          </div>
          
          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>
              {isWorker ? "Mitra:" : "Pekerja:"}
            </span>
            <span style={styles.detailValue}>
              {isWorker ? businessName : workerName}
            </span>
          </div>
          
          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Tanggal Mulai:</span>
            <span style={styles.detailValue}>{startDate}</span>
          </div>
          
          {endDate && (
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Tanggal Selesai:</span>
              <span style={styles.detailValue}>{endDate}</span>
            </div>
          )}
          
          {totalDays && (
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Total Hari:</span>
              <span style={styles.detailValue}>{totalDays} hari</span>
            </div>
          )}
          
          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Lokasi:</span>
            <span style={styles.detailValue}>{location}</span>
          </div>
          
          <div style={styles.divider} />
          
          <div style={styles.wageRow}>
            <span style={styles.wageLabel}>Upah per Hari:</span>
            <span style={styles.wageValue}>{formattedWage}</span>
          </div>
        </div>

        {specialInstructions && (
          <div style={styles.instructionsCard}>
            <h4 style={styles.instructionsTitle}>📝 Instruksi Khusus</h4>
            <p style={styles.instructionsText}>{specialInstructions}</p>
          </div>
        )}

        <div style={styles.tipsCard}>
          <h4 style={styles.tipsTitle}>💡 Tips untuk Hari Kerja</h4>
          <ul style={styles.tipsList}>
            <li>Hadir 15 menit sebelum jam kerja dimulai</li>
            <li>Bawa identitas diri (KTP/SIM)</li>
            <li>Kenakan pakaian kerja yang sesuai</li>
            <li>Hubungi mitra jika ada kendala</li>
          </ul>
        </div>

        <div style={styles.buttonContainer}>
          <a href={`${dashboardUrl}/bookings/${bookingId}`} style={styles.button}>
            Lihat Detail Booking
          </a>
        </div>

        <p style={styles.note}>
          Simpan informasi booking ini dengan baik. Jika ada pertanyaan atau perubahan,
          silakan hubungi pihak terkait melalui aplikasi.
        </p>
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
  content: {
    padding: "32px 24px",
  },
  title: {
    fontSize: "24px",
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: "16px",
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
    marginBottom: "16px",
  },
  bookingCard: {
    backgroundColor: "#f9fafb",
    borderRadius: "12px",
    padding: "24px",
    marginBottom: "24px",
    border: "1px solid #e5e7eb",
  },
  cardTitle: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: "20px",
    paddingBottom: "12px",
    borderBottom: "2px solid #2563eb",
  },
  detailRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "12px 0",
    borderBottom: "1px solid #e5e7eb",
  },
  detailLabel: {
    fontSize: "14px",
    color: "#6b7280",
  },
  detailValue: {
    fontSize: "14px",
    color: "#1f2937",
    fontWeight: "500",
  },
  divider: {
    height: "16px",
  },
  wageRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "16px 0 0 0",
  },
  wageLabel: {
    fontSize: "16px",
    color: "#374151",
    fontWeight: "500",
  },
  wageValue: {
    fontSize: "20px",
    color: "#10b981",
    fontWeight: "bold",
  },
  instructionsCard: {
    backgroundColor: "#fef3c7",
    borderRadius: "8px",
    padding: "20px",
    marginBottom: "24px",
    borderLeft: "4px solid #f59e0b",
  },
  instructionsTitle: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#92400e",
    marginBottom: "12px",
  },
  instructionsText: {
    fontSize: "14px",
    color: "#78350f",
    margin: 0,
    lineHeight: 1.6,
  },
  tipsCard: {
    backgroundColor: "#ecfdf5",
    borderRadius: "8px",
    padding: "20px",
    marginBottom: "24px",
  },
  tipsTitle: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#065f46",
    marginBottom: "12px",
  },
  tipsList: {
    fontSize: "14px",
    color: "#047857",
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
  note: {
    fontSize: "14px",
    color: "#6b7280",
    textAlign: "center" as const,
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

export default BookingConfirmedEmail
