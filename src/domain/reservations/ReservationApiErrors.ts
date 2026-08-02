type DbErrorLike = {
  code?: string;
  message?: string;
};

export function reservationRpcErrorStatus(error: DbErrorLike | null | undefined) {
  switch (error?.code) {
    case "P0002":
      return 404;
    case "23P01":
    case "23514":
      return 409;
    case "P0001":
    case "22007":
    case "22023":
      return 400;
    default:
      return 500;
  }
}

export function reservationRpcErrorMessage(error: DbErrorLike | null | undefined) {
  if (!error?.message) return "Rezervasyon islemi tamamlanamadi";

  if (error.message.includes("No pricing defined")) {
    return "Bu tarihler icin fiyat tanimlanmamistir";
  }

  if (error.message.includes("Overlaps with")) {
    return "Secilen tarih araligi baska bir rezervasyon veya blokaj ile cakismaktadir";
  }

  if (error.message.includes("Invalid reservation date range")) {
    return "Gecersiz tarih araligi";
  }

  return error.message;
}
