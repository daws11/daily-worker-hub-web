import * as React from "react";

export interface ApplicationStatusUpdateProps {
  workerName: string;
  jobTitle: string;
  businessName: string;
  status: "accepted" | "rejected" | "pending" | "reviewing";
  statusMessage?: string;
  applicationId: string;
  nextSteps?: string;
  dashboardUrl: string;
}

const statusConfig = {
  accepted: {
    emoji: "🎉",
    title: "Selamat! Lamaran Anda Diterima!",
    color: "#10b981",
    bgColor: "#d1fae5",
  },
  rejected: {
    emoji: "😔",
    title: "Update Status Lamaran",
    color: "#ef4444",
    bgColor: "#fee2e2",
  },
  pending: {
    emoji: "⏳",
    title: "Lamaran Sedang Diproses",
    color: "#f59e0b",
    bgColor: "#fef3c7",
  },
  reviewing: {
    emoji: "👀",
    title: "Lamaran Sedang Ditinjau",
    color: "#3b82f6",
    bgColor: "#dbeafe",
  },
};

export function ApplicationStatusUpdateEmail({
  workerName,
  jobTitle,
  businessName,
  status,
  statusMessage,
  applicationId,
  nextSteps,
  dashboardUrl,
}: ApplicationStatusUpdateProps) {
  const config = statusConfig[status];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.logo}>Daily Worker Hub</h1>
      </div>

      <div style={styles.content}>
        <h2 style={styles.title}>
          {config.emoji} {config.title}
        </h2>

        <p style={styles.greeting}>Halo {workerName},</p>

        <p style={styles.text}>
          Ada update terbaru untuk lamaran Anda di{" "}
          <strong>{businessName}</strong> untuk posisi{" "}
          <strong>{jobTitle}</strong>.
        </p>

        <div style={{ ...styles.statusCard, backgroundColor: config.bgColor }}>
          <p style={{ ...styles.statusText, color: config.color }}>
            Status: {status.charAt(0).toUpperCase() + status.slice(1)}
          </p>
        </div>

        {statusMessage && (
          <div style={styles.messageCard}>
            <p style={styles.messageLabel}>Pesan dari {businessName}:</p>
            <p style={styles.messageText}>"{statusMessage}"</p>
          </div>
        )}

        {status === "accepted" && nextSteps && (
          <div style={styles.nextStepsCard}>
            <h3 style={styles.cardTitle}>Langkah Selanjutnya</h3>
            <p style={styles.text}>{nextSteps}</p>
          </div>
        )}

        {status === "rejected" && (
          <p style={styles.encouragement}>
            Jangan berkecil hati! Masih banyak peluang kerja lainnya yang
            menunggu Anda. Terus tingkatkan keahlian dan coba lamar pekerjaan
            lain yang sesuai.
          </p>
        )}

        <div style={styles.buttonContainer}>
          <a
            href={`${dashboardUrl}/applications/${applicationId}`}
            style={styles.button}
          >
            Lihat Detail Lamaran
          </a>
        </div>

        <p style={styles.note}>
          Anda menerima email ini karena telah melamar pekerjaan di Daily Worker
          Hub.
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
  statusCard: {
    padding: "16px 24px",
    borderRadius: "8px",
    marginBottom: "24px",
    textAlign: "center" as const,
  },
  statusText: {
    fontSize: "18px",
    fontWeight: "bold",
    margin: 0,
  },
  messageCard: {
    backgroundColor: "#f9fafb",
    borderRadius: "8px",
    padding: "20px",
    marginBottom: "24px",
    borderLeft: "4px solid #6b7280",
  },
  messageLabel: {
    fontSize: "14px",
    color: "#6b7280",
    marginBottom: "8px",
  },
  messageText: {
    fontSize: "16px",
    color: "#374151",
    fontStyle: "italic" as const,
    margin: 0,
  },
  nextStepsCard: {
    backgroundColor: "#ecfdf5",
    borderRadius: "8px",
    padding: "20px",
    marginBottom: "24px",
    borderLeft: "4px solid #10b981",
  },
  cardTitle: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#065f46",
    marginBottom: "12px",
  },
  encouragement: {
    fontSize: "14px",
    color: "#6b7280",
    backgroundColor: "#fef3c7",
    padding: "16px",
    borderRadius: "8px",
    marginBottom: "24px",
    borderLeft: "4px solid #f59e0b",
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
};

export default ApplicationStatusUpdateEmail;
