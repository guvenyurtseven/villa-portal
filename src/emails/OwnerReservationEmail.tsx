// src/emails/OwnerReservationEmail.tsx
import * as React from "react";
import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Heading,
  Text,
  Button,
  Hr,
  Section,
} from "@react-email/components";

export default function OwnerReservationEmail({
  villaName,
  guestName,
  guestPhone,
  guestEmail,
  checkinStr,
  checkoutStr,
  nights,
  totalPriceStr,
  depositStr,
  cleaningFeeStr,
  ctaUrl,
}: {
  villaName: string;
  guestName: string;
  guestPhone?: string;
  guestEmail?: string;
  checkinStr: string;
  checkoutStr: string;
  nights: number;
  totalPriceStr: string;
  depositStr?: string;
  cleaningFeeStr?: string;
  ctaUrl: string;
}) {
  return (
    <Html lang="tr">
      <Head />
      <Preview>Rezervasyon onaylandı — {villaName}</Preview>
      <Body style={{ backgroundColor: "#f7f7f7", fontFamily: "Arial, sans-serif" }}>
        <Container style={{ background: "#fff", padding: 24, margin: "24px auto", maxWidth: 560 }}>
          <Heading style={{ fontSize: 22, margin: "0 0 12px" }}>
            {villaName} için rezervasyon onaylandı
          </Heading>
          <Text>Merhaba, aşağıda rezervasyon özetini bulabilirsiniz:</Text>

          <Section style={{ fontSize: 14, lineHeight: "20px" }}>
            <Text>
              <b>Giriş:</b> {checkinStr}
            </Text>
            <Text>
              <b>Çıkış:</b> {checkoutStr}
            </Text>
            <Text>
              <b>Gece:</b> {nights}
            </Text>
            <Text>
              <b>Toplam:</b> {totalPriceStr}
            </Text>
            {cleaningFeeStr && (
              <Text>
                <b>Temizlik Ücreti:</b> {cleaningFeeStr}
              </Text>
            )}
            {depositStr && (
              <Text>
                <b>Hasar Depozitosu:</b> {depositStr}
              </Text>
            )}
          </Section>

          <Hr />
          <Section style={{ fontSize: 14 }}>
            <Text>
              <b>Misafir:</b> {guestName}
            </Text>
            {guestPhone && (
              <Text>
                <b>Telefon:</b> {guestPhone}
              </Text>
            )}
            {guestEmail && (
              <Text>
                <b>E-posta:</b> {guestEmail}
              </Text>
            )}
          </Section>

          <Hr />
          <Section style={{ textAlign: "center" }}>
            <Button
              href={ctaUrl}
              style={{
                background: "#ef6c00",
                color: "#fff",
                padding: "12px 20px",
                borderRadius: 6,
                textDecoration: "none",
              }}
            >
              Rezervasyon Detayları
            </Button>
          </Section>

          <Text style={{ color: "#999", fontSize: 12 }}>
            Bu bağlantı sınırlı süre için geçerlidir.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
