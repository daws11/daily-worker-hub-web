import * as React from "react";

export interface JobReminderProps {
  workerName: string;
  jobTitle: string;
  businessName: string;
  startTime: string;
  endTime: string;
  location: string;
  locationUrl?: string;
  contactPerson?: string;
  contactPhone?: string;
  specialNotes?: string;
  dressCode?: string;
  items?: string[];
  bookingId: string;
  dashboardUrl: string;
}

export function JobReminderEmail({
  workerName,
  jobTitle,
  businessName,
  startTime,
  endTime,
  location,
  locationUrl,
  contactPerson,
  contactPhone,
  specialNotes,
  dressCode,
  items,
  bookingId,
  dashboardUrl,
}: JobReminderProps) {
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.logo}>Daily Worker Hub</h1>
      </div>

      <div style={styles.content}>
        <div style={styles.urgentBanner}>
          <span style={styles.clockIcon}>⏰</span>
          <h2 style={styles.urgentTitle}>Pengingat Pekerjaan Besok!</h2>
        </div>

        <p style={styles.greeting}>Halo {workerName},</p>

        <p style={styles.text}>
          Ini adalah pengingat bahwa Anda memiliki pekerjaan di{" "}
          <strong>{businessName}</strong> besok. Pastikan Anda siap dan hadir
          tepat waktu!
        </p>

        <div style={styles.jobCard}>
          <div style={styles.jobHeader}>
            <h3 style={styles.jobTitle}>{jobTitle}</h3>
            <span style={styles.badge}>Besok</span>
          </div>

          <div style={styles.infoGrid}>
            <div style={styles.infoItem}>
              <span style={styles.infoIcon}>🕐</span>
              <div>
                <p style={styles.infoLabel}>Waktu Kerja</p>
                <p style={styles.infoValue}>
                  {startTime} - {endTime}
                </p>
              </div>
            </div>

            <div style={styles.infoItem}>
              <span style={styles.infoIcon}>📍</span>
              <div>
                <p style={styles.infoLabel}>Lokasi</p>
                <p style={styles.infoValue}>{location}</p>
              </div>
            </div>

            {contactPerson && (
              <div style={styles.infoItem}>
                <span style={styles.infoIcon}>👤</span>
                <div>
                  <p style={styles.infoLabel}>Kontak Person</p>
                  <p style={styles.infoValue}>{contactPerson}</p>
                </div>
              </div>
            )}

            {contactPhone && (
              <div style={styles.infoItem}>
                <span style={styles.infoIcon}>📞</span>
                <div>
                  <p style={styles.infoLabel}>Nomor Telepon</p>
                  <p style={styles.infoValue}>{contactPhone}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {locationUrl && (
          <div style={styles.mapButton}>
            <a href={locationUrl} style={styles.mapLink}>
              🗺️ Buka di Google Maps
            </a>
          </div>
        )}

        {dressCode && (
          <div style={styles.checklistCard}>
            <h4 style={styles.checklistTitle}>👔 Kode Pakaian</h4>
            <p style={styles.checklistText}>{dressCode}</p>
          </div>
        )}

        {items && items.length > 0 && (
          <div style={styles.checklistCard}>
            <h4 style={styles.checklistTitle}>📋 Barang yang Harus Dibawa</h4>
            <ul style={styles.checklist}>
              {items.map((item, index) => (
                <li key={index} style={styles.checklistItem}>
                  <span style={styles.checkbox}>☐</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {specialNotes && (
          <div style={styles.notesCard}>
            <h4 style={styles.notesTitle}>📝 Catatan Khusus</h4>
            <p style={styles.notesText}>{specialNotes}</p>
          </div>
        )}

        <div style={styles.tipsCard}>
          <h4 style={styles.tipsTitle}>💡 Tips Persiapan</h4>
          <ul style={styles.tipsList}>
            <li>Siapkan pakaian dan perlengkapan malam ini</li>
            <li>Atur alarm minimal 2 jam sebelum waktu kerja</li>
            <li>Cek rute dan estimasi waktu perjalanan</li>
            <li>Pastikan HP terisi penuh</li>
            <li>Bawa KTP untuk registrasi</li>
          </ul>
        </div>

        <div style={styles.buttonContainer}>
          <a
            href={`${dashboardUrl}/bookings/${bookingId}`}
            style={styles.button}
          >
            Lihat Detail Booking
          </a>
        </div>

        <p style={styles.note}>
          Hormati waktu dan hadirlah minimal 15 menit sebelum jam kerja dimulai.
          Kehadiran tepat waktu akan meningkatkan rating Anda!
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
  );
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
  urgentBanner: {
    backgroundColor: "#fef3c7",
    borderRadius: "12px",
    padding: "24px",
    textAlign: "center" as const,
    marginBottom: "24px",
    border: "2px solid #f59e0b",
  },
  clockIcon: {
    fontSize: "32px",
  },
  urgentTitle: {
    fontSize: "20px",
    fontWeight: "bold",
    color: "#92400e",
    margin: "12px 0 0 0",
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
  jobCard: {
    backgroundColor: "#f9fafb",
    borderRadius: "12px",
    padding: "24px",
    marginBottom: "24px",
    border: "1px solid #e5e7eb",
  },
  jobHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center" as const,
    marginBottom: "20px",
    paddingBottom: "16px",
    borderBottom: "2px solid #2563eb",
  },
  jobTitle: {
    fontSize: "20px",
    fontWeight: "bold",
    color: "#1f2937",
    margin: 0,
  },
  badge: {
    backgroundColor: "#2563eb",
    color: "#ffffff",
    padding: "6px 12px",
    borderRadius: "16px",
    fontSize: "12px",
    fontWeight: "600",
  },
  infoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "16px",
  },
  infoItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
  },
  infoIcon: {
    fontSize: "20px",
    flexShrink: 0,
  },
  infoLabel: {
    fontSize: "12px",
    color: "#6b7280",
    marginBottom: "2px",
  },
  infoValue: {
    fontSize: "14px",
    color: "#1f2937",
    fontWeight: "500",
    margin: 0,
  },
  mapButton: {
    textAlign: "center" as const,
    marginBottom: "24px",
  },
  mapLink: {
    display: "inline-block",
    backgroundColor: "#10b981",
    color: "#ffffff",
    padding: "12px 24px",
    borderRadius: "8px",
    textDecoration: "none",
    fontWeight: "600",
    fontSize: "14px",
  },
  checklistCard: {
    backgroundColor: "#f0fdf4",
    borderRadius: "8px",
    padding: "20px",
    marginBottom: "16px",
    borderLeft: "4px solid #10b981",
  },
  checklistTitle: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#065f46",
    marginBottom: "12px",
  },
  checklistText: {
    fontSize: "14px",
    color: "#047857",
    margin: 0,
  },
  checklist: {
    listStyle: "none",
    padding: 0,
    margin: 0,
  },
  checklistItem: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "8px 0",
    fontSize: "14px",
    color: "#047857",
  },
  checkbox: {
    fontSize: "16px",
  },
  notesCard: {
    backgroundColor: "#fef3c7",
    borderRadius: "8px",
    padding: "20px",
    marginBottom: "16px",
    borderLeft: "4px solid #f59e0b",
  },
  notesTitle: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#92400e",
    marginBottom: "12px",
  },
  notesText: {
    fontSize: "14px",
    color: "#78350f",
    margin: 0,
    lineHeight: 1.6,
  },
  tipsCard: {
    backgroundColor: "#dbeafe",
    borderRadius: "8px",
    padding: "20px",
    marginBottom: "24px",
  },
  tipsTitle: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#1e40af",
    marginBottom: "12px",
  },
  tipsList: {
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
  note: {
    fontSize: "14px",
    color: "#6b7280",
    textAlign: "center" as const,
    backgroundColor: "#f9fafb",
    padding: "16px",
    borderRadius: "8px",
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
};

export default JobReminderEmail;
