import * as React from "react";
import HeaderGateClient from "./HeaderGate.client";

/**
 * Server Component sarmalayıcı.
 * Burada dynamic({ ssr:false }) KULLANMIYORUZ.
 * Server -> Client sınırı: HeaderGateClient içinde.
 */
export default function HeaderGate({ children }: { children: React.ReactNode }) {
  return <HeaderGateClient>{children}</HeaderGateClient>;
}
