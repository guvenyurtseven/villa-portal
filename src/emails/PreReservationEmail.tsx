import * as React from "react";

type Props = {
  villaId: string;
  villaName: string;
  startDate: string;
  endDate: string;
  name: string;
  email: string;
  phone?: string;
  adults?: number;
  children?: number;
  message?: string;
  adminUrl?: string;
  siteUrl?: string;
  buttonLabel?: string; // opsiyonel, "Takvimi Aç" gibi farklı metin için
};

export default function PreReservationEmail(props: Props) {
  const Row = ({ label, value }: { label: string; value?: React.ReactNode }) => (
    <tr>
      <td style={{ padding: "6px 10px", color: "#666" }}>{label}</td>
      <td style={{ padding: "6px 10px", fontWeight: 600, color: "#111" }}>{value ?? "-"}</td>
    </tr>
  );

  return (
    <div style={{ fontFamily: "ui-sans-serif,system-ui,Arial", color: "#111", lineHeight: 1.45 }}>
      <h2 style={{ margin: "0 0 12px", fontSize: 18 }}>Yeni Ön Rezervasyon Talebi</h2>
      <table
        cellPadding={0}
        cellSpacing={0}
        style={{ borderCollapse: "collapse", width: "100%", maxWidth: 640 }}
      >
        <tbody>
          <Row label="Villa" value={props.villaName} />
          <Row label="Tarih" value={`${props.startDate} → ${props.endDate}`} />
          <Row label="Misafir" value={props.name} />
          <Row label="E-posta" value={props.email} />
          <Row label="Telefon" value={props.phone} />
          <Row
            label="Yetişkin / Çocuk"
            value={`${props.adults ?? "-"} / ${props.children ?? "-"}`}
          />
          {props.message ? <Row label="Not" value={props.message} /> : null}
        </tbody>
      </table>

      <div style={{ marginTop: 16 }}>
        {props.adminUrl ? (
          <a
            href={props.adminUrl}
            style={{
              display: "inline-block",
              background: "#111",
              color: "#fff",
              padding: "10px 14px",
              borderRadius: 8,
              textDecoration: "none",
            }}
          >
            Bekleyen Rezervasyonları Görüntüle
          </a>
        ) : null}
        {props.siteUrl ? (
          <div style={{ marginTop: 10, fontSize: 12, color: "#666" }}>
            Kaynak: {props.siteUrl.replace(/^https?:\/\//, "")}
          </div>
        ) : null}
      </div>

      <hr style={{ margin: "18px 0", border: 0, borderTop: "1px solid #eee" }} />
      <div style={{ fontSize: 12, color: "#666" }}>
        Bu e-postaya “Yanıtla” ile dönüş yapabilirsiniz (reply-to: {props.email}).
      </div>
    </div>
  );
}
