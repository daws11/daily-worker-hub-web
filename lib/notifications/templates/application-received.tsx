import * as React from "react"

interface ApplicationReceivedProps {
  businessName: string
  workerName: string
  jobTitle: string
  applicationId: string
  workerSkills?: string[]
  workerExperience?: string
  applicationDate: string
  dashboardUrl: string
}

export function ApplicationReceivedEmail({
  businessName,
  workerName,
  jobTitle,
  applicationId,
  workerSkills,
  workerExperience,
  applicationDate,
  dashboardUrl,
}: ApplicationReceivedProps) {
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.logo}>Daily Worker Hub</h1>
      </div>
      
      <div style={styles.content}>
        <h2 style={styles.title}>Lamaran Baru Diterima! 🎉</h2>
        
        <p style={styles.greeting}>Halo {businessName},</p>
        
        <p style={styles.text}>
          Anda menerima lamaran baru untuk posisi <strong>{jobTitle}</strong>.
        </p>

        <div style={styles.infoCard}>
          <h3 style={styles.cardTitle}>Detail Pelamar</h3>
          <table style={styles.table}>
            <tbody>
              <tr>
                <td style={styles.label}>Nama:</td>
                <td style={styles.value}>{workerName}</td>
              </tr>
              <tr>
                <td style={styles.label}>Tanggal Lamar:</td>
                <td style={styles.value}>{applicationDate}</td>
              </tr>
              <tr>
                <td style={styles.label}>ID Lamaran:</td>
                <td style={styles.value}>#{applicationId.slice(0, 8)}</td>
              </tr>
            </tbody>
          </table>
          
          {workerSkills && workerSkills.length > 0 && (
            <div style={styles.section}>
              <p style={styles.label}>Keahlian:</p>
              <div style={styles.skills}>
                {workerSkills.map((skill, index) => (
                  <span key={index} style={styles.skill}>{skill}</span>
                ))}
              </div>
            </div>
          )}

          {workerExperience && (
            <div style={styles.section}>
              <p style={styles.label}>Pengalaman:</p>
              <p style={styles.text}>{workerExperience}</p>
            </div>
          )}
        </div>

        <div style={styles.buttonContainer}>
          <a href={`${dashboardUrl}/applications/${applicationId}`} style={styles.button}>
            Lihat Lamaran
          </a>
        </div>

        <p style={styles.note}>
          Segera tinjau lamaran ini dan berikan respons kepada pelamar.
          Respons cepat akan meningkatkan reputasi bisnis Anda.
        </p>
      </div>

      <div style={styles.footer}>
        <p style={styles.footerText}>
          Email ini dikirim oleh Daily Worker Hub karena Anda menerima lamaran baru.
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
  infoCard: {
    backgroundColor: "#f9fafb",
    borderRadius: "8px",
    padding: "24px",
    marginBottom: "24px",
  },
  cardTitle: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: "16px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
  },
  label: {
    fontSize: "14px",
    color: "#6b7280",
    paddingRight: "16px",
    paddingBottom: "8px",
    width: "40%",
  },
  value: {
    fontSize: "14px",
    color: "#1f2937",
    fontWeight: "500",
    paddingBottom: "8px",
  },
  section: {
    marginTop: "16px",
  },
  skills: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "8px",
    marginTop: "8px",
  },
  skill: {
    display: "inline-block",
    backgroundColor: "#dbeafe",
    color: "#1d4ed8",
    padding: "4px 12px",
    borderRadius: "16px",
    fontSize: "13px",
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
    backgroundColor: "#fef3c7",
    padding: "16px",
    borderRadius: "8px",
    borderLeft: "4px solid #f59e0b",
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

export default ApplicationReceivedEmail
